import unittest

from inference_test import CASES, arena_errors, identity_errors, proposal_errors, user_marker, verdict


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
        "kernel:agent-bound id=1 pid=0 context=1 tools=1 approval=always recovery=reclaim",
        f"kernel:inference-elf-loaded entry=0x40000010 input-count={count} x={x} y={y}",
        "kernel:launch-policy pid=0 frames=32 ticks=1024 document=true generation=0",
        "kernel:launch-policy pid=1 frames=32 ticks=64 document=false generation=0",
        "kernel:arena-policy pid=0 max-pages=16 frames=32",
        "kernel:user-enter pid=0 cpl=3",
    ]


def memory_steps(case):
    # Fixture observations are independent of the verdict's request accounting.
    shapes = {
        "infer-mem-grow": [(2, 2), (16, 16), (1, 1), (16, 16)],
        "infer-mem-limit": [(16, 16), (17, 16), (18446744073709551615, 16)],
        "infer-mem-release": [(16, 16), (1, 1), (16, 16), (0, 0)] * 8,
        "infer-mem-fault": [(16, 16)],
        "infer-mem-budget": [(16, 16)],
        "infer-mem-rollback": [(16, 16), (0, 0)],
        "infer-mem-guard": [(16, 16)],
        "infer-mem-nx": [(16, 16)],
        "infer-mem-released": [(16, 16), (0, 0)],
        "infer-fault": [(2, 2)],
        "infer-budget": [(2, 2)],
    }
    steps = shapes.get(case, [(2, 2), (0, 0)])
    lines = [
        "kernel:arena-resize pid=1 request=1 result=-13 pages=0 limit=0 frames=14",
        "kernel:syscall-rejected pid=1 reason=range",
    ]
    for request, pages in steps:
        result = -22 if request != pages else 2415919104 if pages else 0
        lines.append(f"kernel:arena-resize pid=0 request={request} result={result} pages={pages} limit=16 frames={pages + 15}")
    if case == "infer-mem-grow":
        lines += ["user:log pid=0 hex=5a5a", "kernel:syscall-rejected pid=0 reason=range"]
    return lines, steps[-1][1]


def terminal(case):
    if case in {"infer-budget", "infer-mem-budget"}:
        return "kernel:budget-stopped pid=0 ticks=1024"
    fault = {
        "infer-fault": "vector=6 error=0x0 address=0x0",
        "infer-mem-fault": "vector=6 error=0x0 address=0x0",
        "infer-mem-guard": "vector=14 error=0x4 address=0x90010000",
        "infer-mem-nx": "vector=14 error=0x15 address=0x90000000",
        "infer-mem-released": "vector=14 error=0x4 address=0x90000000",
    }.get(case)
    return f"kernel:user-stopped pid=0 {fault}" if fault else "kernel:user-exit pid=0 status=0"


def rejected_run(case):
    steps, pages = memory_steps(case)
    stop = terminal(case)
    before = ["kernel:allocation-rollback boundaries=14 free=100"]
    if case == "infer-mem-rollback":
        before += [
            "kernel:arena-construction-rollback boundaries=15 free=100",
            "kernel:arena-rollback boundaries=15 free=100",
        ]
    tail = []
    if "vector=" in stop:
        vector = 6 if "vector=6 " in stop else 14
        tail.append(f"kernel:user-trap pid=0 vector={vector} cpl=3")
    if "budget-stopped" in stop:
        tail += [f"kernel:preempt pid=0 ticks={i}" for i in range(1, 1025)]
    tail += [
        stop,
        f"kernel:arena-reclaim pid=0 pages={pages} frames={15 + pages}",
        "kernel:reaped pid=0",
        "kernel:user-exit pid=1 status=0",
        "kernel:reaped pid=1",
        "kernel:operation-result state=Empty executions=0",
        "kernel:operation-clean free=100",
    ]
    return "\n".join(before + identity(case) + steps + [user_marker(CASES[case])] + tail)


