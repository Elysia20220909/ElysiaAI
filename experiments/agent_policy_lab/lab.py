"""Proposal-only policy experiment; Linux limits protect trusted test workers.

No arbitrary programs, files, models or commands are accepted. This is not a
hostile-code sandbox, a native kernel implementation, or a performance claim.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import platform
import signal
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path


PAGE = 4096
MAX_PAGES = 16
AS_LIMIT = 128 * 1024 * 1024
# Synthetic training observations: input bytes and peak application pages.
TRAIN = ((1024, 2), (4096, 3), (8192, 4), (16384, 6), (32768, 10))
# Frozen holdout; labels are never passed into fit() or propose().
HOLDOUT = ((2048, 3), (6144, 4), (12288, 5), (24576, 8), (40960, 13), (57344, 20))


def fit(rows):
    """Least-squares two-parameter memory estimator, trained only offline."""
    if len(rows) < 2:
        raise ValueError("at least two observations required")
    xs, ys = zip(*rows, strict=True)
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    variance = sum((x - mx) ** 2 for x in xs)
    if variance == 0:
        raise ValueError("training inputs must vary")
    slope = sum((x - mx) * (y - my) for x, y in rows) / variance
    return slope, my - slope * mx


def propose(model, input_bytes):
    slope, intercept = model
    return {
        "tool": "read_fixture",
        "context": "synthetic",
        "pages": max(1, math.ceil(slope * input_bytes + intercept)),
        "network_bytes": 0,
    }


def admit(proposal):
    """A deterministic host-side research guard, independent of the predictor."""
    if type(proposal) is not dict or set(proposal) != {"tool", "context", "pages", "network_bytes"}:
        return False
    return (
        proposal["tool"] == "read_fixture"
        and proposal["context"] == "synthetic"
        and type(proposal["pages"]) is int
        and 1 <= proposal["pages"] <= MAX_PAGES
        and type(proposal["network_bytes"]) is int
        and proposal["network_bytes"] == 0
    )


def evaluate():
    model = fit(TRAIN)
    results = {}
    for name in ("fixed", "learned"):
        samples = []
        for size, required in HOLDOUT:
            proposal = propose(model, size)
            if name == "fixed":
                proposal["pages"] = MAX_PAGES
            accepted = admit(proposal)
            complete = accepted and proposal["pages"] >= required
            samples.append(
                {
                    "input_bytes": size,
                    "required_pages": required,
                    "proposed_pages": proposal["pages"],
                    "admitted": accepted,
                    "simulated_complete": complete,
                    "unused_pages": max(0, proposal["pages"] - required) if complete else None,
                }
            )
        results[name] = {
            "samples": samples,
            "completed": sum(s["simulated_complete"] for s in samples),
            "total_proposed_pages": sum(s["proposed_pages"] for s in samples),
        }
    return {
        "data": "synthetic frozen holdout, not measured process memory",
        "training": TRAIN,
        "model": {"slope": model[0], "intercept": model[1]},
        "policies": results,
    }


def child(mode):
    if mode == "normal":
        data = bytearray(16 * PAGE)
        data[0] = 7
        print(json.dumps({"status": "completed", "bytes": len(data), "checksum": sum(data)}))
    elif mode == "memory":
        try:
            bytearray(AS_LIMIT * 2)
        except MemoryError:
            print(json.dumps({"status": "memory_refused"}))
        else:
            raise RuntimeError("memory ceiling ineffective")
    elif mode == "cpu":
        while True:
            pass
    elif mode == "fault":
        sys.exit(23)
    else:
        raise ValueError("unknown fixture")


def limit_child():
    import resource

    resource.setrlimit(resource.RLIMIT_AS, (AS_LIMIT, AS_LIMIT))
    resource.setrlimit(resource.RLIMIT_CPU, (1, 1))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))


def run_worker(mode):
    if sys.platform != "linux":
        raise RuntimeError("Linux is required for real resource-limit verification")
    if mode not in {"normal", "memory", "cpu", "fault"}:
        raise ValueError("unknown fixture")
    started = time.monotonic()
    # Single-threaded runner only. Limits take effect before Python execs.
    process = subprocess.Popen(
        [sys.executable, "-I", str(Path(__file__).resolve()), "--worker", mode],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8"},
        preexec_fn=limit_child,
        start_new_session=True,
    )
    timeout = False
    try:
        stdout, stderr = process.communicate(timeout=4)
    except subprocess.TimeoutExpired:
        timeout = True
        os.killpg(process.pid, signal.SIGKILL)
        stdout, stderr = process.communicate()
    payload = json.loads(stdout) if stdout.strip() else None
    passed = (
        not timeout
        and not stderr
        and (
            (
                mode == "normal"
                and process.returncode == 0
                and payload == {"status": "completed", "bytes": 65536, "checksum": 7}
            )
            or (mode == "memory" and process.returncode == 0 and payload == {"status": "memory_refused"})
            or (mode == "cpu" and process.returncode == -signal.SIGKILL)
            or (mode == "fault" and process.returncode == 23)
        )
    )
    return {
        "fixture": mode,
        "passed": passed,
        "exit_code": process.returncode,
        "wall_seconds": round(time.monotonic() - started, 4),
        "timed_out": timeout,
        "payload": payload,
        "stderr": stderr.decode("utf-8", "replace"),
    }


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--worker":
        child(sys.argv[2])
        return 0
    if len(sys.argv) != 1:
        raise ValueError("no arbitrary commands or input paths are supported")
    workers = [run_worker(mode) for mode in ("normal", "memory", "normal", "cpu", "normal", "fault", "normal")]
    report = {
        "schema": 1,
        "python": platform.python_version(),
        "kernel": platform.release(),
        "recorded_at_utc": datetime.now(UTC).isoformat(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "os": platform.freedesktop_os_release().get("PRETTY_NAME"),
        "limits": {"address_space_bytes": AS_LIMIT, "cpu_seconds": 1, "wall_seconds": 4},
        "policy_experiment": evaluate(),
        "workers": workers,
        "passed": all(w["passed"] for w in workers),
    }
    destination = Path(__file__).resolve().parent / "out"
    destination.mkdir(exist_ok=True)
    (destination / "results.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
