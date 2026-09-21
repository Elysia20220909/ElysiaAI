"""Regression tests for the boot-result classifier, including false-success cases."""
import unittest

from boot_test import (
    CASES,
    DOCUMENT_CASES,
    DOCUMENT_STATUSES,
    ELF_CASES,
    FAULT_CASES,
    INFERENCE_CASES,
    IPC_CASES,
    LIFECYCLE_CASES,
    OPERATION_CASES,
    OPERATOR_CASES,
    PERSISTENCE_CASES,
    PREFIX,
    RECOVERY_CASES,
    USER_CASES,
    verify_output,
)


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
        if case in DOCUMENT_CASES:
            markers = ["kernel:allocation-rollback boundaries=14 free=50000",
                       "kernel:user-spaces-ready roots=0x100000,0x200000",
                       "kernel:timer-ready", "kernel:user-enter pid=0 cpl=3",
                       "kernel:document-serve pid=0 result=-13"]
            for status in DOCUMENT_STATUSES[case]:
                markers.extend(["kernel:ipc-result pid=1 op=4 result=-11",
                                "kernel:document-serve pid=1 result=-14",
                                f"kernel:document-response status={status}",
                                "kernel:document-serve pid=1 result=64",
                                "kernel:document-serve pid=1 result=-11"])
            if not DOCUMENT_STATUSES[case]:
                markers.extend(["kernel:ipc-block pid=0",
                    "kernel:user-exit pid=1 status=0" if case.endswith("exit") else
                    "kernel:user-stopped pid=1 vector=6 error=0x0 address=0x0",
                    "kernel:reaped pid=1", "kernel:ipc-wake pid=0 result=-32",
                    "kernel:ipc-result pid=0 op=3 result=-32"])
            markers.extend(["user:log pid=0 hex=6f6b", "kernel:user-exit pid=0 status=0", "kernel:reaped pid=0"])
            if DOCUMENT_STATUSES[case]:
                markers.extend(["kernel:user-exit pid=1 status=0", "kernel:reaped pid=1"])
            markers.extend(["kernel:documents-clean", "kernel:ipc-clean free=50000",
                            f"kernel:ipc-tests-passed mode={DOCUMENT_CASES[case]}"])
        if case in RECOVERY_CASES:
            count = 8 if case in ("recovery-repeat", "recovery-limit") else 1
            markers = ["kernel:allocation-rollback boundaries=14 free=50000",
                       "kernel:client-elf-loaded entry=0x40000010",
                       "kernel:service-elf-loaded generation=0 entry=0x40000010",
                       "kernel:user-spaces-ready roots=0x100000,0x200000",
                       "kernel:recovery-live generation=0 free=49972",
                       "kernel:timer-ready", "kernel:user-enter pid=0 cpl=3",
                       "kernel:reconnect pid=0 result=-11", "kernel:reconnect pid=1 result=-13"]
            markers.extend(["kernel:launch-definitions-rejected count=4",
                            "kernel:launch-policy pid=0 frames=32 ticks=1024 document=true generation=0",
                            "kernel:launch-policy pid=1 frames=32 ticks=64 document=false generation=0"])
            markers.append("kernel:document-serve pid=0 result=-13")
            for pid, n in ((0, 1), (1, count + 1)):
                for operation in (3, 4):
                    for error in (-9, -13):
                        markers.extend([f"kernel:ipc-result pid={pid} op={operation} result={error}"] * n)
            for generation in range(count + (case == "recovery-limit")):
                stop = ("kernel:budget-stopped pid=1 ticks=64" if case == "recovery-budget" else
                        "kernel:user-exit pid=1 status=0" if case == "recovery-exit" else
                        "kernel:user-stopped pid=1 vector=6 error=0x0 address=0x0")
                markers.extend(["kernel:ipc-block pid=0", stop, "kernel:reaped pid=1",
                                f"kernel:service-reclaimed generation={generation} free=49986",
                                "kernel:ipc-wake pid=0 result=-32"])
                if generation == count:
                    markers.append("kernel:reconnect pid=0 result=-11")
                    continue
                markers.extend(["kernel:reconnect pid=0 result=-14", "kernel:reconnect pid=0 result=-22"])
                if case == "recovery-allocation":
                    markers.extend(["kernel:restart-allocation-rollback free=49986", "kernel:reconnect pid=0 result=-12"])
                markers.append(f"kernel:launch-policy pid=1 frames=32 ticks=64 document=false generation={generation + 1}")
                markers.extend([f"kernel:service-elf-loaded generation={generation + 1} entry=0x40000010",
                                f"kernel:recovery-live generation={generation + 1} free=49972",
                                "kernel:reconnect pid=0 result=24", "kernel:reconnect pid=1 result=-13",
                                "kernel:ipc-result pid=0 op=3 result=-9", "kernel:ipc-result pid=0 op=4 result=-9",
                                "kernel:document-response status=-9", "kernel:document-response status=-9", "kernel:document-response status=0"])
            markers.extend(["user:log pid=0 hex=6f6b", "kernel:user-exit pid=0 status=0", "kernel:reaped pid=0"])
            if case != "recovery-limit":
                markers.extend(["kernel:user-exit pid=1 status=0", "kernel:reaped pid=1"])
            markers.extend(["kernel:documents-clean", f"kernel:recovery-tests-passed generation={count}",
                            "kernel:ipc-clean free=50000", f"kernel:ipc-tests-passed mode={RECOVERY_CASES[case]}"])
        if case in ELF_CASES:
            markers = ["kernel:allocation-rollback boundaries=14 free=50000"]
            if case == "elf-reject":
                markers.extend(f"kernel:elf-rejected reason={reason} free=50000" for reason in
                               ("header", "dynamic", "interpreter", "permissions", "kernel-address", "overlap", "entry", "overflow", "truncated"))
            if case == "elf-rollback":
                markers.append("kernel:elf-rollback boundaries=14 free=50000")
            markers.extend(["kernel:elf-loaded pid=0 entry=0x40000010", "kernel:elf-loaded pid=1 entry=0x40000010",
                            "kernel:user-spaces-ready roots=0x100000,0x200000", "kernel:timer-ready",
                            "kernel:user-enter pid=0 cpl=3", "kernel:syscall-rejected pid=0 reason=number",
                            "kernel:user-yield pid=0", "kernel:syscall-rejected pid=1 reason=number", "kernel:user-yield pid=1"])
            faults = {"elf-fault": "vector=6 error=0x0 address=0x0", "elf-readonly": "vector=14 error=0x7 address=0x40000000",
                      "elf-noexecute": "vector=14 error=0x15 address=0x60000000"}
            markers.append(f"kernel:user-stopped pid=0 {faults[case]}" if case in faults else "kernel:user-exit pid=0 status=0")
            markers.extend(["kernel:reaped pid=0", "user:log pid=1 hex=6f6b", "kernel:user-exit pid=1 status=0",
                            "kernel:reaped pid=1", "kernel:elf-clean free=50000", f"kernel:elf-tests-passed mode={ELF_CASES[case]}"])
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
        if case in OPERATION_CASES:
            _, state, executions = OPERATION_CASES[case]
            states = ["Proposed", "Denied"] if state == "Denied" else ["Proposed", "Approved", "Interrupted"] if state == "Interrupted" else ["Proposed", "Approved", "Running", state]
            markers = ["kernel:allocation-rollback boundaries=14 free=50000", "kernel:user-spaces-ready", "kernel:timer-ready", "kernel:user-enter pid=0 cpl=3", "kernel:document-response status=-13", "kernel:document-response status=-38"]
            if state == "Unknown":
                markers.append("kernel:user-stopped pid=1 vector=6")
            markers.append("user:log pid=0 hex=6f6b")
            markers.extend(f"kernel:operation-event id=1 state={value} tick=1" for value in states)
            markers.extend([f"kernel:operation-result state={state} executions={executions}", "kernel:operation-clean free=50000"])
        return "\n".join(prefix + markers)

    def test_launch_policy_rejects_missing_or_escalated_evidence(self):
        case = "recovery-repeat"
        code = CASES[case][0]
        original = self.transcript(case)
        for old, new in [("kernel:launch-definitions-rejected count=4", ""),
                         ("frames=32 ticks=64 document=false generation=1", "frames=33 ticks=64 document=false generation=1"),
                         ("frames=32 ticks=64 document=false generation=1", "frames=32 ticks=64 document=true generation=1")]:
            self.assertNotEqual(verify_output(case, code, original.replace(old, new)), [])

    def test_operation_requires_approval_execution_count_journal_and_reclamation(self):
        case = "operation-complete"
        output = self.transcript(case)
        for old, new in [("state=Approved tick=1", "state=Running tick=1"),
                         ("executions=1", "executions=2"),
                         ("operation-clean free=50000", "operation-clean free=49999"),
                         ("kernel:document-response status=-38", "")]:
            self.assertTrue(verify_output(case, 53, output.replace(old, new)))
        case = "operation-unknown"
        self.assertTrue(verify_output(case, 53, self.transcript(case).replace("kernel:user-stopped pid=1 vector=6", "")))

    def test_operation_rejects_prefixed_counts_and_duplicate_results(self):
        output = self.transcript("operation-complete")
        for count in ("10", "11", "01"):
            self.assertTrue(verify_output("operation-complete", 53, output.replace("executions=1", f"executions={count}")))
        self.assertTrue(verify_output("operation-complete", 53, output + "\nkernel:operation-result state=Completed executions=1"))

    def test_deadlock_allows_either_process_to_wait_first(self):
        text = self.transcript("ipc-deadlock")
        reversed_order = text.replace("kernel:ipc-block pid=0", "kernel:ipc-block pid=1").replace("kernel:ipc-result pid=1 op=4 result=-35", "kernel:ipc-result pid=0 op=4 result=-35").replace("kernel:ipc-wake pid=0 result=2", "kernel:ipc-wake pid=1 result=2")
        self.assertEqual(verify_output("ipc-deadlock", 49, reversed_order), [])
        self.assertTrue(verify_output("ipc-deadlock", 49, reversed_order.replace("kernel:ipc-wake pid=1 result=2", "kernel:ipc-wake pid=0 result=2")))

    def test_accepts_each_expected_result(self):
        for case, (code, _) in CASES.items():
            if case in PERSISTENCE_CASES or case in OPERATOR_CASES or case in INFERENCE_CASES:
                continue
            with self.subTest(case=case):
                self.assertEqual(verify_output(case, code, self.transcript(case)), [])

    def test_documents_require_denial_replay_protection_and_reclamation(self):
        for case, marker in (("document-denied", "kernel:document-response status=-9"),
                             ("document-revoke", "kernel:documents-clean"),
                             ("document-range", "kernel:document-serve pid=1 result=-14"),
                             ("document-read", "kernel:document-serve pid=1 result=-11"),
                             ("document-service-fault", "kernel:ipc-wake pid=0 result=-32")):
            with self.subTest(case=case):
                self.assertTrue(verify_output(case, 49, self.transcript(case).replace(marker, "omitted", 1)))

    def test_recovery_rejects_missing_disconnect_old_grant_and_leaked_frames(self):
        for case, old, new in (
            ("recovery-fault", "kernel:ipc-wake pid=0 result=-32", "omitted"),
            ("recovery-repeat", "generation=4 free=49972", "generation=4 free=49971"),
            ("recovery-repeat", "generation=4 free=49972", "generation=3 free=49972"),
            ("recovery-fault", "kernel:document-response status=-9", "kernel:document-response status=0"),
            ("recovery-allocation", "kernel:restart-allocation-rollback free=49986", "kernel:restart-allocation-rollback free=49985"),
            ("recovery-budget", "kernel:budget-stopped pid=1 ticks=64", "kernel:budget-stopped pid=1 ticks=63")):
            with self.subTest(case=case, marker=old):
                self.assertTrue(verify_output(case, 49, self.transcript(case).replace(old, new, 1)))

    def test_recovery_requires_client_entry_and_role_denials(self):
        for marker in ("kernel:client-elf-loaded entry=0x40000010", "kernel:document-serve pid=0 result=-13",
                       "kernel:ipc-result pid=0 op=3 result=-13", "kernel:ipc-result pid=1 op=4 result=-9"):
            with self.subTest(marker=marker):
                self.assertTrue(verify_output("recovery-fault",49,self.transcript("recovery-fault").replace(marker,"omitted",1)))

    def test_recovery_requires_elf_load_for_each_generation(self):
        for before, after in (
            ("kernel:service-elf-loaded generation=0 entry=0x40000010", "omitted"),
            ("kernel:service-elf-loaded generation=1 entry=0x40000010", "omitted"),
            ("generation=1 entry=0x40000010", "generation=0 entry=0x40000010"),
            ("entry=0x40000010", "entry=0x40000000"),
        ):
            with self.subTest(before=before, after=after):
                output = self.transcript("recovery-fault").replace(before, after)
                self.assertTrue(verify_output("recovery-fault", 49, output))

    def test_recovery_cannot_resume_stopped_service_before_replacement(self):
        output = self.transcript("recovery-fault").replace("kernel:reaped pid=1", "kernel:reaped pid=1\nkernel:user-switch from=0 to=1", 1)
        self.assertTrue(verify_output("recovery-fault", 49, output))

    def test_elf_rejects_missing_validation_reclamation_and_entry(self):
        for case, old, new in (("elf-reject", "kernel:elf-rejected reason=overlap free=50000", "omitted"),
                               ("elf-run", "entry=0x40000010", "entry=0x40000000"),
                               ("elf-rollback", "kernel:elf-rollback boundaries=14 free=50000", "kernel:elf-rollback boundaries=14 free=49999"),
                               ("elf-fault", "kernel:reaped pid=0", "omitted")):
            with self.subTest(case=case):
                self.assertTrue(verify_output(case, 51, self.transcript(case).replace(old,new,1)))

    def test_elf_fault_requires_survivor_progress_and_no_resumption(self):
        output = self.transcript("elf-fault")
        self.assertTrue(verify_output("elf-fault",51,output + "\nkernel:user-trap pid=0 vector=128 cpl=3"))
        self.assertTrue(verify_output("elf-fault",51,output.replace("user:log pid=1 hex=6f6b", "omitted")))

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
