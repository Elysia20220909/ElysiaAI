import subprocess
import tempfile
import unittest
import zlib
from unittest.mock import Mock

from boot_test import verify_output
from persistence_test import cut_errors, exercise, fresh_image, recovery_errors


class PersistenceTests(unittest.TestCase):
    def test_image_is_bounded_labeled_and_empty(self):
        image = fresh_image()
        self.assertEqual(len(image), 32768)
        self.assertEqual(image[:8], b"ELYSJNL1")
        self.assertEqual(int.from_bytes(image[508:512], "little"), zlib.crc32(image[:508]))
        self.assertFalse(any(image[512:]))

    def test_recovery_cannot_execute_restore_authority_or_write(self):
        line = "kernel:persist-recovered state=Completed records=4 restored-authority=0 executions=0"
        self.assertEqual(recovery_errors("persist-complete", 55, line, "same", "same"), [])
        for text in [
            line.replace("executions=0", "executions=1"),
            line + "\nkernel:user-enter pid=0",
            line + "\nkernel:persist-flushed",
            line.replace("Completed", "Unknown"),
        ]:
            self.assertTrue(recovery_errors("persist-complete", 55, text, "same", "same"))
        self.assertTrue(recovery_errors("persist-complete", 55, line, "before", "after"))
        self.assertTrue(verify_output("persist-complete", 55, line))

    def test_corrupt_and_full_need_explicit_evidence(self):
        self.assertEqual(
            recovery_errors("persist-corrupt", 55, "kernel:persist-rejected reason=journal-corrupt", "x", "x"), []
        )
        self.assertTrue(
            recovery_errors(
                "persist-full",
                55,
                "kernel:persist-recovered state=Completed records=8 restored-authority=0 executions=0",
                "x",
                "x",
            )
        )

    def test_cut_cannot_hide_guest_failure_or_continue_recovery(self):
        output = "\n".join(
            [
                "kernel:persist-flushed state=Proposed sequence=1",
                "kernel:persist-flushed state=Approved sequence=2",
                "kernel:persist-cut state=Approved",
                "kernel:panic unexpected fault",
            ]
        )
        execute = Mock(
            side_effect=[
                subprocess.TimeoutExpired("qemu", 10, output=output.encode()),
                subprocess.CompletedProcess(
                    "qemu", 55, "kernel:persist-recovered state=Interrupted records=2 restored-authority=0 executions=0"
                ),
            ]
        )
        with tempfile.TemporaryDirectory() as directory:
            _, _, errors = exercise([], "persist-interrupted", directory, 45, execute, Mock())
        self.assertTrue(errors)
        self.assertEqual(execute.call_count, 1)

    def test_cut_requires_the_exact_durable_prefix_and_single_checkpoint(self):
        for case, states, cut in [
            ("persist-interrupted", ["Proposed", "Approved"], "Approved"),
            ("persist-unknown", ["Proposed", "Approved", "Running"], "Running"),
            ("persist-torn", ["Proposed"], "Approved"),
        ]:
            lines = [f"kernel:persist-flushed state={state} sequence={i}" for i, state in enumerate(states, 1)]
            lines.append(f"kernel:persist-cut state={cut}")
            output = "\n".join(lines)
            self.assertEqual(cut_errors(case, output), [])
            for bad in [
                "\n".join(lines[1:]),
                output + "\n" + lines[-1],
                output.replace(f"cut state={cut}", "cut state=Proposed"),
                output + "\nfailure:unexpected",
                output + "\nkernel:panic",
            ]:
                self.assertTrue(cut_errors(case, bad))
