#!/usr/bin/env python3
"""
Run local dependency vulnerability checks for ElysiaAI.

The Rust check queries OSV for the active Cargo target tree. A small allowlist is
kept for current Tauri/urlpattern transitive advisories that cannot be fixed in
this repository without an upstream Tauri update.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib import request


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).resolve().parents[2]
TAURI_DIR = REPO_ROOT / "src-tauri"
OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"

RUST_ADVISORY_ALLOWLIST = {
    "RUSTSEC-2025-0075": "Tauri 2.11.0 -> tauri-utils 2.9.0 -> urlpattern 0.3.0 -> unic-*",
    "RUSTSEC-2025-0080": "Tauri 2.11.0 -> tauri-utils 2.9.0 -> urlpattern 0.3.0 -> unic-*",
    "RUSTSEC-2025-0081": "Tauri 2.11.0 -> tauri-utils 2.9.0 -> urlpattern 0.3.0 -> unic-*",
    "RUSTSEC-2025-0098": "Tauri 2.11.0 -> tauri-utils 2.9.0 -> urlpattern 0.3.0 -> unic-*",
    "RUSTSEC-2025-0100": "Tauri 2.11.0 -> tauri-utils 2.9.0 -> urlpattern 0.3.0 -> unic-*",
}

PYTHON_ADVISORY_ALLOWLIST = {
    "PYSEC-2022-252": "deep-translator 1.11.4 is the latest release; Marathon translator is optional/manual.",
}


def run_command(command: list[str], cwd: Path = REPO_ROOT) -> subprocess.CompletedProcess[str]:
    print(f"$ {' '.join(command)}")
    return subprocess.run(
        command,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        encoding="utf-8",
        errors="replace",
    )


def print_output(result: subprocess.CompletedProcess[str]) -> None:
    output = result.stdout.strip()
    if output:
        print(output)


def audit_bun() -> bool:
    result = run_command(["bun", "audit"])
    print_output(result)
    return result.returncode == 0


def pip_audit_command() -> list[str]:
    exe_name = "pip-audit.exe" if os.name == "nt" else "pip-audit"
    local_exe = REPO_ROOT / ".venv" / ("Scripts" if os.name == "nt" else "bin") / exe_name
    if local_exe.exists():
        return [str(local_exe), "--local"]
    return [sys.executable, "-m", "pip_audit", "--local"]


def audit_python() -> bool:
    command = pip_audit_command()
    for vuln_id in PYTHON_ADVISORY_ALLOWLIST:
        command.extend(["--ignore-vuln", vuln_id])
    result = run_command(command)
    print_output(result)
    if PYTHON_ADVISORY_ALLOWLIST:
        print("Allowed Python advisories:")
        for vuln_id, reason in PYTHON_ADVISORY_ALLOWLIST.items():
            print(f"  - {vuln_id}: {reason}")
    return result.returncode == 0


def active_rust_crates() -> dict[str, str]:
    result = run_command(["cargo", "tree", "--prefix", "none"], cwd=TAURI_DIR)
    if result.returncode != 0:
        print_output(result)
        raise RuntimeError("cargo tree failed")

    crates: dict[str, str] = {}
    pattern = re.compile(r"^([A-Za-z0-9_.+-]+) v([0-9][^\s]*)")
    for line in result.stdout.splitlines():
        match = pattern.match(line.strip())
        if match:
            crates[match.group(1)] = match.group(2)
    return crates


def query_osv(queries: list[dict[str, object]]) -> list[tuple[str, str, str, str]]:
    vulnerabilities: list[tuple[str, str, str, str]] = []
    for index in range(0, len(queries), 100):
        chunk = queries[index : index + 100]
        body = json.dumps({"queries": chunk}).encode()
        req = request.Request(
            OSV_BATCH_URL,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=30) as response:
            payload = json.loads(response.read().decode())

        for query, item in zip(chunk, payload.get("results", []), strict=False):
            package = query["package"]
            assert isinstance(package, dict)
            package_name = str(package["name"])
            version = str(query["version"])
            for vuln in item.get("vulns", []) or []:
                vulnerabilities.append(
                    (
                        package_name,
                        version,
                        str(vuln.get("id", "")),
                        str(vuln.get("summary", "")),
                    )
                )
        time.sleep(0.2)
    return vulnerabilities


def audit_rust() -> bool:
    crates = active_rust_crates()
    queries = [
        {
            "package": {"ecosystem": "crates.io", "name": name},
            "version": version,
        }
        for name, version in sorted(crates.items())
    ]
    vulnerabilities = query_osv(queries)
    unallowed = [vuln for vuln in vulnerabilities if vuln[2] not in RUST_ADVISORY_ALLOWLIST]
    allowed = [vuln for vuln in vulnerabilities if vuln[2] in RUST_ADVISORY_ALLOWLIST]

    if allowed:
        print("Allowed Rust advisories:")
        for name, version, vuln_id, summary in allowed:
            reason = RUST_ADVISORY_ALLOWLIST[vuln_id]
            print(f"  - {name} {version}: {vuln_id} {summary} ({reason})")

    if unallowed:
        print("Unallowed Rust vulnerabilities:")
        for name, version, vuln_id, summary in unallowed:
            print(f"  - {name} {version}: {vuln_id} {summary}")
        return False

    print(f"No unallowed Rust vulnerabilities found ({len(crates)} active crates)")
    return True


def main() -> int:
    checks = [
        ("Bun audit", audit_bun),
        ("Python pip-audit", audit_python),
        ("Rust OSV audit", audit_rust),
    ]
    failed: list[str] = []

    for name, check in checks:
        print(f"\n== {name} ==")
        try:
            if not check():
                failed.append(name)
        except Exception as exc:  # noqa: BLE001 - audit runner should report all failures.
            print(f"{name} failed: {exc}")
            failed.append(name)

    if failed:
        print("\nDependency audit failed:")
        for name in failed:
            print(f"  - {name}")
        return 1

    print("\nDependency audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
