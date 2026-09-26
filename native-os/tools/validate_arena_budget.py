"""Apply analytic budgets to all fixed shapes, then reject malformed proposals in QEMU."""

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
    original = boot_test.CASES
    summary = {"completed": False, "runs": []}
    groups = [("analytic", tuple(SIZED_CASES))]
    groups += [(variant, ("infer-size-0",)) for variant in REJECTIONS]
    groups += [("fixed", ("infer-size-0", "infer-quota-approve", "infer-quota-denied", "infer-mem-budget"))]
    try:
        for variant, cases in groups:
            boot_test.CASES = {c: original[c] for c in cases}
            status = boot_test.run(
                SimpleNamespace(
                    qemu=args.qemu,
                    firmware_dir=args.firmware_dir,
                    case="infer-size-0" if variant in REJECTIONS else "all",
                    arena_budget=variant,
                    timeout=45,
                    operator_manual=False,
                )
            )
            destination = args.output / variant
            destination.mkdir()
            out = boot_test.ROOT / "out"
            for name in ("results.json", "arena-policy.bin", "sized-id.bin"):
                shutil.copyfile(out / name, destination / name)
            report = json.loads((destination / "results.json").read_text(encoding="utf-8"))
            for case in cases:
                for src, suffix in (("serial.log", ".log"), ("prelaunch.json", ".json")):
                    shutil.copyfile(out / case / src, destination / (case + suffix))
            summary["runs"].append(
                {
                    "variant": variant,
                    "passed": status == 0,
                    "cases": report["cases"],
                    "kernel_sha256": report["kernel_sha256"],
                    "arena_policy_sha256": report["arena_policy_sha256"],
                }
            )
            if status:
                raise RuntimeError(f"budget validation failed: {variant}")
        summary["completed"] = True
    except Exception as exc:
        summary["error"] = str(exc)
        raise
    finally:
        boot_test.CASES = original
        (args.output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"Budget validation completed: {args.output}")


if __name__ == "__main__":
    main()
