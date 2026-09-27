import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from guarded_policy import TEST, TRAIN, evaluate, load_rows, propose, train
from qemu_traces import digest


def features(case="infer-approve"):
    return {"case": case, "kernel_sha256": "a" * 64, "inference_elf_sha256": "b" * 64}


class GuardedPolicyTests(unittest.TestCase):
    def test_collector_cli_imports_without_qemu_or_pythonpath(self):
        result = subprocess.run(
            [sys.executable, str(Path(__file__).with_name("collect_guarded.py")), "--help"],
            capture_output=True,
            timeout=10,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_new_mode_and_changed_images_keep_ceiling(self):
        model = train([{"prelaunch": features(), "peak_arena_pages": 2}])
        self.assertEqual(propose(model, features())["pages"], 2)
        for candidate in (
            features("infer-mem-grow"),
            {**features(), "kernel_sha256": "c" * 64},
            {**features(), "inference_elf_sha256": "d" * 64},
            {},
            None,
        ):
            proposal = propose(model, candidate)
            self.assertEqual(proposal["pages"], 16)
            self.assertFalse(proposal["apply"])

    def test_training_cannot_bypass_ceiling_or_mutate_model(self):
        for peak in (0, 17, True, "2"):
            with self.assertRaises(ValueError):
                train([{"prelaunch": features(), "peak_arena_pages": peak}])
        model = train([{"prelaunch": features(), "peak_arena_pages": 2}])
        original = model.copy()
        propose(model, features("infer-mem-grow"))
        self.assertEqual(model, original)
        model[next(iter(model))] = 999
        self.assertEqual(propose(model, features())["pages"], 16)

    def test_holdout_observations_do_not_change_proposals(self):
        rows = [{"case": c, "prelaunch": features(c), "peak_arena_pages": 2} for c in TRAIN + TEST]
        before = evaluate(rows)
        for row in rows:
            if row["case"] in TEST:
                row["peak_arena_pages"] = 16
        after = evaluate(rows)
        self.assertEqual([s["proposal"] for s in before["samples"]], [s["proposal"] for s in after["samples"]])
        self.assertTrue(all(s["guarded_covers_peak"] for s in after["samples"]))
        self.assertFalse(any(s["unguarded_covers_peak"] for s in after["samples"]))

    def test_snapshots_are_bound_to_recorded_hashes_and_launch_identity(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp)
            report = {"kernel_sha256": "a" * 64, "inference_elf_sha256": "b" * 64, "cases": []}
            for case in TRAIN + TEST:
                directory = source / case
                (directory / "esp/EFI/BOOT").mkdir(parents=True)
                (directory / "esp/EFI/BOOT/BOOTX64.EFI").write_bytes(b"loader")
                (directory / "serial.log").write_bytes(b"serial")
                (directory / "prelaunch.json").write_text(json.dumps(features(case)), encoding="utf-8")
                report["cases"].append(
                    {
                        "case": case,
                        "passed": True,
                        "exit_code": 53 if case in TEST else 55,
                        "errors": [],
                        "prelaunch": features(case),
                        "serial_sha256": digest(b"serial"),
                        "loader_sha256": digest(b"loader"),
                    }
                )
            with (
                patch("guarded_policy.extract", side_effect=lambda case, _: {"case": case, "peak_arena_pages": 2}),
                patch("guarded_policy.rejection_verdict", return_value=[]),
            ):
                self.assertEqual(len(load_rows(report, source)), 6)
                for name in ("serial.log", "prelaunch.json", "esp/EFI/BOOT/BOOTX64.EFI"):
                    path = source / TRAIN[0] / name
                    original = path.read_bytes()
                    path.write_bytes(b"{}")
                    with self.assertRaises(ValueError):
                        load_rows(report, source)
                    path.write_bytes(original)
                report["cases"][0]["exit_code"] = 0
                with self.assertRaises(ValueError):
                    load_rows(report, source)
                report["cases"][0]["exit_code"] = 55
                report["cases"].append(report["cases"][0])
                with self.assertRaises(ValueError):
                    load_rows(report, source)


if __name__ == "__main__":
    unittest.main()
