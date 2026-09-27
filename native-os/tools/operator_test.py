"""Trusted stdin console test. Each scenario reboots the same fresh journal read-only."""

import hashlib
import queue
import re
import subprocess
import tempfile
import threading
import time
from pathlib import Path

from inference_test import proposal_errors
from persistence_test import fresh_image
from qemu_test_utils import operation_result_errors, qemu_path


CASES = {
    "operator-approve": (b"approve 1\n", "Completed"),
    "operator-deny": (b"deny 1\n", "Denied"),
    "operator-invalid": (b"approve 1 extra\n", "Interrupted"),
    "operator-wrong-id": (b"approve 2\n", "Interrupted"),
    "operator-timeout": (None, "Interrupted"),
    "operator-replay": (b"approve 1\napprove 1\n", "Completed"),
}
CASES.update({name.replace("operator-", "async-"): value for name, value in list(CASES.items())})
CASES.update(
    {
        "infer-approve": (b"approve 1\n", "Completed"),
        "infer-quota-approve": (b"approve 1\n", "Completed"),
        "infer-short": (b"approve 1\n", "Completed"),
        "infer-deny": (b"deny 1\n", "Denied"),
        "infer-timeout": (None, "Interrupted"),
        "infer-invalid": (b"approve 1 extra\n", "Interrupted"),
        "infer-replay": (b"approve 1\napprove 1\n", "Completed"),
    }
)
PROMPT = "kernel:operator-prompt"


def verdict(state, code, output, asynchronous=False):
    errors = []
    expected = 53 if asynchronous or state == "Completed" else 57
    if code != expected:
        errors.append(f"operator exit {code}, expected {expected}")
    markers = ["kernel:persist-flushed state=Proposed", "kernel:operator-plan id=1", PROMPT]
    markers += (
        [
            "kernel:persist-flushed state=Approved",
            "kernel:operator-decision reason=input state=Approved executions=0",
            "kernel:persist-flushed state=Running",
            "kernel:persist-flushed state=Completed",
            "kernel:operation-result state=Completed executions=1",
        ]
        if state == "Completed"
        else [f"kernel:persist-flushed state={state}", f"state={state} executions=0"]
    )
    position = 0
    for marker in markers:
        found = output.find(marker, position)
        if found < 0:
            errors.append(f"missing ordered marker: {marker}")
            break
        position = found + len(marker)
    if "failure:" in output or "panic" in output:
        errors.append("guest failure")
    if state != "Completed" and ("state=Running" in output or "state=Completed" in output):
        errors.append("unapproved execution")
    decisions = [line for line in output.splitlines() if line.startswith("kernel:operator-decision")]
    decision_state = "Approved" if state == "Completed" else state
    if len(decisions) != 1 or not re.fullmatch(
        rf"kernel:operator-decision reason=\S+ state={decision_state} executions=0", decisions[0]
    ):
        errors.append("missing, duplicate, or incorrect operator decision")
    if state == "Completed" or asynchronous:
        errors.extend(operation_result_errors(output, state, int(state == "Completed")))
    if asynchronous:
        prompt = output.find(PROMPT)
        decision = output.find("kernel:operator-decision")
        for marker in ("kernel:async-work pid=0 count=", "kernel:async-progress pid=0 tick="):
            position = output.find(marker)
            if not prompt < position < decision:
                errors.append(f"missing work before decision: {marker}")
        baseline = re.search(r"kernel:allocation-rollback boundaries=\d+ free=(\d+)", output)
        clean = re.search(r"kernel:operation-clean free=(\d+)", output)
        if not baseline or not clean or baseline[1] != clean[1]:
            errors.append("process frames did not return to baseline")
        executions = int(state == "Completed")
        for marker in (
            f"kernel:operation-result state={state} executions={executions}",
            "kernel:operation-clean free=",
            "kernel:user-exit pid=0 status=0",
            "kernel:user-exit pid=1 status=0",
            "kernel:reaped pid=0",
            "kernel:reaped pid=1",
        ):
            if output.find(marker, decision) < 0:
                errors.append(f"missing normal cleanup: {marker}")
    return errors


