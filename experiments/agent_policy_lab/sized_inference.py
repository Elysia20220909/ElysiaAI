"""Measured dense integer inference with a frozen train/calibration/test split.

Predicts tracemalloc peak bytes, not RSS, RLIMIT_AS, or native-kernel pages.
Generated weights test resource behavior, not prediction accuracy.
"""

from __future__ import annotations

import gc
import hashlib
import json
import math
import os
import platform
import signal
import subprocess
import sys
import time
import tracemalloc
from array import array
from datetime import UTC, datetime
from pathlib import Path


TRAIN = ((1, 64, 4), (4, 64, 4), (1, 128, 8), (4, 128, 8), (1, 256, 16), (4, 256, 16))
CALIBRATE = ((2, 96, 6), (3, 192, 12))
TEST = ((2, 64, 4), (3, 128, 8), (2, 256, 16), (8, 512, 32))
REPEATS = 3
PAGE = 4096
CEILING = 256 * 1024
AS_LIMIT = 128 * 1024 * 1024


def validate(shape):
    if len(shape) != 3 or any(type(x) is not int for x in shape):
        raise ValueError("expected three integer dimensions")
    b, d, c = shape
    if not (1 <= b <= 8 and 1 <= d <= 512 and 1 <= c <= 32):
        raise ValueError("shape exceeds experiment limits")


def features(shape):
    validate(shape)
    batch, width, classes = shape
    return [1.0, batch * width * 4 / 1024, classes * width * 4 / 1024]


def infer(shape):
    validate(shape)
    batch, width, classes = shape
    weights = array("i", ((i % 7) - 3 for i in range(width * classes)))
    inputs = array("i", ((i % 5) - 2 for i in range(batch * width)))
    outputs = array("q", [0]) * (batch * classes)
    if weights.itemsize != 4 or outputs.itemsize != 8:
        raise RuntimeError("unsupported integer layout")
    for b in range(batch):
        for c in range(classes):
            total = 0
            for d in range(width):
                total += inputs[b * width + d] * weights[c * width + d]
            outputs[b * classes + c] = total
    return sum(outputs)


def worker(shape):
    import resource

    gc.collect()
    tracemalloc.start()
    started = time.process_time()
    checksum = infer(shape)
    cpu = time.process_time() - started
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {
        "shape": shape,
        "peak_traced_bytes": peak,
        "checksum": checksum,
        "cpu_seconds": cpu,
        "max_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
    }


def child_limits():
    import resource

    resource.setrlimit(resource.RLIMIT_AS, (AS_LIMIT, AS_LIMIT))
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))


def measure(shape):
    validate(shape)
    proc = subprocess.Popen(
        [sys.executable, "-I", str(Path(__file__).resolve()), "--worker", *map(str, shape)],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8"},
        preexec_fn=child_limits,
        start_new_session=True,
    )
    try:
        stdout, stderr = proc.communicate(timeout=15)
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)
        proc.communicate()
        raise RuntimeError(f"worker timeout: {shape}") from None
    if proc.returncode != 0 or stderr:
        raise RuntimeError(
            f"worker failed: shape={shape} exit={proc.returncode} stderr={stderr.decode('utf-8', 'replace')}"
        )
    result = json.loads(stdout)
    if (
        result["shape"] != list(shape)
        or type(result["peak_traced_bytes"]) is not int
        or result["peak_traced_bytes"] <= 0
    ):
        raise RuntimeError("invalid worker result")
    return result


def solve(matrix, rhs):
    """Small pivoted linear solve; inputs are KiB-scaled to reduce conditioning issues."""
    rows = [list(row) + [y] for row, y in zip(matrix, rhs, strict=True)]
    for i in range(3):
        pivot = max(range(i, 3), key=lambda j: abs(rows[j][i]))
        rows[i], rows[pivot] = rows[pivot], rows[i]
        if abs(rows[i][i]) < 1e-10:
            raise ValueError("training design is singular")
        divisor = rows[i][i]
        rows[i] = [v / divisor for v in rows[i]]
        for j in range(3):
            if i != j:
                factor = rows[j][i]
                rows[j] = [a - factor * b for a, b in zip(rows[j], rows[i], strict=True)]
    return [row[3] for row in rows]


