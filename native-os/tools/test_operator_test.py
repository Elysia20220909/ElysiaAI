import unittest

from operator_test import verdict


class OperatorVerdictTests(unittest.TestCase):
    def test_denied_requires_ordered_durable_evidence(self):
        output = "\n".join(
            [
                "kernel:persist-flushed state=Proposed",
                "kernel:operator-plan id=1",
                "kernel:operator-prompt",
                "kernel:persist-flushed state=Denied",
                "kernel:operator-decision reason=input state=Denied executions=0",
            ]
        )
        self.assertEqual(verdict("Denied", 57, output), [])
        self.assertTrue(verdict("Denied", 53, output))
        self.assertTrue(verdict("Denied", 57, output.replace("persist-flushed", "lost")))
        self.assertTrue(verdict("Denied", 57, output + "\nstate=Running"))
        self.assertTrue(verdict("Denied", 57, output + "\nkernel:operator-decision"))

    def test_async_requires_work_before_decision_and_complete_cleanup(self):
        output = "\n".join(
            [
                "kernel:allocation-rollback boundaries=8 free=100",
                "kernel:persist-flushed state=Proposed",
                "kernel:operator-plan id=1",
                "kernel:operator-prompt",
                "kernel:async-work pid=0 count=100000",
                "kernel:async-progress pid=0 tick=2",
                "kernel:persist-flushed state=Denied",
                "kernel:operator-decision reason=input state=Denied executions=0",
                "kernel:user-exit pid=0 status=0",
                "kernel:reaped pid=0",
                "kernel:user-exit pid=1 status=0",
                "kernel:reaped pid=1",
                "kernel:operation-result state=Denied executions=0",
                "kernel:operation-clean free=100",
            ]
        )
        self.assertEqual(verdict("Denied", 53, output, True), [])
        for missing in ("async-work", "async-progress", "operation-clean", "reaped pid=1"):
            self.assertTrue(verdict("Denied", 53, output.replace(missing, "lost"), True))
        self.assertTrue(verdict("Denied", 57, output, True))
        self.assertTrue(verdict("Denied", 53, output.replace("clean free=100", "clean free=99"), True))
        self.assertTrue(
            verdict("Denied", 53, output.replace("state=Denied executions=0", "state=Denied executions=1"), True)
        )
        early = output.replace("kernel:async-work pid=0 count=100000", "") + "\nkernel:async-work pid=0 count=100000"
        self.assertTrue(verdict("Denied", 53, early, True))
