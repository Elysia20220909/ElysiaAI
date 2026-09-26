"""Replay observed arena allocations; never infer minimum memory or task success."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "native-os/tools"))
from inference_test import (  # noqa: E402
    arena_errors,
    identity_errors,
    verdict as rejection_verdict,  # noqa: E402
)


# Split by scenario family before extraction, never by individual resize event.
TRAIN = ("infer-approve", "infer-short", "infer-deny", "infer-replay", "infer-timeout")
TEST = ("infer-fault", "infer-mem-budget", "infer-mem-release")
RESIZE = re.compile(r"kernel:arena-resize pid=0 request=(\d+) result=(-?\d+) pages=(\d+) limit=(\d+) frames=(\d+)")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def extract(case, output):
    # Serial snapshots retain Windows CRLF; the original text-mode runner normalized it.
    output = output.replace("\r\n", "\n")
    errors = identity_errors(case, output) + arena_errors(case, output)
    if case in TEST:
        # 53 is the expected recorded rejection-run exit, not a new execution.
        errors.extend(rejection_verdict(case, 53, output))
    baseline = re.findall(r"kernel:allocation-rollback boundaries=\d+ free=(\d+)", output)
    clean = re.findall(r"kernel:operation-clean free=(\d+)", output)
    if len(baseline) != 1 or clean != baseline:
        errors.append("missing or mismatched final free-frame count")
    if any(marker in output for marker in ("failure:", "panic", "kernel:fault:unexpected")):
        errors.append("unexpected kernel failure")
    history = []
    for line in output.splitlines():
        if line.startswith("kernel:arena-resize pid=0 "):
            match = RESIZE.fullmatch(line)
            if match is None:
                errors.append("malformed arena event")
                continue
            history.append(
                dict(
                    zip(
                        ("requested_pages", "result", "pages", "limit", "owned_frames"),
                        map(int, match.groups()),
                        strict=True,
                    )
                )
            )
    if not history:
        errors.append("no allocation observations")
    if errors:
        raise ValueError(f"{case}: {'; '.join(errors)}")
    stops = re.findall(r"kernel:budget-stopped pid=0 ticks=(\d+)", output)
    return {
        "case": case,
        "peak_arena_pages": max(row["pages"] for row in history),
        "peak_owned_frames": max(row["owned_frames"] for row in history),
        "resize_events": history,
        "budget_stop_ticks": int(stops[0]) if len(stops) == 1 else None,
        "free_frames_restored": True,
    }


def evaluate(rows):
    by_case = {row["case"]: row for row in rows}
    if len(by_case) != len(rows) or set(by_case) != set(TRAIN + TEST):
        raise ValueError("missing, extra or duplicate scenarios")
    # Conservative empirical maximum on training only. No test labels used here.
    learned = max(by_case[name]["peak_arena_pages"] for name in TRAIN)
    policies = {}
    for name, budget in (("fixed", 16), ("training_max", learned)):
        samples = [
            {
                "case": case,
                "observed_peak_pages": by_case[case]["peak_arena_pages"],
                "proposed_pages": budget,
                "covers_observed_peak": budget >= by_case[case]["peak_arena_pages"],
                "shortfall_pages": max(0, by_case[case]["peak_arena_pages"] - budget),
            }
            for case in TEST
        ]
        policies[name] = {
            "budget_pages": budget,
            "covered": sum(s["covers_observed_peak"] for s in samples),
            "samples": samples,
        }
    return {
        "train_cases": TRAIN,
        "test_cases": TEST,
        "policies": policies,
        "interpretation": "Offline coverage of observed allocations, not completion, minimum memory or measured savings.",
    }


def main():
    source = ROOT / "native-os/out"
    report_bytes = (source / "agent-runtime-results.json").read_bytes()
    report = json.loads(report_bytes)
    records = report["cases"]
    indexed = {r["case"]: r for r in records}
    if len(indexed) != len(records):
        raise ValueError("duplicate report cases")
    rows, snapshots = [], {}
    for case in TRAIN + TEST:
        record = indexed[case]
        if record["passed"] is not True or record["errors"]:
            raise ValueError(f"unverified source case: {case}")
        loader = source / case / "esp/EFI/BOOT/BOOTX64.EFI"
        if digest(loader.read_bytes()) != record["loader_sha256"]:
            raise ValueError(f"loader/report mismatch: {case}")
        raw = (source / case / "serial.log").read_bytes()
        row = extract(case, raw.decode("utf-8", errors="strict"))
        row["serial_sha256"] = digest(raw)
        row["loader_sha256"] = record["loader_sha256"]
        rows.append(row)
        snapshots[case] = raw
    result = {
        "schema": 1,
        "report_sha256": digest(report_bytes),
        "extractor_sha256": digest(Path(__file__).read_bytes()),
        "source_recorded_at_utc": report["recorded_at_utc"],
        "kernel_sha256": report["kernel_sha256"],
        "rows": rows,
        "evaluation": evaluate(rows),
        "provenance_limit": "Original report has no serial hashes; hashes bind extraction snapshots, not original run time. Disk integrity and exit codes were not rerun.",
    }
    out = Path(__file__).resolve().parent / "out/qemu-traces"
    out.mkdir(parents=True, exist_ok=True)
    for case, raw in snapshots.items():
        (out / f"{case}.log").write_bytes(raw)
    (out / "source-report.json").write_bytes(report_bytes)
    (out / "results.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["evaluation"], indent=2))


if __name__ == "__main__":
    main()
