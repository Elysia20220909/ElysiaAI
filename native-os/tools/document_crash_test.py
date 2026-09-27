"""Kill only our QEMU child at a durable boundary, then reboot the same disk."""

import hashlib
import json
import os
import subprocess
import tempfile
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import document_job_test as job
from document_agent_test import verdict
from operator_test import send_input


READY = "kernel:document-crash-ready point="
WRITE = "kernel:document-write-attempt lba="
CASES = {
    "crash-start": ((1,), False, "classification-unknown"),
    "crash-complete": ((1, 2), False, "already-completed"),
    "crash-save": ((1, 2, 3), False, "save-unknown"),
    "crash-report": ((1, 2, 3), True, "save-unknown"),
    "crash-saved": ((1, 2, 3, 4), True, "already-saved"),
}


@dataclass(frozen=True)
class Run:
    pid: int
    returncode: int
    killed_at_boundary: bool
    timed_out: bool
    approval_sent: bool
    output: str


def run_child(command, log, timeout, identifier, *, boundary=None, approve=False, stale=False):
    """A timeout/early exit is never evidence of a successful boundary kill."""
    killed = timed_out = sent = False
    started = time.monotonic()
    payload = f"approve {identifier}\n".encode("ascii")
    with log.open("xb") as stream:
        process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=stream,
            stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        try:
            if stale:
                send_input(process.stdin, payload)
                sent = True
            while process.poll() is None:
                lines = log.read_text(encoding="utf-8", errors="replace").splitlines()
                prompt = f"{job.PROMPT} id={identifier} target=journal:17 "
                if approve and not sent and any(line.startswith(prompt) for line in lines):
                    send_input(process.stdin, payload)
                    sent = True
                if boundary and READY + boundary in lines:
                    # The single guest CPU is parked with interrupts disabled.
                    if process.poll() is None:
                        process.kill()
                        killed = True
                    break
                if time.monotonic() - started >= timeout:
                    timed_out = True
                    break
                time.sleep(0.02)
        finally:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=10)
            try:
                process.stdin.close()
            except BrokenPipeError:
                pass
    return Run(
        process.pid,
        process.returncode,
        killed,
        timed_out,
        sent,
        log.read_text(encoding="utf-8", errors="replace"),
    )


def crash_errors(run, data, policy):
    stages, report, _ = CASES[policy]
    lines = run.output.splitlines()
    errors = job.flush_errors(run.output, stages)
    if not run.killed_at_boundary or run.timed_out or run.returncode in (0, 53, 63, 65):
        errors.append("QEMU was not forcibly stopped at the requested boundary")
    if [line for line in lines if line.startswith(READY)] != [READY + policy]:
        errors.append("wrong or repeated crash boundary")
    if not lines or lines[-1] != READY + policy:
        errors.append("guest continued beyond the crash boundary")
    expected_writes = [13]
    if len(stages) >= 2:
        expected_writes.append(14)
    if len(stages) >= 3:
        expected_writes.append(15)
    if report:
        expected_writes.append(17)
    if stages[-1] == 4:
        expected_writes.append(16)
    if [line for line in lines if line.startswith(WRITE)] != [WRITE + str(lba) for lba in expected_writes]:
        errors.append("unexpected document write attempts before crash")
    if len(stages) >= 2:
        errors.extend(verdict(53, run.output, data, "valid"))
    elif "kernel:user-enter" in run.output:
        errors.append("classification ran before the start boundary")
    requires_approval = len(stages) >= 3
    if run.approval_sent != requires_approval or (job.PROMPT in run.output) != requires_approval:
        errors.append("incorrect approval at crash boundary")
    if requires_approval and not (
        run.output.find("state=Completed sequence=2")
        < run.output.find(job.PROMPT)
        < run.output.find("state=SaveCommitted sequence=3")
    ):
        errors.append("save was not preceded by a fresh approval prompt")
    if any(marker in run.output for marker in ("failure:", "panic", "kernel:document-job-stopped")):
        errors.append("guest failed or shut down instead of parking")
    return errors


def exercise(command, case_dir, timeout, data, elf, policy):
    stages, has_report, reason = CASES[policy]
    directory = Path(tempfile.mkdtemp(prefix=policy + "-", dir=Path(case_dir).resolve()))
    disk = directory / "journal.raw"
    # Initialize once. Reboots must use the actual killed guest's disk unchanged.
    disk.write_bytes(job.image(data, elf, ()))
    command = job.attach(command, disk)
    identifier = max(1, int.from_bytes(hashlib.sha256(data).digest()[:8], "little"))
    expected = job.image(data, elf, stages, report=has_report)
    records, outputs, errors = [], [], []

    def save(label, run, before, after, found):
        (directory / f"{label}.raw").write_bytes(after)
        metadata = asdict(run)
        metadata.pop("output")
        records.append(
            {
                "label": label,
                **metadata,
                "passed": not found,
                "errors": found,
                "before_sha256": hashlib.sha256(before).hexdigest(),
                "after_sha256": hashlib.sha256(after).hexdigest(),
                "serial_sha256": hashlib.sha256((directory / f"{label}.log").read_bytes()).hexdigest(),
            }
        )
        (directory / "runs.json").write_text(
            json.dumps(
                {
                    "policy": policy,
                    "fixture_approval_only": True,
                    "runs": records,
                    "passed": len(records) == 3 and all(record["passed"] for record in records),
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        errors.extend(f"{label}: {error}" for error in found)
        outputs.append(f"runner:document-crash {label}\n" + run.output)

    before = disk.read_bytes()
    run = run_child(command, directory / "kill.log", timeout, identifier, boundary=policy, approve=len(stages) >= 3)
    after = disk.read_bytes()
    found = crash_errors(run, data, policy)
    if after != expected:
        found.append("killed disk differs from independent expected image")
    save("kill", run, before, after, found)
    if found:
        return 1, "\n".join(outputs), errors
    for index in (1, 2):
        before = disk.read_bytes()
        label = f"reboot-{index}"
        run = run_child(command, directory / f"{label}.log", timeout, identifier, stale=True)
        after = disk.read_bytes()
        found = job.recovery_errors(run.returncode, run.output, reason, stages, data)
        if run.timed_out or run.killed_at_boundary or READY in run.output:
            found.append("recovery did not terminate normally")
        if after != before or after != expected:
            found.append("recovery changed the killed guest's disk")
        save(label, run, before, after, found)
        if found:
            break
    return (1 if errors else 63), "\n".join(outputs), errors
