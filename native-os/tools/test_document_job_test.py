import contextlib
import hashlib
import io
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import document_job_test as job
import document_task
from test_document_agent_test import packet, transcript


def live_log(data, stages):
    output = "kernel:document-job-flushed state=Started sequence=1 agent=2\n" + transcript(data)
    output += "\nkernel:document-job-flushed state=Completed sequence=2 agent=2"
    if len(stages) > 2:
        output += "\n" + job.PROMPT + " id=1 target=journal:17"
        for i, stage in enumerate(stages[2:], 3):
            output += f"\nkernel:document-job-flushed state={job.STAGES[stage]} sequence={i} agent=2"
        state = job.STAGES[stages[-1]]
        suffix = "records=4 " if state == "Saved" else ""
        reason = "invalid" if state == "Interrupted" else "input"
        output += f"\nkernel:document-save-result state={state} writes={int(state == 'Saved')} {suffix}reason={reason}"
    return output


class DocumentJobTests(unittest.TestCase):
    def test_exact_durable_transitions_and_false_success_controls(self):
        data = packet()
        elf = bytes([3] * 32)
        fresh = job.image(data, elf, ())
        output = live_log(data, (1, 2))
        completed = job.image(data, elf, (1, 2))
        self.assertEqual(job.session_errors(53, output, fresh, completed, data, elf, "record"), [])
        failed = output.replace(
            "kernel:document-job-flushed state=Completed sequence=2 agent=2",
            "kernel:document-job-stopped reason=disk-status restored-authority=0",
        )
        self.assertTrue(job.session_errors(63, failed, fresh, job.image(data, elf, (1,)), data, elf, "record"))
        for stages in ((1, 2, 3, 4), (1, 2, 5), (1, 2, 6)):
            after = job.image(data, elf, stages, report=stages[-1] == 4)
            output = live_log(data, stages)
            self.assertEqual(job.session_errors(65, output, fresh, after, data, elf, "publish"), [])
            self.assertTrue(job.session_errors(63, output, fresh, after, data, elf, "publish"))
            self.assertTrue(
                job.session_errors(65, output.replace(job.PROMPT, "missing"), fresh, after, data, elf, "publish")
            )
            premature = job.PROMPT + "\n" + output.replace(job.PROMPT, "missing")
            self.assertTrue(job.session_errors(65, premature, fresh, after, data, elf, "publish"))
            reason = "reason=input" if stages[-1] == 6 else "reason=timeout"
            changed = output.rsplit("reason=", 1)[0] + reason
            self.assertTrue(job.session_errors(65, changed, fresh, after, data, elf, "publish"))
        for stages, report in (((1, 2), False), ((1, 2, 3), False), ((1, 2, 3), True)):
            self.assertTrue(
                job.session_errors(
                    63,
                    live_log(data, (1, 2)) + "\nreason=disk-status",
                    fresh,
                    job.image(data, elf, stages, report=report),
                    data,
                    elf,
                    "publish",
                )
            )

    def test_recovery_must_not_recompute_or_rewrite(self):
        data = packet()
        elf = bytes([3] * 32)
        before = job.image(data, elf, (1, 2, 3, 4), report=True)
        rows = "\n".join(
            f"kernel:document-result id={i} score={s} class={c} source=journal" for i, s, c in job.inspect(data)
        )
        output = rows + "\nkernel:document-job-stopped reason=already-saved restored-authority=0"
        self.assertEqual(job.session_errors(63, output, before, before, data, elf, "publish"), [])
        for extra in ("kernel:user-enter", job.PROMPT, "kernel:document-job-flushed"):
            self.assertTrue(job.session_errors(63, output + "\n" + extra, before, before, data, elf, "publish"))
        damaged = bytearray(before)
        damaged[job.REPORT + 200] ^= 1
        self.assertTrue(job.session_errors(63, output, before, bytes(damaged), data, elf, "publish"))

    def test_unknown_request_creates_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = SimpleNamespace(
                request="資料を消去して", experiment=Path(tmp) / "missing", session=Path(tmp) / "session", resume=False
            )
            with patch.object(document_task, "verify_experiment") as verify, self.assertRaises(ValueError):
                document_task.prepare_session(args)
            verify.assert_not_called()
            self.assertFalse(args.session.exists())

    def test_session_binds_goal_input_and_validated_snapshot(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            experiment = root / "experiment"
            experiment.mkdir()
            data = packet()
            (experiment / "document-bundle.bin").write_bytes(data)
            report = {
                "labels_in_guest_packet": False,
                "model_sha256": "fixed",
                "bundle_sha256": hashlib.sha256(data).hexdigest(),
                "evaluation": [{}] * 8,
            }
            args = SimpleNamespace(
                request="カーネル開発の資料を探して", experiment=experiment, session=root / "session", resume=False
            )
            with (
                patch.object(document_task, "verify_experiment", return_value=report),
                contextlib.redirect_stdout(io.StringIO()),
            ):
                document_task.prepare_session(args)
                args.resume = True
                document_task.prepare_session(args)
                (args.session / "document-bundle.bin").write_bytes(b"changed")
                with self.assertRaises(ValueError):
                    document_task.prepare_session(args)


if __name__ == "__main__":
    unittest.main()
