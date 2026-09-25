import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from sized_test import CASES, checksum, exercise, expected_pages, observation, record, verdict
from test_inference_test import identity


def transcript(case):
    shape = CASES[case]
    pages = expected_pages(shape)
    mode = 75 + list(CASES).index(case)
    lines = identity(case)
    lines[1] = f"kernel:sized-inference-elf-loaded entry=0x40000010 mode={mode}"
    return "\n".join(
        [
            "kernel:allocation-rollback boundaries=14 free=100",
            *lines,
            "kernel:arena-resize pid=1 request=1 result=-13 pages=0 limit=0 frames=14",
            "kernel:syscall-rejected pid=1 reason=range",
            f"kernel:arena-resize pid=0 request={pages} result=2415919104 pages={pages} limit=16 frames={15 + pages}",
            record(shape),
            "kernel:arena-resize pid=0 request=0 result=0 pages=0 limit=16 frames=15",
            "kernel:user-exit pid=0 status=0",
            "kernel:arena-reclaim pid=0 pages=0 frames=15",
            "kernel:reaped pid=0",
            "kernel:user-exit pid=1 status=0",
            "kernel:reaped pid=1",
            "kernel:operation-result state=Empty executions=0",
            "kernel:operation-clean free=100",
        ]
    )


class SizedEvidenceTests(unittest.TestCase):
    def test_known_arithmetic_and_all_shape_observations(self):
        self.assertEqual(checksum((1, 3, 2)), 7)
        self.assertEqual([expected_pages(s) for s in CASES.values()], [2, 2, 5, 6, 10, 11, 3, 8, 2, 5, 10, 13])
        for case in CASES:
            output = transcript(case)
            self.assertEqual(verdict(case, 53, output), [])
            self.assertEqual(observation(case, 53, output)["peak_arena_pages"], expected_pages(CASES[case]))

    def test_wrong_math_shape_quota_and_cleanup_are_rejected(self):
        case = "infer-size-11"
        output = transcript(case)
        for before, after in (
            (record(CASES[case]), record(CASES["infer-size-0"])),
            ("mode=86", "mode=75"),
            ("pages=13", "pages=12"),
            ("frames=28", "frames=27"),
            ("max-pages=16", "max-pages=17"),
            ("status=0", "status=1"),
            ("clean free=100", "clean free=99"),
            ("executions=0", "executions=1"),
            ("kernel:reaped pid=0", ""),
        ):
            with self.subTest(mutation=before):
                with self.assertRaises(ValueError):
                    observation(case, 53, output.replace(before, after))
        result = record(CASES[case])
        self.assertTrue(verdict(case, 53, output + "\n" + result))
        self.assertTrue(verdict(case, 53, output.replace(result, "") + "\n" + result))
        self.assertTrue(verdict(case, 0, output))
        self.assertTrue(verdict(case, 53, output + "\nkernel:persist-flushed state=Proposed"))

    def test_runner_rejects_a_modified_journal(self):
        case = "infer-size-0"

        def execute(command, timeout):
            drive = command[command.index("-drive") + 1]
            Path(drive.split("file=", 1)[1]).write_bytes(b"changed")
            return SimpleNamespace(stdout=transcript(case), returncode=53)

        with tempfile.TemporaryDirectory() as directory:
            _, _, errors = exercise([], case, directory, 1, execute)
            self.assertIn("sized inference changed the journal", errors)


if __name__ == "__main__":
    unittest.main()
