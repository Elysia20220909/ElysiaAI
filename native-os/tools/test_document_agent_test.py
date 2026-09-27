import struct
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

import document_agent_test as doc


def packet():
    data = bytearray(doc.SIZE)
    struct.pack_into("<8sHHHH", data, 0, b"ELYDOC01", 1, 64, 8, 68)
    data[16:48] = doc.GOAL
    data[48:112] = bytes([7] * 64)
    struct.pack_into("<h", data, 128, 2)
    struct.pack_into("<i", data, 256, -255)
    for i in range(8):
        struct.pack_into("<I", data, 264 + i * 68, i + 1)
    data[268] = 255
    struct.pack_into("<I", data, 808, doc.checksum(data[:808]))
    return bytes(data)


def transcript(data, variant="valid"):
    return "\n".join(
        [
            "kernel:allocation-rollback boundaries=14 free=100",
            "kernel:agent-bound id=2 pid=0 context=0 tools=0 approval=always recovery=reclaim",
            f"kernel:document-agent-elf-loaded entry=0x40000010 bytes={len(data)}",
            "kernel:launch-policy pid=0 frames=32 ticks=1024 document=false generation=0",
            "kernel:launch-policy pid=1 frames=32 ticks=64 document=false generation=0",
            "kernel:arena-policy pid=0 max-pages=1 frames=32",
            "kernel:user-enter pid=0 cpl=3",
            "kernel:arena-resize pid=1 request=1 result=-13 pages=0 limit=0 frames=14",
            "kernel:syscall-rejected pid=1 reason=range",
            "kernel:arena-resize pid=0 request=1 result=2415919104 pages=1 limit=1 frames=16",
            *doc.records(data, variant),
            "kernel:arena-resize pid=0 request=0 result=0 pages=0 limit=1 frames=15",
            "kernel:user-exit pid=0 status=0",
            "kernel:arena-reclaim pid=0 pages=0 frames=15",
            "kernel:reaped pid=0",
            "kernel:user-exit pid=1 status=0",
            "kernel:reaped pid=1",
            "kernel:operation-result state=Empty executions=0",
            "kernel:operation-clean free=100",
        ]
    )


class DocumentAgentEvidenceTests(unittest.TestCase):
    def test_independent_math_and_corrupt_packets(self):
        data = packet()
        self.assertEqual(doc.inspect(data), [(1, 255, 0)] + [(i, -255, 1) for i in range(2, 9)])
        for variant in doc.VARIANTS:
            changed = doc.mutate(data, variant)
            if variant != "valid":
                with self.assertRaises(ValueError):
                    doc.inspect(changed)
            self.assertEqual(doc.verdict(53, transcript(changed, variant), changed, variant), [])
        for n in range(doc.SIZE):
            with self.assertRaises(ValueError):
                doc.inspect(data[:n])

    def test_missing_duplicate_wrong_or_late_results_fail(self):
        data = packet()
        output = transcript(data)
        record = doc.records(data, "valid")[0]
        for changed in (
            output.replace(record, ""),
            output + "\n" + record,
            output.replace(record, record[:-2] + "01"),
            output.replace(record, "") + "\n" + record,
        ):
            self.assertTrue(doc.verdict(53, changed, data, "valid"))
        self.assertTrue(doc.verdict(0, output, data, "valid"))
        for before, after in (
            ("document=false", "document=true"),
            ("ticks=1024", "ticks=2048"),
            ("context=0", "context=1"),
            ("pages=1", "pages=2"),
            ("clean free=100", "clean free=99"),
            ("executions=0", "executions=1"),
        ):
            self.assertTrue(doc.verdict(53, output.replace(before, after), data, "valid"))

    def test_rejection_cannot_leak_partial_results(self):
        data = doc.mutate(packet(), "input")
        output = transcript(data, "input")
        self.assertTrue(doc.verdict(53, output + "\n" + doc.records(packet(), "valid")[0], data, "input"))

    def test_runner_checks_journal_bytes(self):
        data = packet()

        def execute(command, timeout):
            drive = command[command.index("-drive") + 1]
            Path(drive.split("file=", 1)[1]).write_bytes(b"changed")
            return SimpleNamespace(stdout=transcript(data), returncode=53)

        with tempfile.TemporaryDirectory() as tmp:
            _, _, errors = doc.exercise([], tmp, 1, execute, data, "valid")
            self.assertIn("read-only classification changed the journal", errors)


if __name__ == "__main__":
    unittest.main()
