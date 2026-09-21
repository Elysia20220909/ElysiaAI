"""Trusted stdin console test. Each scenario reboots the same fresh journal read-only."""

import hashlib
import queue
import subprocess
import tempfile
import threading
import time
from pathlib import Path

from persistence_test import fresh_image


CASES = {
    "operator-approve": (b"approve 1\n", "Completed"),
    "operator-deny": (b"deny 1\n", "Denied"),
    "operator-invalid": (b"approve 1 extra\n", "Interrupted"),
    "operator-wrong-id": (b"approve 2\n", "Interrupted"),
    "operator-timeout": (None, "Interrupted"),
    "operator-replay": (b"approve 1\napprove 1\n", "Completed"),
}
PROMPT = "kernel:operator-prompt"


def verdict(state, code, output):
    errors = []
    expected = 53 if state == "Completed" else 57
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
    if output.count("kernel:operator-decision") != 1:
        errors.append("decision was not single-use")
    return errors


def exercise(command, case, case_dir, timeout, execute, verify_live, manual=False):
    directory = Path(tempfile.mkdtemp(prefix="operator-", dir=Path(case_dir).resolve()))
    disk = directory / "journal.raw"
    with disk.open("xb") as stream:
        stream.write(fresh_image())
    command = list(command) + [
        "-device",
        "isa-ide,id=journalide,iobase=0x1f0,iobase2=0x3f6,irq=14",
        "-drive",
        f"if=none,id=journal,format=raw,cache=writeback,file={disk.as_posix()}",
        "-device",
        "ide-hd,drive=journal,bus=journalide.0,unit=0",
    ]
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
                if PROMPT in output and not sent:
                    sent = True
                    if manual:
                        print(output, flush=True)
                        payload = None
                        threading.Thread(target=read_operator, daemon=True).start()
                    if payload is not None:
                        process.stdin.write(payload)
                        process.stdin.flush()
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
                        process.stdin.write(payload)
                        process.stdin.flush()
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
    errors = verdict(state, process.returncode, output)
    if not manual:
        reason = (
            "timeout"
            if case == "operator-timeout"
            else "invalid"
            if case in ("operator-invalid", "operator-wrong-id")
            else "input"
        )
        if f"kernel:operator-decision reason={reason}" not in output:
            errors.append("wrong decision reason")
    if state == "Completed":
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
