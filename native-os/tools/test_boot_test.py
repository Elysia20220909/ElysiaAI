"""Regression tests for the boot-result classifier, including false-success cases."""
import unittest
from boot_test import CASES, PREFIX, FAULT_CASES, verify_output


class VerdictTests(unittest.TestCase):
    def transcript(self, case):
        # Stale-key recovery occurs before the completed handoff.
        prefix = list(PREFIX)
        if case == "stale-map-key":
            prefix.insert(2, "loader:map-key-rejected\nloader:exit-attempt=1")
        if case != "bad-boot-info":
            prefix.extend(["kernel:boot-info-valid", "kernel:frames-verified available=50000",
                           "kernel:paging-active new-root=0x100000", "kernel:mapped-memory-verified"])
        return "\n".join(prefix + CASES[case][1])

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
        for case in FAULT_CASES:
            with self.subTest(case=case):
                output = self.transcript(case) + "\nkernel:ready"
                self.assertTrue(verify_output(case, CASES[case][0], output))

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

    def test_old_m1_success_without_memory_proof_is_rejected(self):
        output = "\n".join(PREFIX + ["kernel:boot-info-valid", "kernel:ready"])
        self.assertTrue(verify_output("normal", 33, output))

    def test_page_fault_before_switch_or_without_access_test_is_rejected(self):
        for marker in ["kernel:paging-active", "kernel:mapped-memory-verified"]:
            output = self.transcript("readonly-page").replace(marker, "omitted")
            self.assertTrue(verify_output("readonly-page", 41, output))


if __name__ == "__main__":
    unittest.main()
