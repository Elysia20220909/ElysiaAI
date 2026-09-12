"""Regression tests for the boot-result classifier, including false-success cases."""
import unittest
from boot_test import CASES, PREFIX, FAULT_CASES, USER_CASES, LIFECYCLE_CASES, IPC_CASES, verify_output


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
        if case in IPC_CASES:
            markers = ["kernel:allocation-rollback boundaries=14 free=50000",
                       "kernel:user-spaces-ready roots=0x100000,0x200000",
                       "kernel:timer-ready", "kernel:user-enter pid=0 cpl=3"]
            if case == "ipc-echo":
                markers.extend(["kernel:ipc-result pid=0 op=3 result=-9"] * 2)
                markers.extend(["kernel:ipc-result pid=0 op=3 result=-13",
                                "kernel:ipc-result pid=0 op=3 result=-90",
                                "kernel:ipc-result pid=0 op=4 result=-14",
                                "kernel:ipc-result pid=1 op=4 result=-90"])
                markers.extend(["kernel:ipc-result pid=0 op=3 result=2"] * 2)
                for _ in range(2):
                    markers.extend(["kernel:ipc-block pid=0", "kernel:ipc-result pid=1 op=3 result=2",
                                    "kernel:ipc-wake pid=0 result=2"])
            elif case in ("ipc-peer-exit", "ipc-peer-fault"):
                markers.extend(["kernel:ipc-block pid=0",
                    "kernel:user-exit pid=1 status=0" if case == "ipc-peer-exit" else
                    "kernel:user-stopped pid=1 vector=6 error=0x0 address=0x0",
                    "kernel:reaped pid=1", "kernel:ipc-wake pid=0 result=-32"])
            elif case == "ipc-revoke":
                markers.extend(["kernel:ipc-block pid=0", "kernel:ipc-result pid=1 op=5 result=0",
                                "kernel:ipc-wake pid=0 result=-32", "kernel:ipc-result pid=0 op=3 result=-9",
                                "kernel:ipc-result pid=0 op=4 result=-9"])
            elif case == "ipc-deadlock":
                markers.extend(["kernel:ipc-block pid=0", "kernel:ipc-result pid=1 op=4 result=-35",
                                "kernel:ipc-wake pid=0 result=2"])
            else:
                markers.append("kernel:ipc-result pid=0 op=3 result=-11")
            markers.extend(["user:log pid=0 hex=6f6b", "kernel:user-exit pid=0 status=0", "kernel:reaped pid=0"])
            if case not in ("ipc-peer-exit", "ipc-peer-fault"):
                markers.extend(["kernel:user-exit pid=1 status=0", "kernel:reaped pid=1"])
            markers.extend(["kernel:ipc-clean free=50000", f"kernel:ipc-tests-passed mode={IPC_CASES[case]}"])
        if case in LIFECYCLE_CASES:
            count = 64 if case == "user-recycle" else 1
            markers = ["kernel:allocation-rollback boundaries=12 free=50000"]
            for generation in range(count):
                markers.extend(["kernel:user-spaces-ready roots=0x100000,0x200000",
                                "kernel:user-enter pid=0 cpl=3"])
                if case == "user-recycle":
                    markers.extend(["kernel:user-exit pid=0 status=0", "kernel:reaped pid=0",
                                    "kernel:user-stopped pid=1 vector=6 error=0x0 address=0x0"])
                else:
                    markers.extend(["kernel:timer-ready source=pit irq=0 hz=100", "user:log pid=1 hex=50"])
                    if case == "user-yield-spin":
                        markers.append("kernel:user-yield pid=0")
                    markers.extend(f"kernel:preempt pid=0 ticks={tick}" for tick in range(1, 9))
                    markers.extend(["kernel:budget-stopped pid=0 ticks=8", "kernel:reaped pid=0",
                                    "kernel:preempt pid=1 ticks=1", "user:log pid=1 hex=51",
                                    "kernel:user-exit pid=1 status=0"])
                markers.extend(["kernel:reaped pid=1",
                                f"kernel:generation-reclaimed generation={generation} free=50000"])
            markers.append(f"kernel:lifecycle-tests-passed mode={LIFECYCLE_CASES[case]}")
        return "\n".join(prefix + markers)

    def test_accepts_each_expected_result(self):
        for case, (code, _) in CASES.items():
            with self.subTest(case=case):
                self.assertEqual(verify_output(case, code, self.transcript(case)), [])

    def test_lifecycle_requires_reclamation_and_stable_counts(self):
        output = self.transcript("user-recycle")
        for corrupted in (output.replace("kernel:reaped pid=0", "omitted", 1),
                          output.replace("generation=31 free=50000", "generation=31 free=49999"),
                          output.replace("generation=63", "generation=62")):
            self.assertTrue(verify_output("user-recycle", 47, corrupted))

    def test_timer_budget_needs_cumulative_ticks_and_survivor(self):
        output = self.transcript("user-preempt")
        for corrupted in (output.replace("pid=0 ticks=4", "pid=0 ticks=1"),
                          output.replace("user:log pid=1 hex=51", "omitted"),
                          output + "\nkernel:preempt pid=0 ticks=9",
                          output.replace("kernel:timer-ready", "omitted")):
            self.assertTrue(verify_output("user-preempt", 47, corrupted))

    def test_ipc_cannot_run_blocked_process_or_wake_without_wait(self):
        output = self.transcript("ipc-echo")
        bad = output.replace("kernel:ipc-block pid=0", "kernel:ipc-block pid=0\nkernel:user-switch from=1 to=0", 1)
        self.assertTrue(verify_output("ipc-echo", 49, bad))
        bad = output.replace("kernel:ipc-block pid=0", "omitted", 1)
        self.assertTrue(verify_output("ipc-echo", 49, bad))

    def test_ipc_requires_wakeup_reclamation_and_capability_rejections(self):
        for case, marker in (("ipc-peer-fault", "kernel:ipc-wake pid=0 result=-32"),
                             ("ipc-echo", "kernel:ipc-result pid=0 op=3 result=-9"),
                             ("ipc-queue", "kernel:reaped pid=1"),
                             ("ipc-revoke", "kernel:ipc-result pid=0 op=4 result=-9")):
            output = self.transcript(case).replace(marker, "omitted", 1)
            self.assertTrue(verify_output(case, 49, output))
        output = self.transcript("ipc-echo").replace("kernel:ipc-clean free=50000", "kernel:ipc-clean free=49999")
        self.assertTrue(verify_output("ipc-echo", 49, output))

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
