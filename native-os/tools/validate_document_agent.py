"""Bind a frozen real-document experiment to normal and malformed QEMU trials."""

import argparse
import json
import shutil
import sys
from pathlib import Path

import boot_test
from document_agent_test import CASE, VARIANTS, inspect
from document_job_test import POLICIES


LAB = boot_test.ROOT.parent / "experiments/agent_policy_lab"
sys.path.insert(0, str(LAB))
from document_followup import verify_experiment  # noqa: E402


def run(args):
    experiment = args.experiment.resolve()
    host = verify_experiment(experiment)
    bundle = experiment / "document-bundle.bin"
    expected = [(e["id"], e["score"], e["prediction"]) for e in host["evaluation"]]
    if inspect(bundle.read_bytes()) != expected:
        raise ValueError("independent packet oracle differs from frozen host evaluation")
    if args.comparison_experiment:
        other = args.comparison_experiment.resolve()
        comparison = verify_experiment(other)
        if comparison["model_sha256"] != host["model_sha256"] or comparison["bundle_sha256"] != host["bundle_sha256"]:
            raise ValueError("host experiments differ")
    else:
        comparison = None
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    for name in ("frozen-model.json", "document-bundle.bin", "results.json"):
        shutil.copyfile(experiment / name, output / name)
    summary = {"completed": False, "host": host, "comparison_host": comparison, "groups": []}

    def save():
        (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    save()
    args.case = CASE
    args.document_bundle = output / "document-bundle.bin"
    args.operator_manual = False
    args.budget_recovery = "off"
    args.arena_budget = "fixed"
    trials = [(variant, "off") for variant in VARIANTS]
    if getattr(args, "journal", False):
        trials.extend(("valid", policy) for policy in POLICIES if policy != "off")
    for variant, policy in trials:
        args.document_variant = variant
        args.document_job = policy
        source = boot_test.ROOT / "out" / CASE
        previous = set(source.glob("document-job-*"))
        passed = boot_test.run(args) == 0
        report = json.loads((boot_test.ROOT / "out/results.json").read_text(encoding="utf-8"))
        directory = output / (variant if policy == "off" else "job-" + policy)
        directory.mkdir()
        for name in ("serial.log", "prelaunch.json"):
            shutil.copyfile(source / name, directory / name)
        shutil.copyfile(source / "esp/EFI/BOOT/BOOTX64.EFI", directory / "BOOTX64.EFI")
        shutil.copyfile(boot_test.ROOT / "out/document-packet.bin", directory / "packet.bin")
        if policy != "off":
            created = set(source.glob("document-job-*")) - previous
            if len(created) != 1:
                raise RuntimeError("missing unique journal trial directory")
            shutil.copytree(created.pop(), directory / "trials")
        (directory / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        summary["groups"].append(
            {"variant": variant, "document_job": policy, "passed": passed, "cases": report["cases"]}
        )
        save()
        if not passed:
            return 1
    summary["completed"] = True
    summary["all_passed"] = True
    save()
    print(
        json.dumps(
            {
                "completed": True,
                "validation_groups": len(trials),
                "correct": host["correct"],
                "total": host["total"],
                "quality_target_met": host["quality_target_met"],
            }
        )
    )
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--experiment", required=True, type=Path)
    parser.add_argument("--comparison-experiment", type=Path)
    parser.add_argument(
        "--journal", action="store_true", help="Also test durable job/recovery and operator-gated saves"
    )
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--qemu", required=True, type=Path)
    parser.add_argument("--firmware-dir", required=True, type=Path)
    parser.add_argument("--timeout", type=float, default=45)
    args = parser.parse_args()
    if not 1 <= args.timeout <= 120:
        parser.error("timeout must be between 1 and 120 seconds")
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
