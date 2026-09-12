#!/usr/bin/env python3
"""Build and test the M1/M2a/M2b/M2c kernel in a bounded, headless QEMU process."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_RUST = "1.96.0"
EXPECTED_QEMU = "11.1.0 (v11.1.0-12130-ge470268ff4)"
MACHINE = "pc-q35-11.1"
CASES = {
    "normal": (33, ["kernel:ready"]),
    "bad-boot-info": (35, ["kernel:boot-info-rejected:header"]),
    "invalid-opcode": (37, ["kernel:injecting-invalid-opcode", "kernel:fault:invalid-opcode"]),
    "stale-map-key": (33, ["kernel:ready"]),
    "unmapped-page": (39, ["kernel:injecting-unmapped", "kernel:fault:unmapped"]),
    "readonly-page": (41, ["kernel:injecting-readonly", "kernel:fault:readonly"]),
    "noexecute-page": (43, ["kernel:injecting-noexecute", "kernel:fault:noexecute"]),
}
USER_CASES = {
    "user-cooperate": (7, None),
    "user-kernel": (8, "vector=14 error=0x5 address=0x2000000"),
    "user-peer": (9, "vector=14 error=0x4 address=0x70002000"),
    "user-readonly": (10, "vector=14 error=0x7 address=0x40000000"),
    "user-noexecute": (11, "vector=14 error=0x15 address=0x60000000"),
    "user-invalid-opcode": (12, "vector=6 error=0x0 address=0x0"),
    "user-io": (13, "vector=13 error=0x0 address=0x0"),
    "user-bad-stack": (14, "vector=14 error=0x6 address=0x8ffffff8"),
    "user-gate": (15, "vector=13 error=0x202 address=0x0"),
    "user-fpu": (16, "vector=7 error=0x0 address=0x0"),
    "user-bad-return": (17, "vector=128 error=0x0 address=0x1000000000000"),
}
for name, (mode, fault) in USER_CASES.items():
    CASES[name] = (45, [
        "kernel:user-enter pid=0 cpl=3",
        "kernel:user-trap pid=0 vector=128 cpl=3",
        "kernel:syscall-rejected pid=0 reason=number",
        "kernel:syscall-rejected pid=0 reason=range",
        "user:log pid=0 hex=41", "kernel:user-yield pid=0",
        "kernel:user-switch from=0 to=1",
        "kernel:user-trap pid=1 vector=128 cpl=3",
        "user:log pid=1 hex=42", "kernel:user-yield pid=1",
        "kernel:user-switch from=1 to=0", "user:log pid=0 hex=61",
        f"kernel:user-stopped pid=0 {fault}" if fault else "kernel:user-exit pid=0 status=0",
        "kernel:user-switch from=0 to=1", "user:log pid=1 hex=62",
        "kernel:user-exit pid=1 status=0", f"kernel:user-tests-passed mode={mode}",
    ])
LIFECYCLE_CASES = {"user-preempt": 18, "user-recycle": 19, "user-yield-spin": 20}
for name, mode in LIFECYCLE_CASES.items():
    CASES[name] = (47, ["kernel:allocation-rollback", "kernel:user-spaces-ready",
                       "kernel:user-enter pid=0 cpl=3",
                       f"kernel:lifecycle-tests-passed mode={mode}"])
IPC_CASES = {"ipc-echo": 21, "ipc-peer-exit": 22, "ipc-peer-fault": 23,
             "ipc-revoke": 24, "ipc-deadlock": 25, "ipc-queue": 26}
for name, mode in IPC_CASES.items():
    CASES[name] = (49, ["kernel:allocation-rollback", "kernel:user-spaces-ready",
                       "kernel:timer-ready", "kernel:user-enter pid=0 cpl=3",
                       "user:log pid=0 hex=6f6b", "kernel:ipc-clean",
                       f"kernel:ipc-tests-passed mode={mode}"])
PREFIX = ["loader:entered", "loader:kernel-loaded", "loader:boot-services-exited",
          "kernel:entered", "kernel:exceptions-ready"]
MEMORY_PREFIX = ["kernel:boot-info-valid", "kernel:frames-verified",
                 "kernel:paging-active", "kernel:mapped-memory-verified"]
FAULT_CASES = set(CASES) - {"normal", "stale-map-key"}


def execute(args: list[str], *, env: dict[str, str] | None = None,
            timeout: float = 180) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args, cwd=ROOT, env=env, check=False, text=True, encoding="utf-8",
        errors="replace", stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )


def checked(args: list[str], *, env: dict[str, str] | None = None) -> str:
    result = execute(args, env=env)
    if result.returncode:
        raise RuntimeError(f"{args[0]} failed ({result.returncode}):\n{result.stdout}")
    return result.stdout


def sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def verify_output(case: str, code: int, output: str) -> list[str]:
    """Require both the exact exit code and ordered evidence from each side of the handoff."""
    expected_code, markers = CASES[case]
    errors = []
    if code != expected_code:
        errors.append(f"exit code {code}, expected {expected_code}")
    sequence = list(PREFIX)
    if case == "stale-map-key":
        sequence[2:2] = ["loader:map-key-rejected", "loader:exit-attempt=1"]
    if case != "bad-boot-info":
        sequence += MEMORY_PREFIX
    sequence += markers
    position = 0
    for marker in sequence:
        found = output.find(marker, position)
        if found < 0:
            errors.append(f"missing or out-of-order marker: {marker}")
            break
        position = found + len(marker)
    if "failure:" in output or "panic" in output or "kernel:fault:unexpected" in output:
        errors.append("unexpected failure diagnostic")
    if case in FAULT_CASES and "kernel:ready" in output:
        errors.append("fault case reached normal completion")
    if case == "bad-boot-info" and "kernel:boot-info-valid" in output:
        errors.append("corrupted boot info was accepted")
    if case == "invalid-opcode" and "kernel:boot-info-valid" not in output:
        errors.append("exception did not follow a validated handoff")
    if case in USER_CASES:
        roots = re.search(r"kernel:user-spaces-ready roots=(0x[0-9a-f]+),(0x[0-9a-f]+)", output)
        if not roots or int(roots[1], 16) == int(roots[2], 16):
            errors.append("missing distinct process roots")
        for pid in (0, 1):
            for reason, count in (("range", 8), ("number", 1), ("status", 1)):
                marker = f"kernel:syscall-rejected pid={pid} reason={reason}"
                if output.splitlines().count(marker) != count:
                    errors.append(f"incorrect rejection count: {marker}")
            stopped = re.search(rf"kernel:user-(?:stopped|exit) pid={pid} ", output)
            if stopped:
                later = output[output.find("\n", stopped.start()) + 1:]
                if re.search(rf"(?:kernel:user-trap pid={pid} |user:log pid={pid} |kernel:user-switch from=\d+ to={pid}(?:\r?\n|$))", later):
                    errors.append(f"stopped process {pid} resumed")
    if case in LIFECYCLE_CASES:
        errors.extend(verify_lifecycle(case, output))
    if case in IPC_CASES:
        errors.extend(verify_ipc(case, output))
    return errors


def verify_lifecycle(case: str, output: str) -> list[str]:
    errors = []
    lines = output.splitlines()
    rollback = re.search(r"kernel:allocation-rollback boundaries=(\d+) free=(\d+)", output)
    generations = re.findall(r"kernel:generation-reclaimed generation=(\d+) free=(\d+)", output)
    count = 64 if case == "user-recycle" else 1
    if not rollback or int(rollback[1]) < 8:
        errors.append("missing partial-construction rollback evidence")
    if ([int(g) for g, _ in generations] != list(range(count)) or not rollback
            or any(free != rollback[2] for _, free in generations)):
        errors.append("missing generations or leaked frames")
    roots = re.findall(r"kernel:user-spaces-ready roots=(0x[0-9a-f]+),(0x[0-9a-f]+)", output)
    if len(roots) != count or any(a == b for a, b in roots):
        errors.append("missing distinct roots for every generation")
    if count > 1 and len(set(roots)) == count:
        errors.append("no observed root-frame reuse")
    for pid in (0, 1):
        if lines.count(f"kernel:reaped pid={pid}") != count:
            errors.append(f"incorrect reclamation count for process {pid}")
    if case == "user-recycle":
        for marker in ("kernel:user-exit pid=0 status=0",
                       "kernel:user-stopped pid=1 vector=6 error=0x0 address=0x0"):
            if lines.count(marker) != count:
                errors.append("missing exit/fault in a recycling generation")
    else:
        for marker in ("kernel:timer-ready source=pit irq=0 hz=100",
                       "user:log pid=1 hex=50", "user:log pid=1 hex=51",
                       "kernel:user-exit pid=1 status=0",
                       "kernel:budget-stopped pid=0 ticks=8"):
            if lines.count(marker) != 1:
                errors.append(f"missing or repeated lifecycle evidence: {marker}")
        for pid in (0, 1):
            ticks = [int(t) for t in re.findall(rf"kernel:preempt pid={pid} ticks=(\d+)", output)]
            if not ticks or ticks != list(range(1, len(ticks) + 1)) or (pid == 0 and len(ticks) != 8):
                errors.append(f"invalid cumulative timer accounting for process {pid}")
            marker = "kernel:budget-stopped pid=0" if pid == 0 else "kernel:user-exit pid=1"
            stopped = output.find(marker)
            if stopped >= 0:
                later = output[output.find("\n", stopped) + 1:]
                if re.search(rf"(?:kernel:(?:preempt|user-trap) pid={pid} |user:log pid={pid} |kernel:user-switch from=\d+ to={pid}(?:\r?\n|$))", later):
                    errors.append(f"stopped process {pid} resumed")
        if case == "user-preempt" and "kernel:user-yield pid=0" in output:
            errors.append("CPU hog yielded instead of requiring preemption")
        if case == "user-yield-spin" and "kernel:user-yield pid=0" not in output:
            errors.append("yield-spin fixture never yielded")
        if output.find("user:log pid=1 hex=50") >= output.find("user:log pid=1 hex=51"):
            errors.append("survivor progress reversed")
    return errors



def verify_ipc(case: str, output: str) -> list[str]:
    errors = []
    lines = output.splitlines()
    baseline = re.search(r"kernel:allocation-rollback boundaries=(\d+) free=(\d+)", output)
    clean = re.search(r"kernel:ipc-clean free=(\d+)", output)
    if not baseline or not clean or baseline[2] != clean[1]:
        errors.append("IPC memory did not return to baseline")
    blocked = set()
    stopped = set()
    for line in lines:
        event = re.fullmatch(r"kernel:ipc-block pid=(\d+)", line)
        if event:
            pid = int(event[1])
            if pid in blocked or pid in stopped:
                errors.append("invalid receive block state")
            blocked.add(pid)
        event = re.fullmatch(r"kernel:ipc-wake pid=(\d+) result=(-?\d+)", line)
        if event:
            pid = int(event[1])
            if pid not in blocked or pid in stopped:
                errors.append("wake without live blocked receiver")
            blocked.discard(pid)
        event = re.match(r"kernel:user-(?:exit|stopped) pid=(\d+) ", line)
        if event:
            pid = int(event[1])
            if pid in blocked or pid in stopped:
                errors.append("blocked or already stopped process exited")
            stopped.add(pid)
        event = re.match(r"kernel:(?:user-trap|preempt) pid=(\d+) ", line)
        if event and int(event[1]) in blocked | stopped:
            errors.append("blocked/stopped process ran")
        event = re.fullmatch(r"kernel:user-switch from=\d+ to=(\d+)", line)
        if event and int(event[1]) in blocked | stopped:
            errors.append("scheduler selected a blocked/stopped process")
    if blocked or stopped != {0, 1}:
        errors.append("IPC processes or waiters remain")
    for pid in (0, 1):
        if lines.count(f"kernel:reaped pid={pid}") != 1:
            errors.append("missing process reclamation")
    required = {
        "ipc-echo": ["kernel:ipc-result pid=0 op=3 result=-9",
                     "kernel:ipc-result pid=0 op=3 result=-13",
                     "kernel:ipc-result pid=0 op=3 result=-90",
                     "kernel:ipc-result pid=0 op=4 result=-14",
                     "kernel:ipc-result pid=1 op=4 result=-90"],
        "ipc-peer-exit": ["kernel:user-exit pid=1 status=0", "kernel:ipc-wake pid=0 result=-32"],
        "ipc-peer-fault": ["kernel:user-stopped pid=1 vector=6 error=0x0 address=0x0", "kernel:ipc-wake pid=0 result=-32"],
        "ipc-revoke": ["kernel:ipc-result pid=1 op=5 result=0", "kernel:ipc-wake pid=0 result=-32",
                       "kernel:ipc-result pid=0 op=3 result=-9", "kernel:ipc-result pid=0 op=4 result=-9"],
        "ipc-deadlock": ["kernel:ipc-result pid=1 op=4 result=-35", "kernel:ipc-wake pid=0 result=2"],
        "ipc-queue": ["kernel:ipc-result pid=0 op=3 result=-11"],
    }
    for marker in required[case]:
        if marker not in lines:
            errors.append(f"missing IPC evidence: {marker}")
    if case == "ipc-echo":
        if lines.count("kernel:ipc-result pid=0 op=3 result=-9") != 2:
            errors.append("missing forged or foreign handle rejection")
        for pid in (0, 1):
            if lines.count(f"kernel:ipc-result pid={pid} op=3 result=2") != 2:
                errors.append("missing request/reply sends")
    return errors


def qemu_path(path: Path) -> str:
    # Commas delimit QEMU suboptions; doubling preserves a literal comma.
    return path.resolve().as_posix().replace(",", ",,")


def source_digest() -> str:
    digest = hashlib.sha256()
    for path in sorted(ROOT.rglob("*")):
        relative = path.relative_to(ROOT)
        if any(part in ("target", "out", "__pycache__") for part in relative.parts):
            continue
        if path.is_file():
            digest.update(relative.as_posix().encode())
            digest.update(b"\0")
            digest.update(path.read_bytes())
    return digest.hexdigest()


def run(args: argparse.Namespace) -> int:
    qemu = args.qemu.resolve()
    firmware = args.firmware_dir.resolve()
    code = firmware / "edk2-x86_64-code.fd"
    variables = firmware / "edk2-i386-vars.fd"
    for path in (qemu, code, variables):
        if not path.is_file():
            raise RuntimeError(f"Required tool/firmware missing: {path}")
    rust = checked(["rustc", "+stable", "--version"]).strip()
    if rust.split()[1] != EXPECTED_RUST:
        raise RuntimeError(f"Expected Rust {EXPECTED_RUST}; found {rust}; no toolchain was changed")
    qemu_version = checked([str(qemu), "--version"]).splitlines()[0]
    if qemu_version != f"QEMU emulator version {EXPECTED_QEMU}":
        raise RuntimeError(f"Expected QEMU {EXPECTED_QEMU}; found {qemu_version}")
    out = ROOT / "out"
    out.mkdir(exist_ok=True)
    kernel = ROOT / "target/x86_64-unknown-none/release/elysia-kernel"
    print("Building kernel", flush=True)
    print(checked([
        "cargo", "+stable", "rustc", "--locked", "-p", "elysia-kernel", "--bin", "elysia-kernel",
        "--target", "x86_64-unknown-none", "--release", "--",
        "-C", "relocation-model=static",
        "-C", f"link-arg=-T{ROOT / 'kernel/linker.ld'}", "-C", "link-arg=--build-id=none",
    ]), end="", flush=True)
    results = []
    selected = list(CASES) if args.case == "all" else [args.case]
    for case in selected:
        print(f"Testing {case}", flush=True)
        environment = os.environ.copy()
        environment.update(ELYSIA_KERNEL_PATH=str(kernel), ELYSIA_BOOT_MODE=case)
        print(checked([
            "cargo", "+stable", "build", "--locked", "-p", "elysia-bootloader",
            "--bin", "elysia-bootloader", "--target", "x86_64-unknown-uefi", "--release",
        ], env=environment), end="", flush=True)
        case_dir = out / case
        esp = case_dir / "esp"
        boot = esp / "EFI/BOOT"
        boot.mkdir(parents=True, exist_ok=True)
        loader = boot / "BOOTX64.EFI"
        shutil.copyfile(ROOT / "target/x86_64-unknown-uefi/release/elysia-bootloader.efi", loader)
        mutable_vars = case_dir / "vars.fd"
        shutil.copyfile(variables, mutable_vars)
        command = [
            str(qemu), "-machine", MACHINE, "-accel", "tcg", "-cpu", "qemu64",
            "-smp", "1", "-m", "256M", "-nodefaults", "-no-user-config",
            "-display", "none", "-monitor", "none", "-serial", "stdio",
            "-nic", "none", "-no-reboot",
            "-device", "isa-debug-exit,iobase=0xf4,iosize=0x04",
            "-drive", f"if=pflash,format=raw,readonly=on,file={qemu_path(code)}",
            "-drive", f"if=pflash,format=raw,file={qemu_path(mutable_vars)}",
            "-drive", f"if=none,id=esp,format=raw,readonly=on,file=fat:ro:{qemu_path(esp)}",
            "-device", "virtio-blk-pci,drive=esp,bootindex=1",
        ]
        started = time.monotonic()
        try:
            result = execute(command, timeout=args.timeout)
            output = result.stdout
            errors = verify_output(case, result.returncode, output)
            returncode = result.returncode
        except subprocess.TimeoutExpired as exc:
            raw = exc.stdout or b""
            output = raw.decode("utf-8", "replace") if isinstance(raw, bytes) else raw
            errors = ["QEMU timed out; the process was killed"]
            returncode = None
        duration = round(time.monotonic() - started, 3)
        (case_dir / "serial.log").write_text(output, encoding="utf-8")
        record = {
            "case": case, "passed": not errors, "exit_code": returncode,
            "seconds": duration, "errors": errors, "loader_sha256": sha256(loader),
        }
        results.append(record)
        print(json.dumps(record), flush=True)
    report = {
        "recorded_at_utc": datetime.now(timezone.utc).isoformat(),
        "rust": rust, "qemu": qemu_version, "machine": MACHINE,
        "memory_mib": 256, "vcpus": 1, "accelerator": "tcg", "network": "none",
        "qemu_sha256": sha256(qemu), "firmware_code_sha256": sha256(code),
        "firmware_vars_sha256": sha256(variables), "kernel_sha256": sha256(kernel),
        "native_os_source_sha256": source_digest(), "cases": results,
    }
    (out / "results.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return 0 if all(case["passed"] for case in results) else 1


def main() -> int:
    default_tools = ROOT.parent / ".tools/qemu"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--qemu", type=Path, default=default_tools / "qemu-system-x86_64.exe")
    parser.add_argument("--firmware-dir", type=Path, default=default_tools / "share")
    parser.add_argument("--case", choices=["all", *CASES], default="all")
    parser.add_argument("--timeout", type=float, default=45)
    args = parser.parse_args()
    if not 1 <= args.timeout <= 120:
        parser.error("--timeout must be between 1 and 120 seconds")
    try:
        return run(args)
    except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
        print(f"Boot test failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
