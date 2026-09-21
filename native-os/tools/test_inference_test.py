import unittest

from inference_test import CASES, identity_errors, proposal_errors, user_marker, verdict


def identity(case):
    x, y = (
        (4, 1)
        if case == "infer-short"
        else (32767, 4)
        if case == "infer-range"
        else (1, 1)
        if case == "infer-abstain"
        else (1, 4)
    )
    count = 3 if case == "infer-oversized" else 2
    return [
        f"kernel:inference-elf-loaded entry=0x40000010 input-count={count} x={x} y={y}",
        "kernel:launch-policy pid=0 frames=32 ticks=1024 document=true generation=0",
        "kernel:launch-policy pid=1 frames=32 ticks=64 document=false generation=0",
        "kernel:user-enter pid=0 cpl=3",
    ]


class InferenceVerdictTests(unittest.TestCase):
    def test_input_prediction_and_plan_must_agree(self):
        for case, length in (("infer-approve", 16), ("infer-short", 8)):
            prediction = user_marker(f"infer:length{length}")
            plan = f"kernel:operator-plan id=1 caller=0 executor=1 version=1 target=256 offset=0 length={length} byte-budget=16 deadline-tick=1024"
            output = "\n".join(identity(case) + [prediction, plan])
            self.assertEqual(proposal_errors(case, output), [])
            for before, after in (
                (f"length={length}", f"length={length ^ 24}"),
                ("byte-budget=16", "byte-budget=160"),
                ("executor=1", "executor=0"),
                ("target=256", "target=0"),
                ("ticks=1024", "ticks=2048"),
                ("cpl=3", "cpl=0"),
                (prediction, ""),
                (prediction, user_marker(f"infer:length{length}0")),
            ):
                self.assertTrue(proposal_errors(case, output.replace(before, after)))
            self.assertTrue(proposal_errors(case, output + "\n" + plan))
            for extra in (prediction, user_marker(f"infer:length{length ^ 24}")):
                self.assertTrue(proposal_errors(case, output + "\n" + extra))
            self.assertTrue(proposal_errors(case, output.replace(prediction, "") + "\n" + prediction))
            self.assertTrue(identity_errors(case, output.replace("input-count=2", "input-count=3")))

    def test_rejection_requires_expected_stop_and_full_cleanup(self):
        for case, marker in CASES.items():
            stop = (
                "kernel:budget-stopped pid=0 ticks=1024"
                if case == "infer-budget"
                else "kernel:user-stopped pid=0 vector=6 error=0x0 address=0x0"
                if case == "infer-fault"
                else "kernel:user-exit pid=0 status=0"
            )
            output = "\n".join(
                identity(case)
                + [
                    "kernel:allocation-rollback boundaries=8 free=100",
                    user_marker(marker),
                    "kernel:user-trap pid=0 vector=6 cpl=3" if case == "infer-fault" else "",
                    "\n".join(f"kernel:preempt pid=0 ticks={i}" for i in range(1, 1025))
                    if case == "infer-budget"
                    else "",
                    stop,
                    "kernel:reaped pid=0",
                    "kernel:user-exit pid=1 status=0",
                    "kernel:reaped pid=1",
                    "kernel:operation-result state=Empty executions=0",
                    "kernel:operation-clean free=100",
                ]
            )
            self.assertEqual(verdict(case, 53, output), [])
            for resumed in (
                "kernel:preempt pid=0 ticks=1025",
                "kernel:user-trap pid=0 vector=128 cpl=3",
                "kernel:user-switch from=1 to=0",
            ):
                self.assertTrue(verdict(case, 53, output.replace(stop, stop + "\n" + resumed)))
            self.assertTrue(verdict(case, 53, output.replace(stop, "") + "\n" + stop))
            self.assertTrue(verdict(case, 53, output + "\n" + stop))
            self.assertTrue(verdict(case, 55, output))
            for missing in (stop, user_marker(marker), "kernel:reaped pid=1"):
                self.assertTrue(verdict(case, 53, output.replace(missing, "")))
            for before, after in (("clean free=100", "clean free=99"), ("executions=0", "executions=01")):
                self.assertTrue(verdict(case, 53, output.replace(before, after)))
            for extra in ("kernel:operator-prompt", "kernel:persist-flushed state=Proposed", "failure:test", "panic"):
                self.assertTrue(verdict(case, 53, output + "\n" + extra))


if __name__ == "__main__":
    unittest.main()
