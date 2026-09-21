import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import operator_test
import persistence_test
from qemu_test_utils import qemu_path


class QemuPathTests(unittest.TestCase):
    def assert_drive_path(self, command, root):
        drive = command[command.index("-drive") + 1]
        self.assertIn(f"file={qemu_path(Path(root))}/", drive)
        self.assertTrue(drive.endswith("/journal.raw"))

    def test_spaces_and_commas_remain_one_qemu_suboption(self):
        path = Path("folder, with space") / "journal.raw"
        self.assertEqual(qemu_path(path), path.resolve().as_posix().replace(",", ",,"))
        self.assertIn("folder,, with space/journal.raw", qemu_path(path))

    def test_persistence_runner_escapes_the_actual_disk_path(self):
        execute = Mock(return_value=subprocess.CompletedProcess([], 53, ""))
        with tempfile.TemporaryDirectory(prefix="qemu, space ") as directory:
            persistence_test.exercise(
                [], "persist-complete", directory, 1, execute, Mock(return_value=["stop after capturing command"])
            )
            self.assert_drive_path(execute.call_args.args[0], directory)
        self.assertEqual(execute.call_count, 1)

    def test_operator_runner_escapes_the_actual_disk_path(self):
        process = Mock(returncode=53)
        process.poll.return_value = 53
        with tempfile.TemporaryDirectory(prefix="qemu, space ") as directory:
            with (
                patch.object(operator_test.subprocess, "Popen", return_value=process) as popen,
                patch.object(operator_test.subprocess, "run", return_value=subprocess.CompletedProcess([], 55, "")),
            ):
                operator_test.exercise([], "async-approve", directory, 1, Mock(), Mock())
                self.assert_drive_path(popen.call_args.args[0], directory)
