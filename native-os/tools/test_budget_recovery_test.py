import struct
import tempfile
import unittest
import zlib
from pathlib import Path
from types import SimpleNamespace

from budget_recovery_test import (
    END,
    FIRST,
    damaged_images,
    exercise,
    flush_errors,
    image,
    running_errors,
    stopped_errors,
)
from test_sized_test import transcript


def live_output():
    return "\n".join(
        [
            "kernel:agent-budget-flushed state=Replanned sequence=2 agent=1",
            "kernel:agent-budget-flushed state=LaunchCommitted sequence=3 agent=1",
            "kernel:agent-budget-retry generation=1 pages=2 authority=fresh approval=always",
            "kernel:arena-budget-accepted mode=75 pages=2 metric=native-arena-pages",
            transcript("infer-size-0").replace("max-pages=16", "max-pages=2").replace("limit=16", "limit=2"),
            "kernel:agent-budget-flushed state=Completed sequence=4 agent=1",
        ]
    )


class BudgetRecoveryEvidenceTests(unittest.TestCase):
    def test_whole_image_contract_preserves_operation_and_unused_sectors(self):
        empty = image(0, bytes(32))
        for count in range(5):
            data = image(count, bytes(32))
            self.assertEqual(len(data), 64 * 512)
            self.assertEqual(data[:FIRST], empty[:FIRST])
            self.assertEqual(data[END:], empty[END:])
            self.assertEqual(data[FIRST + count * 512 : END], bytes((4 - count) * 512))
            previous = 0
            for i in range(count):
                record = data[FIRST + i * 512 : FIRST + (i + 1) * 512]
                self.assertEqual(struct.unpack_from("<I", record, 104)[0], previous)
                previous = zlib.crc32(record[:508])
                self.assertEqual(struct.unpack_from("<I", record, 508)[0], previous)
        for count, elf in [(5, bytes(32)), (1, b"short")]:
            with self.assertRaises(ValueError):
                image(count, elf)
        self.assertEqual(len(list(damaged_images(bytes(32)))), 10)

    def test_stopped_agent_cannot_hide_authority_or_writes(self):
        marker = "kernel:agent-budget-stopped reason=launch-unknown restored-authority=0"
        self.assertEqual(stopped_errors(61, marker, "launch-unknown"), [])
        self.assertTrue(stopped_errors(53, marker, "launch-unknown"))
        self.assertTrue(stopped_errors(61, marker + "\n" + marker, "launch-unknown"))
        for extra in ["kernel:agent-bound", "kernel:user-enter", "kernel:persist-flushed", "user:log", "panic"]:
            self.assertTrue(stopped_errors(61, marker + "\n" + extra, "launch-unknown"))
        self.assertTrue(flush_errors("kernel:agent-budget-flushed state=Completed sequence=4 agent=1", []))

    def test_durable_reservation_must_precede_authority_and_completion_must_follow_cleanup(self):
        output = live_output()
        self.assertEqual(running_errors(53, output), [])
        self.assertEqual(flush_errors(output, [1, 2, 3]), [])
        committed = "kernel:agent-budget-flushed state=LaunchCommitted sequence=3 agent=1"
        completed = "kernel:agent-budget-flushed state=Completed sequence=4 agent=1"
        for bad in [
            output.replace(committed, ""),
            output.replace(committed, "") + "\n" + committed,
            completed + "\n" + output.replace(completed, ""),
            output + "\n" + completed,
            output.replace("pages=2 authority=fresh", "pages=16 authority=fresh"),
            output.replace("executions=0", "executions=1"),
            output.replace("free=100", "free=99", 1),
        ]:
            self.assertTrue(running_errors(53, bad))

    def test_runner_rejects_writes_outside_the_agent_bank(self):
        with tempfile.TemporaryDirectory() as directory:

            def execute(command, timeout):
                disk = next(Path(directory).glob("agent-budget-*/journal.raw"))
                data = bytearray(image(1, bytes(32)))
                data[512] ^= 1
                disk.write_bytes(data)
                return SimpleNamespace(
                    returncode=61,
                    stdout="\n".join(
                        [
                            "kernel:agent-budget-flushed state=Rejected sequence=1 agent=1",
                            "kernel:agent-budget-stopped reason=retry-pending restored-authority=0",
                        ]
                    ),
                )

            _, _, errors = exercise([], directory, 1, execute, "retry", bytes(32))
            self.assertEqual(len(errors), 1)
            self.assertIn("disk differs", errors[0])


if __name__ == "__main__":
    unittest.main()
