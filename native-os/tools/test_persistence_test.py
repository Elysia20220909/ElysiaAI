import unittest
import zlib

from boot_test import verify_output
from persistence_test import fresh_image, recovery_errors


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
