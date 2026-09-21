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
