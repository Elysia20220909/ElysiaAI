"""Archive Agent retry, checkpoint, corruption and existing budget/persistence checks."""

import argparse
import json
import shutil
from pathlib import Path
from types import SimpleNamespace

import boot_test
from arena_policy_test import REJECTIONS
from sized_test import CASES as SIZED_CASES


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--qemu", required=True, type=Path)
    parser.add_argument("--firmware-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    summary = {"completed": False, "runs": []}
    groups = [(policy, "insufficient", policy, ("infer-size-0",)) for policy in ("retry", "cut-replan", "cut-launch")]
    groups += [("analytic", "analytic", "off", tuple(SIZED_CASES))]
    groups += [(f"reject-{variant}", variant, "off", ("infer-size-0",)) for variant in REJECTIONS]
    groups += [
        ("fixed", "fixed", "off", ("infer-size-0", "infer-quota-approve", "infer-quota-denied", "infer-mem-budget"))
    ]
    groups += [
        ("persistence", "fixed", "off", ("persist-complete", "persist-interrupted", "persist-unknown", "persist-torn"))
    ]
    out = boot_test.ROOT / "out"
    try:
        for name, variant, policy, cases in groups:
            before = set((out / "infer-size-0").glob("agent-budget-*"))
            status = boot_test.run(
                SimpleNamespace(
                    qemu=args.qemu,
                    firmware_dir=args.firmware_dir,
                    case=cases[0] if len(cases) == 1 else "all",
                    arena_budget=variant,
                    budget_recovery=policy,
                    timeout=45,
                    operator_manual=False,
                ),
                selected_cases=cases,
            )
            destination = args.output / name
            destination.mkdir()
            for item in ("results.json", "arena-policy.bin", "sized-id.bin"):
                shutil.copyfile(out / item, destination / item)
            report = json.loads((destination / "results.json").read_text(encoding="utf-8"))
            for case in cases:
                for src, suffix in (("serial.log", ".log"), ("prelaunch.json", ".json")):
                    shutil.copyfile(out / case / src, destination / (case + suffix))
            for trial in set((out / "infer-size-0").glob("agent-budget-*")) - before:
                shutil.copytree(trial, destination / trial.name)
            summary["runs"].append(
                {
                    "group": name,
                    "passed": status == 0,
                    "cases": report["cases"],
                    "kernel_sha256": report["kernel_sha256"],
                }
            )
            if status:
                raise RuntimeError(f"Agent budget validation failed: {name}")
        summary["completed"] = True
    except Exception as exc:
        summary["error"] = str(exc)
        raise
    finally:
        (args.output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"Agent budget validation completed: {args.output}")


if __name__ == "__main__":
    main()
