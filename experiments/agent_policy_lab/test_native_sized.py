import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import native_sized as lab
from test_sized_test import transcript


def rows(cases):
    return [
        {"case": c, "shape": lab.CASES[c], "peak_arena_pages": lab.expected_pages(lab.CASES[c]), "checksum": 7}
        for c in cases
        for _ in range(lab.REPEATS)
    ]


def phase(directory, cases):
    directory.mkdir()
    identity = {
        k: "a" * 64
        for k in (
            "kernel_sha256",
            "sized_elf_sha256",
            "inference_elf_sha256",
            "qemu_sha256",
            "firmware_code_sha256",
            "firmware_vars_sha256",
            "native_os_source_sha256",
        )
    }
    identity.update(machine="fixture", memory_mib=256, vcpus=1, accelerator="tcg", network="none")
    records = []
    for case in cases:
        serial = directory / f"{case}.log"
        serial.write_text(transcript(case), encoding="utf-8")
        prelaunch = {
            "case": case,
            **{k: identity[k] for k in ("kernel_sha256", "sized_elf_sha256", "inference_elf_sha256")},
        }
        lab.write(directory / f"{case}.json", prelaunch)
        records.append(
            {
                "case": case,
                "passed": True,
                "exit_code": 53,
                "errors": [],
                "serial_sha256": lab.digest(serial),
                "prelaunch": prelaunch,
            }
        )
    lab.write(directory / "report.json", {**identity, "cases": records})


class NativeSizedPolicyTests(unittest.TestCase):
    def test_cli_imports_without_caller_path_setup(self):
        result = subprocess.run([sys.executable, str(Path(lab.__file__)), "--help"], capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_fit_rejects_test_labels_and_invalid_measurements(self):
        for training in (rows(lab.TEST), rows(lab.TRAIN)[:-1]):
            with self.assertRaises(ValueError):
                lab.fit(training, rows(lab.CALIBRATE))
        training = rows(lab.TRAIN)
        training[0]["peak_arena_pages"] = 17
        with self.assertRaises(ValueError):
            lab.fit(training, rows(lab.CALIBRATE))

    def test_native_metric_and_bounded_fallback(self):
        model = lab.fit(rows(lab.TRAIN), rows(lab.CALIBRATE))
        for case in lab.TEST[:-1]:
            p = lab.propose(model, lab.CASES[case])
            self.assertEqual(p["reason"], "size-prediction")
            self.assertFalse(p["apply"])
            self.assertLessEqual(p["pages"], 16)
        self.assertEqual(lab.propose(model, lab.CASES[lab.TEST[-1]])["reason"], "outside-training-range")
        for key, bad in (
            ("metric", "python-traced-bytes"),
            ("coefficients", [float("nan"), 0, 0]),
            ("margin_pages", -1),
            ("bounds", [[1, 0]] * 3),
        ):
            broken = {**model, key: bad}
            self.assertEqual(lab.propose(broken, lab.CASES[lab.TEST[0]])["pages"], 16)
        self.assertEqual(lab.propose(model, [True, 128, 8])["pages"], 16)

    def test_modified_evidence_is_not_accepted(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "phase"
            phase(root, lab.TRAIN)
            self.assertEqual(len(lab.load_phase(root, lab.TRAIN)[0]), len(lab.TRAIN))
            report = json.loads((root / "report.json").read_text())
            for key, value in (("passed", False), ("exit_code", 0), ("serial_sha256", "changed")):
                broken = copy.deepcopy(report)
                broken["cases"][0][key] = value
                lab.write(root / "report.json", broken)
                with self.assertRaises(ValueError):
                    lab.load_phase(root, lab.TRAIN)
            lab.write(root / "report.json", report)
            serial = root / f"{lab.TRAIN[0]}.log"
            serial.write_text(serial.read_text() + "\nchanged")
            with self.assertRaises(ValueError):
                lab.load_phase(root, lab.TRAIN)

    def test_reanalysis_requires_frozen_model_and_same_binaries(self):
        with tempfile.TemporaryDirectory() as directory:
            run = Path(directory)
            splits = (("training", lab.TRAIN), ("calibration", lab.CALIBRATE), ("test", lab.TEST))
            for name, cases in splits:
                for i in range(lab.REPEATS):
                    phase(run / f"{name}-{i}", cases)
            data, identity = lab.read_splits(run, splits)
            model = lab.fit(data["training"], data["calibration"])
            frozen = {
                "model": model,
                "identity": identity,
                "proposals": [lab.propose(model, lab.CASES[c]) for c in lab.TEST],
            }
            lab.write(run / "frozen-model.json", frozen)
            self.assertTrue(lab.evaluate(run)["completed"])
            frozen["proposals"][0]["pages"] = 16
            lab.write(run / "frozen-model.json", frozen)
            with self.assertRaises(ValueError):
                lab.evaluate(run)
            report_path = run / "test-1/report.json"
            report = json.loads(report_path.read_text())
            report["qemu_sha256"] = "different"
            lab.write(report_path, report)
            with self.assertRaises(ValueError):
                lab.read_splits(run, splits)


if __name__ == "__main__":
    unittest.main()