def predict(coefficients, shape):
    return sum(a * b for a, b in zip(coefficients, features(shape), strict=True))


def fit(training, calibration):
    if {tuple(r["shape"]) for r in training} != set(TRAIN) or len(training) != len(TRAIN):
        raise ValueError("unexpected training split")
    if {tuple(r["shape"]) for r in calibration} != set(CALIBRATE) or len(calibration) != len(CALIBRATE):
        raise ValueError("unexpected calibration split")
    xs = [features(r["shape"]) for r in training]
    ys = [r["peak_traced_bytes"] for r in training]
    coefficients = solve(
        [[sum(x[i] * x[j] for x in xs) for j in range(3)] for i in range(3)],
        [sum(x[i] * y for x, y in zip(xs, ys, strict=True)) for i in range(3)],
    )
    # Frozen rule: maximum positive calibration residual plus one page.
    margin = max(0, *(r["peak_traced_bytes"] - predict(coefficients, r["shape"]) for r in calibration)) + PAGE
    return {
        "coefficients": coefficients,
        "margin_bytes": margin,
        "bounds": [[min(s[i] for s in TRAIN), max(s[i] for s in TRAIN)] for i in range(3)],
    }


def propose(model, shape):
    validate(shape)
    if any(not low <= x <= high for x, (low, high) in zip(shape, model["bounds"], strict=True)):
        return {"bytes": CEILING, "reason": "outside-training-range", "apply": False}
    estimate = predict(model["coefficients"], shape) + model["margin_bytes"]
    if not math.isfinite(estimate) or estimate <= 0 or estimate > CEILING:
        return {"bytes": CEILING, "reason": "invalid-estimate", "apply": False}
    return {"bytes": math.ceil(estimate / PAGE) * PAGE, "reason": "size-prediction", "apply": False}


def summarize(shape, trials):
    if len(trials) != REPEATS or any(tuple(t["shape"]) != tuple(shape) for t in trials):
        raise ValueError("missing or mismatched repetitions")
    if len({t["checksum"] for t in trials}) != 1:
        raise ValueError("non-deterministic inference output")
    return {"shape": shape, "peak_traced_bytes": max(t["peak_traced_bytes"] for t in trials), "trials": trials}


def main():
    if sys.platform != "linux":
        raise RuntimeError("run measured inference on Linux")
    if len(sys.argv) == 5 and sys.argv[1] == "--worker":
        print(json.dumps(worker(tuple(map(int, sys.argv[2:])))))
        return
    if len(sys.argv) != 1:
        raise ValueError("unexpected arguments")
    report = {
        "schema": 1,
        "recorded_at_utc": datetime.now(UTC).isoformat(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "python": platform.python_version(),
        "kernel": platform.release(),
        "os": platform.freedesktop_os_release().get("PRETTY_NAME"),
        "metric": "peak bytes traced during generated dense integer inference, not RSS",
        "limits": {"address_space_bytes": AS_LIMIT, "cpu_seconds": 5, "wall_seconds": 15},
        "training": [],
        "calibration": [],
        "test": [],
        "completed": False,
    }
    out = Path(__file__).resolve().parent / "out/sized-inference"
    out.mkdir(parents=True, exist_ok=True)
    try:
        for split, shapes in (("training", TRAIN), ("calibration", CALIBRATE)):
            for shape in shapes:
                report[split].append(summarize(shape, [measure(shape) for _ in range(REPEATS)]))
        report["model"] = fit(report["training"], report["calibration"])
        # Freeze model and all test proposals before acquiring any test measurements.
        report["proposals"] = [propose(report["model"], shape) for shape in TEST]
        (out / "frozen-model.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        for shape, proposal in zip(TEST, report["proposals"], strict=True):
            row = summarize(shape, [measure(shape) for _ in range(REPEATS)])
            row.update(
                proposal=proposal,
                covered=proposal["bytes"] >= row["peak_traced_bytes"],
                fixed_covered=CEILING >= row["peak_traced_bytes"],
            )
            report["test"].append(row)
        report["completed"] = True
    except Exception as exc:
        report["error"] = str(exc)
        raise
    finally:
        (out / "results.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {"completed": True, "test": [{k: v for k, v in r.items() if k != "trials"} for r in report["test"]]},
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