def send_input(stream, payload):
    # Keep writes below the UART FIFO capacity; a host pipe is not a paced UART.
    for offset in range(0, len(payload), 8):
        stream.write(payload[offset : offset + 8])
        stream.flush()
        time.sleep(0.02)


def exercise(command, case, case_dir, timeout, execute, verify_live, manual=False):
    directory = Path(tempfile.mkdtemp(prefix="operator-", dir=Path(case_dir).resolve()))
    disk = directory / "journal.raw"
    with disk.open("xb") as stream:
        stream.write(fresh_image())
    command = list(command) + [
        "-device",
        "isa-ide,id=journalide,iobase=0x1f0,iobase2=0x3f6,irq=14",
        "-drive",
        f"if=none,id=journal,format=raw,cache=writeback,file={qemu_path(disk)}",
        "-device",
        "ide-hd,drive=journal,bus=journalide.0,unit=0",
    ]
    asynchronous = case.startswith(("async-", "infer-"))
    payload, state = CASES[case]
    log = directory / "first.log"
    sent = False
    answers = queue.Queue()

    def read_operator():
        try:
            answers.put((input("Type approve 1 or deny 1: ") + "\n").encode("ascii"))
        except (EOFError, UnicodeError):
            answers.put(b"invalid\n")

    if manual:
        state = "Interrupted"
    started = time.monotonic()
    with log.open("wb") as stream:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=stream, stderr=subprocess.STDOUT)
        try:
            while process.poll() is None:
                output = log.read_text(encoding="utf-8", errors="replace")
                if (
                    PROMPT in output
                    and not sent
                    and (not asynchronous or ("kernel:async-work" in output and "kernel:async-progress" in output))
                ):
                    sent = True
                    if manual:
                        print(output, flush=True)
                        payload = None
                        threading.Thread(target=read_operator, daemon=True).start()
                    if payload is not None:
                        send_input(process.stdin, payload)
                if manual and not answers.empty():
                    payload = answers.get_nowait()
                    state = (
                        "Completed"
                        if payload == b"approve 1\n"
                        else "Denied"
                        if payload == b"deny 1\n"
                        else "Interrupted"
                    )
                    try:
                        send_input(process.stdin, payload)
                    except BrokenPipeError:
                        state = "Interrupted"
                if time.monotonic() - started > timeout:
                    raise subprocess.TimeoutExpired(command, timeout)
                time.sleep(0.02)
        finally:
            if process.poll() is None:
                process.kill()
            process.wait()
            process.stdin.close()
    output = log.read_text(encoding="utf-8", errors="replace")
    errors = verdict(state, process.returncode, output, asynchronous)
    if case.startswith("infer-"):
        errors.extend(proposal_errors(case, output))
    if not manual:
        reason = (
            "timeout"
            if case.endswith("-timeout")
            else "invalid"
            if case.endswith(("-invalid", "-wrong-id"))
            else "input"
        )
        if f"kernel:operator-decision reason={reason}" not in output:
            errors.append("wrong decision reason")
    if state == "Completed" and not asynchronous:
        errors.extend(verify_live("operation-complete", process.returncode, output))
    before = hashlib.sha256(disk.read_bytes()).hexdigest()
    # Explicitly feed the old approval on reboot. No new prompt or authority may appear.
    second = subprocess.run(
        command,
        input="approve 1\n",
        text=True,
        encoding="utf-8",
        errors="replace",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
    )
    after = hashlib.sha256(disk.read_bytes()).hexdigest()
    (directory / "recovery.log").write_text(second.stdout, encoding="utf-8")
    if (
        second.returncode != 55
        or f"kernel:persist-recovered state={state}" not in second.stdout
        or "restored-authority=0 executions=0" not in second.stdout
    ):
        errors.append("recovery evidence missing")
    if before != after or any(
        marker in second.stdout
        for marker in (PROMPT, "kernel:user-enter", "kernel:persist-flushed", "failure:", "panic")
    ):
        errors.append("reboot reused authority or changed journal")
    return second.returncode, output + "\nrunner:operator-reboot\n" + second.stdout, errors
