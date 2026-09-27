"""Run the frozen six-case QEMU suite using the existing pinned boot runner."""

import argparse
from pathlib import Path
from types import SimpleNamespace

from guarded_policy import ROOT, TEST, TRAIN


def main():
    # guarded_policy loads the repository-local tools path through qemu_traces.
    import boot_test

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--qemu", required=True, type=Path)
    parser.add_argument("--firmware-dir", required=True, type=Path)
    args = parser.parse_args()
    original = boot_test.CASES
    try:
        boot_test.CASES = {case: original[case] for case in TRAIN + TEST}
        code = boot_test.run(
            SimpleNamespace(
                qemu=args.qemu, firmware_dir=args.firmware_dir, case="all", timeout=45, operator_manual=False
            )
        )
        source = ROOT / "native-os/out/results.json"
        (source.parent / "guarded-policy-results.json").write_bytes(source.read_bytes())
        return code
    finally:
        boot_test.CASES = original


if __name__ == "__main__":
    raise SystemExit(main())
