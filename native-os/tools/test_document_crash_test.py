import sys
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

import document_crash_test as crash
import document_job_test as job
from test_document_agent_test import packet, transcript


class CrashTests(unittest.TestCase):
    def test_oracle_rejects_false_kill_wrong_boundary_and_repeated_writes(self):
        data = packet()
        for policy, (stages, report, _) in crash.CASES.items():
            lines = ["kernel:document-job-flushed state=Started sequence=1 agent=2"]
            writes = [13]
            if len(stages) >= 2:
                lines.extend([transcript(data), "kernel:document-job-flushed state=Completed sequence=2 agent=2"])
                writes.append(14)
            if len(stages) >= 3:
                lines.extend([job.PROMPT, "kernel:document-job-flushed state=SaveCommitted sequence=3 agent=2"])
                writes.append(15)
            if report:
                writes.append(17)
            if stages[-1] == 4:
                lines.append("kernel:document-job-flushed state=Saved sequence=4 agent=2")
                writes.append(16)
            lines.extend(crash.WRITE + str(lba) for lba in writes)
            lines.append(crash.READY + policy)
            run = crash.Run(123, 1, True, False, len(stages) >= 3, "\n".join(lines))
            self.assertEqual(crash.crash_errors(run, data, policy), [])
            for changed in (
                replace(run, killed_at_boundary=False),
                replace(run, timed_out=True),
                replace(run, returncode=63),
                replace(run, output=run.output.replace(crash.READY + policy, crash.READY + "wrong")),
                replace(run, output=run.output + "\n" + crash.WRITE + "17"),
                replace(run, approval_sent=not run.approval_sent),
            ):
                self.assertTrue(crash.crash_errors(changed, data, policy), (policy, changed))

    def test_same_bytes_do_not_hide_a_recovery_write_attempt(self):
        data = packet()
        output = "kernel:document-job-stopped reason=classification-unknown restored-authority=0"
        self.assertEqual(job.recovery_errors(63, output, "classification-unknown", (1,), data), [])
        self.assertTrue(
            job.recovery_errors(
                63,
                crash.WRITE + "17\n" + output,
                "classification-unknown",
                (1,),
                data,
            )
        )

    def test_child_kill_timeout_and_premature_exit_are_distinct(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name, source, boundary, killed, timed_out in (
                (
                    "ready",
                    f"print({crash.READY + 'crash-start'!r}, flush=True); import time; time.sleep(30)",
                    "crash-start",
                    True,
                    False,
                ),
                ("early", "print('early exit')", "crash-start", False, False),
                (
                    "wrong",
                    f"print({crash.READY + 'wrong'!r}, flush=True); import time; time.sleep(30)",
                    "crash-start",
                    False,
                    True,
                ),
            ):
                run = crash.run_child(
                    [sys.executable, "-u", "-c", source], root / (name + ".log"), 0.5, 1, boundary=boundary
                )
                self.assertEqual(run.killed_at_boundary, killed)
                self.assertEqual(run.timed_out, timed_out)
                self.assertFalse(run.approval_sent)


if __name__ == "__main__":
    unittest.main()