class InferenceVerdictTests(unittest.TestCase):
    def test_agent_binding_is_unique_exact_and_precedes_loading(self):
        lines = identity("infer-approve")
        binding = lines[0]
        self.assertEqual(identity_errors("infer-approve", "\n".join(lines)), [])
        for bad in (
            lines[1:], lines + [binding], lines[1:] + [binding],
            [binding.replace("context=1", "context=3")] + lines[1:],
            [binding.replace("approval=always", "approval=never")] + lines[1:],
        ):
            self.assertTrue(identity_errors("infer-approve", "\n".join(bad)))

    def test_input_prediction_and_plan_must_agree(self):
        for case, length in (("infer-approve", 16), ("infer-short", 8)):
            prediction = user_marker(f"infer:length{length}")
            plan = f"kernel:operator-plan id=1 caller=0 executor=1 version=1 target=256 offset=0 length={length} byte-budget=16 deadline-tick=1024"
            steps, _ = memory_steps(case)
            output = "\n".join(identity(case) + steps + [
                prediction, plan, "kernel:user-exit pid=0 status=0",
                "kernel:arena-reclaim pid=0 pages=0 frames=15", "kernel:reaped pid=0",
                "kernel:user-exit pid=1 status=0", "kernel:reaped pid=1",
            ])
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
            stop = terminal(case)
            output = rejected_run(case)
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

    def test_memory_authority_accounting_and_lifetime_cannot_be_faked(self):
        for case in CASES:
            output = rejected_run(case)
            self.assertEqual(arena_errors(case, output), [])
            for before, after in (
                ("max-pages=16", "max-pages=17"),
                ("frames=31", "frames=33"),
                ("result=-22 pages=16", "result=-22 pages=0"),
                ("result=-13", "result=2415919104"),
                ("kernel:arena-reclaim", "kernel:missing-reclaim"),
                ("kernel:syscall-rejected pid=1 reason=range", ""),
            ):
                if before in output:
                    with self.subTest(case=case, mutation=before):
                        self.assertTrue(arena_errors(case, output.replace(before, after)))
            step = next(line for line in output.splitlines() if line.startswith("kernel:arena-resize pid=0"))
            self.assertTrue(arena_errors(case, output.replace(step, "") + "\n" + step))
            self.assertTrue(arena_errors(case, output + "\n" + step))

    def test_rollback_and_mapping_faults_require_exact_evidence(self):
        case = "infer-mem-rollback"
        output = rejected_run(case)
        for before, after in (("boundaries=15", "boundaries=14"), ("free=100", "free=99")):
            self.assertTrue(verdict(case, 53, output.replace(before, after, 1)))
        for case in ("infer-mem-guard", "infer-mem-nx", "infer-mem-released"):
            output = rejected_run(case)
            for before, after in (("error=0x", "error=0x1"), ("address=0x900", "address=0x800"), ("vector=14", "vector=13")):
                self.assertTrue(verdict(case, 53, output.replace(before, after)))
        case = "infer-mem-budget"
        output = rejected_run(case).replace("kernel:preempt pid=0 ticks=50\n", "")
        self.assertTrue(verdict(case, 53, output))

    def test_service_denial_can_interleave_without_outliving_the_service(self):
        case = "infer-mem-grow"
        lines = rejected_run(case).splitlines()
        denial = next(line for line in lines if line.startswith("kernel:arena-resize pid=1 "))
        lines.remove(denial)
        positions = [i for i, line in enumerate(lines) if line.startswith("kernel:arena-resize pid=0 ")]
        positions += [lines.index("kernel:user-exit pid=1 status=0")]
        for index in positions:
            self.assertEqual(verdict(case, 53, "\n".join(lines[:index] + [denial] + lines[index:])), [])
        self.assertTrue(verdict(case, 53, "\n".join(lines + [denial])))


if __name__ == "__main__":
    unittest.main()
