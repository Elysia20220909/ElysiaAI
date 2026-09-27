"""Collect native QEMU arena measurements and freeze size predictions before evaluation."""

import argparse
import hashlib
import json
import math
import shutil
import sys
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace

from sized_inference import solve


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "native-os/tools"))
from sized_test import CASES, expected_pages, observation  # noqa: E402


TRAIN = tuple(CASES)[:6]
CALIBRATE = tuple(CASES)[6:8]
TEST = tuple(CASES)[8:]
REPEATS = 2
CEILING = 16


def write(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def features(shape):
    b, d, c = shape
    return [1.0, b * d * 4 / 1024, c * d * 4 / 1024]


def summarize(rows, cases):
    if len(rows) != len(cases) * REPEATS or {r["case"] for r in rows} != set(cases):
        raise ValueError("missing, extra or wrong-split observations")
    summaries = []
    for case in cases:
        trials = [r for r in rows if r["case"] == case]
        if (
            len(trials) != REPEATS
            or any(
                tuple(r["shape"]) != CASES[case]
                or type(r["peak_arena_pages"]) is not int
                or not 1 <= r["peak_arena_pages"] <= CEILING
                for r in trials
            )
            or len({r["checksum"] for r in trials}) != 1
        ):
            raise ValueError("invalid shape, measurement or repetitions")
        summaries.append(
            {"case": case, "shape": CASES[case], "peak_arena_pages": max(r["peak_arena_pages"] for r in trials)}
        )
    return summaries


def estimate(coefficients, shape):
    return sum(a * x for a, x in zip(coefficients, features(shape), strict=True))


def fit(training, calibration):
    training = summarize(training, TRAIN)
    calibration = summarize(calibration, CALIBRATE)
    xs = [features(r["shape"]) for r in training]
    ys = [r["peak_arena_pages"] for r in training]
    coefficients = solve(
        [[sum(x[i] * x[j] for x in xs) for j in range(3)] for i in range(3)],
        [sum(x[i] * y for x, y in zip(xs, ys, strict=True)) for i in range(3)],
    )
    margin = max(0, *(r["peak_arena_pages"] - estimate(coefficients, r["shape"]) for r in calibration)) + 1
    return {
        "metric": "native-arena-pages",
        "coefficients": coefficients,
        "margin_pages": margin,
        "bounds": [[min(CASES[c][i] for c in TRAIN), max(CASES[c][i] for c in TRAIN)] for i in range(3)],
    }


def propose(model, shape):
    fallback = {"pages": CEILING, "reason": "invalid-model-or-shape", "apply": False}
    if len(shape) != 3 or any(type(v) is not int or v <= 0 for v in shape):
        return fallback
    if model.get("metric") != "native-arena-pages":
        return fallback
    try:
        bounds = model["bounds"]
        coeffs = model["coefficients"]
        margin = model["margin_pages"]
        if len(bounds) != 3 or len(coeffs) != 3 or not math.isfinite(margin) or margin < 1:
            return fallback
        if any(
            len(pair) != 2 or not 0 < pair[0] <= pair[1] or any(type(x) is not int for x in pair) for pair in bounds
        ):
            return fallback
        if any(not math.isfinite(x) for x in coeffs):
            return fallback
        if any(not low <= v <= high for v, (low, high) in zip(shape, bounds, strict=True)):
            return {**fallback, "reason": "outside-training-range"}
        value = estimate(coeffs, shape) + margin
        if not math.isfinite(value) or not 0 < value <= CEILING:
            return fallback
        return {"pages": math.ceil(value), "reason": "size-prediction", "apply": False}
    except (KeyError, TypeError, ValueError, OverflowError):
        return fallback


def load_phase(directory, cases):
    report = json.loads((directory / "report.json").read_text(encoding="utf-8"))
    records = report["cases"]
    if [r["case"] for r in records] != list(cases):
        raise ValueError("wrong collection split or order")
    rows = []
    for record in records:
        case = record["case"]
        serial = directory / f"{case}.log"
        prelaunch = json.loads((directory / f"{case}.json").read_text(encoding="utf-8"))
        if (
            record["passed"] is not True
            or record["exit_code"] != 53
            or record["errors"]
            or record["serial_sha256"] != digest(serial)
            or record["prelaunch"] != prelaunch
            or prelaunch["case"] != case
            or any(prelaunch[k] != report[k] for k in ("kernel_sha256", "sized_elf_sha256", "inference_elf_sha256"))
        ):
            raise ValueError("failed run or changed trace/launch identity")
        row = observation(case, record["exit_code"], serial.read_text(encoding="utf-8"))
        row["serial_sha256"] = record["serial_sha256"]
        rows.append(row)
    identity = {
        k: report[k]
        for k in (
            "kernel_sha256",
            "sized_elf_sha256",
            "qemu_sha256",
            "firmware_code_sha256",
            "firmware_vars_sha256",
            "machine",
            "memory_mib",
            "vcpus",
            "accelerator",
            "network",
            "native_os_source_sha256",
        )
    }
    return rows, identity


def read_splits(run, splits):
    result = {}
    identity = None
    for name, cases in splits:
        result[name] = []
        for repeat in range(REPEATS):
            rows, current = load_phase(run / f"{name}-{repeat}", cases)
            if identity is not None and current != identity:
                raise ValueError("binary or environment changed between observations")
            identity = current
            result[name].extend(rows)
    return result, identity


def evaluate(run):
    data, identity = read_splits(run, (("training", TRAIN), ("calibration", CALIBRATE), ("test", TEST)))
    frozen = json.loads((run / "frozen-model.json").read_text(encoding="utf-8"))
    model = fit(data["training"], data["calibration"])
    proposals = [propose(model, CASES[c]) for c in TEST]
    if frozen != {"model": model, "proposals": proposals, "identity": identity}:
        raise ValueError("frozen model differs from training evidence")
    test = summarize(data["test"], TEST)
    for row, proposal in zip(test, proposals, strict=True):
        row.update(
            proposal=proposal,
            covered=row["peak_arena_pages"] <= proposal["pages"],
            analytic_pages=expected_pages(row["shape"]),
            fixed_pages=CEILING,
        )
    return {
        "schema": 1,
        "completed": True,
        "metric": "native-arena-pages",
        "model": model,
        "identity": identity,
        "test": test,
        "trials": data,
        "frozen_model_sha256": digest(run / "frozen-model.json"),
        "note": "unsigned local evidence; allocation peak, not RSS or a learned memory allocator",
    }


def collect(args):
    import boot_test

    run = args.run_dir
    run.mkdir(parents=True, exist_ok=False)
    original = boot_test.CASES
    try:
        for name, cases in (("training", TRAIN), ("calibration", CALIBRATE), ("test", TEST)):
            if name == "test":
                data, identity = read_splits(run, (("training", TRAIN), ("calibration", CALIBRATE)))
                model = fit(data["training"], data["calibration"])
                write(
                    run / "frozen-model.json",
                    {"model": model, "proposals": [propose(model, CASES[c]) for c in TEST], "identity": identity},
                )
            for repeat in range(REPEATS):
                boot_test.CASES = {c: original[c] for c in cases}
                code = boot_test.run(
                    SimpleNamespace(
                        qemu=args.qemu, firmware_dir=args.firmware_dir, case="all", timeout=45, operator_manual=False
                    )
                )
                phase = run / f"{name}-{repeat}"
                phase.mkdir()
                out = ROOT / "native-os/out"
                shutil.copyfile(out / "results.json", phase / "report.json")
                for case in cases:
                    shutil.copyfile(out / case / "serial.log", phase / f"{case}.log")
                    shutil.copyfile(out / case / "prelaunch.json", phase / f"{case}.json")
                if code:
                    raise RuntimeError(f"QEMU collection failed: {name}-{repeat}")
        result = evaluate(run)
        write(run / "results.json", result)
        return result
    except Exception as exc:
        write(run / "results.json", {"completed": False, "error": str(exc)})
        raise
    finally:
        boot_test.CASES = original


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--collect", action="store_true")
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--qemu", type=Path)
    parser.add_argument("--firmware-dir", type=Path)
    args = parser.parse_args()
    if args.collect:
        if args.qemu is None or args.firmware_dir is None:
            parser.error("collection needs --qemu and --firmware-dir")
        result = collect(args)
    else:
        result = evaluate(args.run_dir)
    print(json.dumps({"evaluated_at": datetime.now(UTC).isoformat(), "test": result["test"]}, indent=2))


if __name__ == "__main__":
    main()
