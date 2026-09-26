"""Exact-workload shadow policy: do not extrapolate a reduced memory budget."""

from __future__ import annotations

import json
import re
from pathlib import Path

from qemu_traces import ROOT, digest, extract, rejection_verdict


# Frozen before collecting this evaluation. Earlier test scenarios are excluded.
TRAIN = ("infer-approve", "infer-short")
TEST = ("infer-model", "infer-oversized", "infer-mem-grow", "infer-mem-limit")
CEILING = 16


def fingerprint(features):
    if type(features) is not dict or set(features) != {"case", "kernel_sha256", "inference_elf_sha256"}:
        raise ValueError("invalid prelaunch fields")
    if type(features["case"]) is not str or not re.fullmatch(r"infer-[a-z-]+", features["case"]):
        raise ValueError("invalid workload identity")
    for field in ("kernel_sha256", "inference_elf_sha256"):
        if type(features[field]) is not str or not re.fullmatch(r"[0-9a-f]{64}", features[field]):
            raise ValueError("invalid image digest")
    return tuple(features[field] for field in ("case", "kernel_sha256", "inference_elf_sha256"))


def train(rows):
    model = {}
    for row in rows:
        key = fingerprint(row["prelaunch"])
        peak = row["peak_arena_pages"]
        if type(peak) is not int or not 1 <= peak <= CEILING:
            raise ValueError("invalid training observation")
        model[key] = max(model.get(key, 0), peak)
    return model


def propose(model, features):
    try:
        key = fingerprint(features)
    except ValueError:
        return {"pages": CEILING, "reason": "invalid-features", "apply": False}
    if key not in model:
        return {"pages": CEILING, "reason": "unknown-workload", "apply": False}
    pages = model[key]
    if type(pages) is not int or not 1 <= pages <= CEILING:
        return {"pages": CEILING, "reason": "invalid-model", "apply": False}
    return {"pages": pages, "reason": "observed-workload", "apply": False}


def load_rows(report, source):
    records = report["cases"]
    names = [r["case"] for r in records]
    if len(set(names)) != len(names) or set(names) != set(TRAIN + TEST):
        raise ValueError("unexpected evaluation split")
    rows = []
    for record in records:
        case = record["case"]
        if record["passed"] is not True or record["errors"]:
            raise ValueError("failed source run")
        if record.get("exit_code") != (53 if case in TEST else 55):
            raise ValueError("unexpected recorded exit code")
        features = record["prelaunch"]
        fingerprint(features)
        if features != {
            "case": case,
            "kernel_sha256": report["kernel_sha256"],
            "inference_elf_sha256": report["inference_elf_sha256"],
        }:
            raise ValueError("report identity mismatch")
        directory = source / case
        if json.loads((directory / "prelaunch.json").read_text(encoding="utf-8")) != features:
            raise ValueError("prelaunch snapshot mismatch")
        raw = (directory / "serial.log").read_bytes()
        if digest(raw) != record["serial_sha256"]:
            raise ValueError("serial hash mismatch")
        if digest((directory / "esp/EFI/BOOT/BOOTX64.EFI").read_bytes()) != record["loader_sha256"]:
            raise ValueError("loader hash mismatch")
        text = raw.decode("utf-8").replace("\r\n", "\n")
        if case in TEST and rejection_verdict(case, record["exit_code"], text):
            raise ValueError("rejection-run evidence invalid")
        row = extract(case, text)
        row.update(prelaunch=features, serial_sha256=record["serial_sha256"])
        rows.append(row)
    return rows


def evaluate(rows):
    if len(rows) != len(TRAIN + TEST) or {row["case"] for row in rows} != set(TRAIN + TEST):
        raise ValueError("unexpected evaluation split")
    training = [r for r in rows if r["case"] in TRAIN]
    model = train(training)
    unguarded = max(r["peak_arena_pages"] for r in training)
    samples = []
    for row in rows:
        if row["case"] not in TEST:
            continue
        proposal = propose(model, row["prelaunch"])
        peak = row["peak_arena_pages"]
        samples.append(
            {
                "case": row["case"],
                "observed_peak_pages": peak,
                "proposal": proposal,
                "guarded_covers_peak": proposal["pages"] >= peak,
                "unguarded_covers_peak": unguarded >= peak,
                "fixed_covers_peak": CEILING >= peak,
            }
        )
    return {
        "training_cases": TRAIN,
        "test_cases": TEST,
        "unguarded_pages": unguarded,
        "samples": samples,
        "effective_kernel_pages": CEILING,
        "interpretation": "Exact-mode fallback, not learned novelty detection or measured memory savings.",
    }


def main():
    source = ROOT / "native-os/out"
    raw_report = (source / "guarded-policy-results.json").read_bytes()
    rows = load_rows(json.loads(raw_report), source)
    result = {
        "source_report_sha256": digest(raw_report),
        "policy_sha256": digest(Path(__file__).read_bytes()),
        "rows": rows,
        "evaluation": evaluate(rows),
    }
    out = Path(__file__).resolve().parent / "out/guarded-policy"
    out.mkdir(parents=True, exist_ok=True)
    (out / "results.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["evaluation"], indent=2))


if __name__ == "__main__":
    main()
