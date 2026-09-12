"""Regression tests for the boot-result classifier, including false-success cases."""
import unittest
from boot_test import CASES, PREFIX, verify_output


class VerdictTests(unittest.TestCase):
    def transcript(self, case):
        # Stale-key recovery occurs before the completed handoff.
        prefix = list(PREFIX)
        if case == "stale-map-key":
            prefix.insert(2, "loader:map-key-rejected\nloader:exit-attempt=1")
            markers = ["kernel:boot-info-valid", "kernel:ready"]
        else:
            markers = CASES[case][1]
        if case == "invalid-opcode":
            prefix.append("kernel:boot-info-valid")
        return "\n".join(prefix + markers)

    def test_accepts_each_expected_result(self):
        for case, (code, _) in CASES.items():
            with self.subTest(case=case):
                self.assertEqual(verify_output(case, code, self.transcript(case)), [])

    def test_success_text_without_successful_exit_is_rejected(self):
        self.assertTrue(verify_output("normal", 0, self.transcript("normal")))

    def test_loader_only_log_does_not_prove_kernel_entry(self):
        output = self.transcript("normal").replace("kernel:entered", "")
        self.assertTrue(verify_output("normal", 33, output))

    def test_fault_case_must_not_reach_normal_completion(self):
        output = self.transcript("invalid-opcode") + "\nkernel:ready"
        self.assertTrue(verify_output("invalid-opcode", 37, output))

    def test_wrong_order_and_unexpected_fault_are_rejected(self):
        output = self.transcript("normal").replace("kernel:entered", "kernel:fault:unexpected")
        self.assertTrue(verify_output("normal", 33, output))
        self.assertTrue(verify_output("normal", 33, "\n".join(reversed(PREFIX))))

    def test_stale_key_case_requires_actual_rejection(self):
        output = self.transcript("stale-map-key").replace("loader:map-key-rejected", "")
        self.assertTrue(verify_output("stale-map-key", 33, output))

    def test_validation_before_kernel_entry_is_rejected(self):
        output = self.transcript("normal").replace("kernel:boot-info-valid", "")
        output = "kernel:boot-info-valid\n" + output
        self.assertTrue(verify_output("normal", 33, output))


if __name__ == "__main__":
    unittest.main()
