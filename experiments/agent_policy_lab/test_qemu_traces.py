import unittest

from qemu_traces import TEST, TRAIN, evaluate, extract
from test_inference_test import rejected_run


class TraceTests(unittest.TestCase):
    def test_cpu_budget_observation_requires_expected_stop(self):
        output = rejected_run("infer-mem-budget")
        self.assertEqual(extract("infer-mem-budget", output)["budget_stop_ticks"], 1024)
        self.assertEqual(extract("infer-mem-budget", output.replace("\n", "\r\n")), extract("infer-mem-budget", output))
        with self.assertRaises(ValueError):
            extract("infer-mem-budget", output.replace("ticks=1024", "ticks=1025"))

    def test_extract_real_format_and_reject_incomplete_trace(self):
        output = rejected_run("infer-mem-release")
        row = extract("infer-mem-release", output)
        self.assertEqual(row["peak_arena_pages"], 16)
        self.assertEqual(row["peak_owned_frames"], 31)
        self.assertEqual(len(row["resize_events"]), 32)
        for before, after in (
            ("pages=16", "pages=17"),
            ("frames=31", "frames=30"),
            ("kernel:reaped pid=0", ""),
            ("clean free=100", "clean free=99"),
        ):
            with self.subTest(before=before), self.assertRaises(ValueError):
                extract("infer-mem-release", output.replace(before, after))

    def test_holdout_labels_never_change_fitted_budget(self):
        rows = [{"case": c, "peak_arena_pages": 2} for c in TRAIN + TEST]
        before = evaluate(rows)
        rows[-1]["peak_arena_pages"] = 16
        after = evaluate(rows)
        self.assertEqual(
            before["policies"]["training_max"]["budget_pages"], after["policies"]["training_max"]["budget_pages"]
        )
        self.assertEqual(after["policies"]["training_max"]["covered"], 2)
        self.assertFalse(set(TRAIN) & set(TEST))
        for invalid in (rows[:-1], rows + rows[:1]):
            with self.assertRaises(ValueError):
                evaluate(invalid)


if __name__ == "__main__":
    unittest.main()
