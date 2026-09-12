"""Regression tests for the boot-result classifier, including false-success cases."""
import unittest
from boot_test import CASES, PREFIX, FAULT_CASES, USER_CASES, verify_output


class VerdictTests(unittest.TestCase):
    def transcript(self, case):
        # Stale-key recovery occurs before the completed handoff.
        prefix = list(PREFIX)
        if case == "stale-map-key":
            prefix.insert(2, "loader:map-key-rejected\nloader:exit-attempt=1")
        if case != "bad-boot-info":
            prefix.extend(["kernel:boot-info-valid", "kernel:frames-verified available=50000",
                           "kernel:paging-active new-root=0x100000", "kernel:mapped-memory-verified"])
        markers = list(CASES[case][1])
        if case in USER_CASES:
            prefix.append("kernel:user-spaces-ready roots=0x100000,0x200000")
            # Expand fixture evidence with all rejected requests, as actual user
            # code emits them before yielding. The ordered markers remain intact.
            for pid in (0, 1):
                for reason, count in (("range", 8), ("number", 1), ("status", 1)):
                    line = f"kernel:syscall-rejected pid={pid} reason={reason}"
                    prefix.extend([line] * (count - markers.count(line)))
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

    def test_user_isolation_needs_survivor_progress_after_fault(self):
        output = self.transcript("user-kernel")
        output = output.replace("user:log pid=1 hex=62", "")
        self.assertTrue(verify_output("user-kernel", 45, output))

    def test_stopped_process_cannot_resume_even_with_success_marker(self):
        output = self.transcript("user-peer") + "\nkernel:user-trap pid=0 vector=128 cpl=3"
        self.assertTrue(verify_output("user-peer", 45, output))

    def test_user_root_and_rejection_evidence_are_required(self):
        output = self.transcript("user-cooperate")
        for changed in [output.replace("0x200000", "0x100000"),
                        output.replace("kernel:syscall-rejected pid=1 reason=range", "", 1)]:
            self.assertTrue(verify_output("user-cooperate", 45, changed))

    def test_unrelated_user_fault_is_not_isolation_success(self):
        output = self.transcript("user-kernel").replace("error=0x5", "error=0x4")
        self.assertTrue(verify_output("user-kernel", 45, output))


if __name__ == "__main__":
    unittest.main()
