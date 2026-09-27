import unittest

from lab import HOLDOUT, TRAIN, admit, evaluate, fit, propose


class PolicyTests(unittest.TestCase):
    def test_training_and_holdout_are_disjoint(self):
        self.assertFalse({x for x, _ in TRAIN} & {x for x, _ in HOLDOUT})

    def test_model_is_deterministic_and_cannot_authorize(self):
        self.assertEqual(evaluate(), evaluate())
        self.assertFalse(admit(propose(fit(TRAIN), 10**9)))

    def test_guard_rejects_escalation_and_malformed_fields(self):
        valid = propose(fit(TRAIN), 4096)
        self.assertTrue(admit(valid))
        for field, values in {
            "pages": [0, -1, 17, True, "2", 2.5, None],
            "network_bytes": [1, -1, False, "0"],
            "tool": ["shell", None],
            "context": ["home", "/etc/passwd", None],
        }.items():
            for value in values:
                with self.subTest(field=field, value=value):
                    self.assertFalse(admit({**valid, field: value}))
        self.assertFalse(admit({**valid, "approved": True}))
        self.assertFalse(admit({}))
        self.assertFalse(admit(None))

    def test_shift_is_reported_as_failure_not_hidden_by_clipping(self):
        for result in evaluate()["policies"].values():
            self.assertFalse(result["samples"][-1]["simulated_complete"])
            self.assertIsNone(result["samples"][-1]["unused_pages"])

    def test_insufficient_training_is_rejected(self):
        for rows in ([], [(1, 1)], [(1, 1), (1, 2)]):
            with self.assertRaises(ValueError):
                fit(rows)


if __name__ == "__main__":
    unittest.main()
