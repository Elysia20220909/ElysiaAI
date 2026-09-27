"""Independent whole-disk oracle for one classifier job and one approved save."""

import hashlib
import json
import os
import queue
import struct
import subprocess
import tempfile
import threading
import time
import zlib
from pathlib import Path
from types import SimpleNamespace

from document_agent_test import GOAL, inspect, verdict
from operator_test import send_input
from persistence_test import fresh_image
from qemu_test_utils import qemu_path


CRASH_POLICIES = ("crash-start", "crash-complete", "crash-save", "crash-report", "crash-saved")
POLICIES = ("off", "record", "publish", "cut-start", "cut-complete", "cut-save", "cut-report", *CRASH_POLICIES)
STAGES = {1: "Started", 2: "Completed", 3: "SaveCommitted", 4: "Saved", 5: "Denied", 6: "Interrupted"}
FIRST = 13 * 512
REPORT = 17 * 512
PROMPT = "kernel:document-save-prompt"


def record(data, elf, stage, sequence, previous):
    rows = inspect(data)
    if len(elf) != 32:
        raise ValueError("ELF identity size")
    b = bytearray(512)
    struct.pack_into("<8sHHIQ", b, 0, b"ELYDJB01", 1, stage, sequence, 2)
    b[24:56] = GOAL
    b[56:120] = data[48:112]
    b[120:152] = hashlib.sha256(data).digest()
    b[152:184] = elf
    struct.pack_into("<I", b, 184, previous)
    if stage != 1:
        struct.pack_into("<I", b, 188, 8)
        for i, (identifier, score, category) in enumerate(rows):
            struct.pack_into("<IiB", b, 192 + 16 * i, identifier, score, category)
    struct.pack_into("<H", b, 320, 1)
    struct.pack_into("<I", b, 324, 1024)
    struct.pack_into("<I", b, 508, zlib.crc32(b[:508]))
    return bytes(b)


def image(data, elf, stages, *, report=False):
    if tuple(stages) not in ((), (1,), (1, 2), (1, 2, 3), (1, 2, 3, 4), (1, 2, 5), (1, 2, 6)):
        raise ValueError("invalid job history")
    disk = fresh_image()
    previous = 0
    for i, stage in enumerate(stages):
        b = record(data, elf, stage, i + 1, previous)
        disk[FIRST + 512 * i : FIRST + 512 * (i + 1)] = b
        previous = int.from_bytes(b[508:], "little")
    if report:
        b = bytearray(record(data, elf, 2, 1, 0))
        b[:8] = b"ELYDRP01"
        b[508:] = zlib.crc32(b[:508]).to_bytes(4, "little")
        disk[REPORT : REPORT + 512] = b
    return bytes(disk)


def attach(command, disk):
    return list(command) + [
        "-device",
        "isa-ide,id=journalide,iobase=0x1f0,iobase2=0x3f6,irq=14",
        "-drive",
        f"if=none,id=journal,format=raw,cache=writeback,file={qemu_path(disk)}",
        "-device",
        "ide-hd,drive=journal,bus=journalide.0,unit=0",
    ]


def console(command, log, timeout, action, identifier):
    payloads = {
        "approve": f"approve {identifier}\n",
        "deny": f"deny {identifier}\n",
        "invalid": f"approve {identifier} extra\n",
        "wrong-id": f"approve {identifier ^ 1}\n",
        "replay": f"approve {identifier}\napprove {identifier}\n",
        "timeout": None,
        "manual": None,
    }
    payload = payloads[action]
    answers = queue.Queue()

    def read_operator():
        try:
            answers.put(input(f"approve {identifier} / deny {identifier}: ") + "\n")
        except EOFError:
            answers.put("invalid\n")

    started = time.monotonic()
    sent = False
    with log.open("wb") as stream:
        process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=stream,
            stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        try:
            while process.poll() is None:
                output = log.read_text(encoding="utf-8", errors="replace")
                if PROMPT in output and not sent:
                    sent = True
                    if action == "manual":
                        print(output, flush=True)
                        threading.Thread(target=read_operator, daemon=True).start()
                    if payload is not None:
                        try:
                            send_input(process.stdin, payload.encode("ascii"))
                        except BrokenPipeError:
                            pass  # A consumed first line may already have stopped the VM.
                if not answers.empty():
                    payload = answers.get_nowait()
                    try:
                        send_input(process.stdin, payload.encode("ascii"))
                    except (UnicodeError, BrokenPipeError):
                        pass
                if time.monotonic() - started > timeout:
                    raise subprocess.TimeoutExpired(command, timeout)
                time.sleep(0.02)
        finally:
            if process.poll() is None:
                process.kill()
            process.wait()
            try:
                process.stdin.close()
            except BrokenPipeError:
                pass
    return SimpleNamespace(returncode=process.returncode, stdout=log.read_text(encoding="utf-8", errors="replace"))


def flush_errors(output, stages, start=1):
    actual = [line for line in output.splitlines() if line.startswith("kernel:document-job-flushed")]
    expected = [
        f"kernel:document-job-flushed state={STAGES[s]} sequence={i} agent=2" for i, s in enumerate(stages, start)
    ]
    return [] if actual == expected else ["incorrect durable document transitions"]


def recovery_errors(code, output, reason, stages, data):
    errors = []
    if code != 63 or f"kernel:document-job-stopped reason={reason} restored-authority=0" not in output:
        errors.append("missing document recovery verdict")
    if any(
        x in output
        for x in (
            "kernel:user-enter",
            "kernel:agent-bound",
            PROMPT,
            "kernel:document-job-flushed",
            "kernel:document-write-attempt",
            "failure:",
            "panic",
        )
    ):
        errors.append("recovery launched, prompted, wrote or failed")
    expected = (
        []
        if len(stages) < 2
        else [f"kernel:document-result id={i} score={s} class={c} source=journal" for i, s, c in inspect(data)]
    )
    actual = [line for line in output.splitlines() if line.startswith("kernel:document-result")]
    if actual != expected:
        errors.append("recovered classification differs from durable result")
    return errors


def exercise(command, case_dir, timeout, execute, data, elf, policy, *, session=None):
    if policy in CRASH_POLICIES:
        if session is not None:
            raise ValueError("crash fixtures require a fresh dedicated disk")
        from document_crash_test import exercise as crash_exercise

        return crash_exercise(command, case_dir, timeout, data, elf, policy)
    if session is not None:
        return interactive(command, Path(session), timeout, execute, data, elf, policy)
    directory = Path(tempfile.mkdtemp(prefix="document-job-", dir=Path(case_dir).resolve()))
    disk = directory / "journal.raw"
    command = attach(command, disk)
    identifier = max(1, int.from_bytes(hashlib.sha256(data).digest()[:8], "little"))
    errors = []
    outputs = []
    runs = []

    def trial(label, before, expected, check, *, action=None, fail_write=None, stale=False):
        disk.write_bytes(before)
        actual_command = command
        if fail_write is not None:
            config = directory / f"{label}.conf"
            config.write_text(
                f'[inject-error]\nevent = "write_aio"\nerrno = "5"\nsector = "{fail_write}"\n', encoding="utf-8"
            )
            drive = (
                "if=none,id=journal,format=raw,cache=writeback,werror=report,file.driver=blkdebug,"
                f"file.config={qemu_path(config)},file.image.driver=file,file.image.filename={qemu_path(disk)}"
            )
            actual_command = [drive if p.startswith("if=none,id=journal,") else p for p in command]
        log = directory / f"{label}.log"
        if action is not None:
            result = console(actual_command, log, timeout, action, identifier)
        elif stale:
            result = subprocess.run(
                actual_command,
                input=f"approve {identifier}\n",
                text=True,
                encoding="utf-8",
                errors="replace",
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=timeout,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
        else:
            result = execute(actual_command, timeout=timeout)
        log.write_text(result.stdout, encoding="utf-8")
        after = disk.read_bytes()
        (directory / f"{label}.raw").write_bytes(after)
        found = check(result.returncode, result.stdout)
        if after != expected:
            found.append("whole disk differs from independent expected image")
        errors.extend(f"{label}: {e}" for e in found)
        outputs.append(f"runner:document-job {label}\n" + result.stdout)
        runs.append(
            {
                "label": label,
                "exit_code": result.returncode,
                "passed": not found,
                "errors": found,
                "serial_sha256": hashlib.sha256(log.read_bytes()).hexdigest(),
                "disk_sha256": hashlib.sha256(after).hexdigest(),
            }
        )
        (directory / "runs.json").write_text(json.dumps(runs, indent=2) + "\n", encoding="utf-8")
        return result.returncode, after

    def live(code, output, stages, expected_code):
        found = verdict(53, output, data, "valid") + flush_errors(output, stages)
        if code != expected_code:
            found.append("wrong document live exit")
        for before, after in (
            ("state=Started sequence=1", "kernel:agent-bound"),
            ("kernel:operation-clean", "state=Completed sequence=2"),
        ):
            if not 0 <= output.find(before) < output.find(after):
                found.append("job checkpoint outside verified lifetime")
        return found

    if policy == "record":
        code, saved = trial(
            "complete", image(data, elf, ()), image(data, elf, (1, 2)), lambda c, o: live(c, o, [1, 2], 53)
        )
        code, _ = trial(
            "reuse", saved, saved, lambda c, o: recovery_errors(c, o, "already-completed", [1, 2], data), stale=True
        )
        for label, offset in (
            ("goal", 24),
            ("model", 56),
            ("input", 88),
            ("packet", 120),
            ("elf", 152),
            ("result", 192),
            ("padding", 400),
        ):
            damaged = bytearray(saved)
            damaged[FIRST + 512 + offset] ^= 1
            # Recompute CRC: canonical binding/result validation must still reject it.
            damaged[FIRST + 1020 : FIRST + 1024] = zlib.crc32(damaged[FIRST + 512 : FIRST + 1020]).to_bytes(4, "little")
            code, _ = trial(
                label,
                bytes(damaged),
                bytes(damaged),
                lambda c, o: recovery_errors(c, o, "job-journal-corrupt", [], data),
            )
        for label, before, reason in (
            ("interrupted", image(data, elf, (1,)), "classification-unknown"),
            ("gap", saved[:FIRST] + bytes(512) + saved[FIRST + 512 :], "job-journal-corrupt"),
            ("unapproved-report", image(data, elf, (1, 2), report=True), "job-unapproved-report"),
        ):
            code, _ = trial(label, before, before, lambda c, o, r=reason: recovery_errors(c, o, r, [], data))
        for label, prefix, lba in (("start-write-failure", (), 13), ("complete-write-failure", (), 14)):
            expected = image(data, elf, () if lba == 13 else (1,))

            def failed(c, o, lba=lba):
                found = flush_errors(o, [] if lba == 13 else [1])
                if c != 63 or "reason=disk-status" not in o:
                    found.append("write failure was not terminal")
                if lba == 13 and "kernel:user-enter" in o:
                    found.append("launched before durable start")
                return found

            code, _ = trial(label, image(data, elf, prefix), expected, failed, fail_write=lba)
    elif policy == "publish":
        for action, stages in (
            ("approve", (1, 2, 3, 4)),
            ("replay", (1, 2, 3, 4)),
            ("deny", (1, 2, 5)),
            ("invalid", (1, 2, 6)),
            ("wrong-id", (1, 2, 6)),
            ("timeout", (1, 2, 6)),
        ):
            code, saved = trial(
                action,
                image(data, elf, ()),
                image(data, elf, stages, report=stages[-1] == 4),
                lambda c, o, s=stages: session_errors(
                    c, o, image(data, elf, ()), image(data, elf, s, report=s[-1] == 4), data, elf, "publish"
                ),
                action=action,
            )
            reason = "already-saved" if stages[-1] == 4 else "save-closed"
            code, _ = trial(
                action + "-reboot",
                saved,
                saved,
                lambda c, o, r=reason, s=stages: recovery_errors(c, o, r, s, data),
                stale=True,
            )

        # A completed job can be offered for a fresh approval without inference again.
        def resumed(c, o):
            return session_errors(
                c, o, image(data, elf, (1, 2)), image(data, elf, (1, 2, 3, 4), report=True), data, elf, "publish"
            )

        code, _ = trial(
            "resume-and-save",
            image(data, elf, (1, 2)),
            image(data, elf, (1, 2, 3, 4), report=True),
            resumed,
            action="approve",
        )
        for label, lba, stages, has_report in (
            ("commit-write-failure", 15, (1, 2), False),
            ("report-write-failure", 17, (1, 2, 3), False),
            ("saved-write-failure", 16, (1, 2, 3), True),
        ):
            expected = image(data, elf, stages, report=has_report)

            def failed(c, o, s=stages):
                found = flush_errors(o, list(s[2:]), 3)
                if c != 63 or "reason=disk-status" not in o or "kernel:user-enter" in o:
                    found.append("save write failure was not terminal")
                if PROMPT not in o or "kernel:document-save-result" in o:
                    found.append("failed save lacked approval or claimed completion")
                return found

            code, saved = trial(label, image(data, elf, (1, 2)), expected, failed, action="approve", fail_write=lba)
            if lba == 15:
                # No commit reached disk. A later boot still needs a fresh decision.
                code, _ = trial(
                    label + "-reboot", saved, image(data, elf, (1, 2, 3, 4), report=True), resumed, action="approve"
                )
            else:
                code, _ = trial(
                    label + "-reboot",
                    saved,
                    saved,
                    lambda c, o: recovery_errors(c, o, "save-unknown", (1, 2, 3), data),
                    stale=True,
                )
    else:
        stage_map = {"cut-start": (1,), "cut-complete": (1, 2), "cut-save": (1, 2, 3), "cut-report": (1, 2, 3)}
        stages = stage_map[policy]
        has_report = policy == "cut-report"

        def cut(c, o):
            found = flush_errors(o, list(stages))
            if c != 63 or f"reason={policy}" not in o:
                found.append("missing cut point")
            if policy == "cut-start":
                if "kernel:user-enter" in o:
                    found.append("cut-start launched a process")
            else:
                found.extend(verdict(53, o, data, "valid"))
            return found

        code, saved = trial(
            policy,
            image(data, elf, ()),
            image(data, elf, stages, report=has_report),
            cut,
            action="approve" if policy in ("cut-save", "cut-report") else None,
        )
        reason = {
            "cut-start": "classification-unknown",
            "cut-complete": "already-completed",
            "cut-save": "save-unknown",
            "cut-report": "save-unknown",
        }[policy]
        code, _ = trial("reboot", saved, saved, lambda c, o: recovery_errors(c, o, reason, stages, data), stale=True)
    return code, "\n".join(outputs), errors


def session_errors(code, output, before, after, data, elf, policy):
    """Interactive success requires the requested durable transition to finish."""
    allowed = [
        ((), False),
        ((1,), False),
        ((1, 2), False),
        ((1, 2, 3), False),
        ((1, 2, 3), True),
        ((1, 2, 3, 4), True),
        ((1, 2, 5), False),
        ((1, 2, 6), False),
    ]
    previous = next((s for s, r in allowed if before == image(data, elf, s, report=r)), None)
    current = next((s for s, r in allowed if after == image(data, elf, s, report=r)), None)
    if previous is None or current is None:
        return ["session journal differs from the expected job"]
    errors = []
    if previous and previous[-1] in (1, 3, 4, 5, 6):
        reason = {
            1: "classification-unknown",
            3: "save-unknown",
            4: "already-saved",
            5: "save-closed",
            6: "save-closed",
        }[previous[-1]]
        errors.extend(recovery_errors(code, output, reason, previous, data))
        if after != before:
            errors.append("terminal job changed disk")
        if previous[-1] in (1, 3):
            errors.append("job outcome is unknown; automatic retry is forbidden")
        return errors
    if not previous:
        errors.extend(verdict(53, output, data, "valid"))
        if not 0 <= output.find("state=Started sequence=1") < output.find("kernel:agent-bound"):
            errors.append("process launched before durable job start")
        if not 0 <= output.find("kernel:operation-clean") < output.find("state=Completed sequence=2"):
            errors.append("completion was not recorded after resource reclamation")
    elif "kernel:user-enter" in output:
        errors.append("completed job ran inference again")
    if policy == "record":
        if current != (1, 2) or code != (63 if previous else 53):
            errors.append("classification was not durably completed")
        errors.extend(flush_errors(output, [] if previous else [1, 2]))
        if previous:
            errors.extend(recovery_errors(code, output, "already-completed", previous, data))
    elif policy == "publish":
        if current not in ((1, 2, 3, 4), (1, 2, 5), (1, 2, 6)) or code != 65:
            errors.append("approved save or refusal was not durably completed")
        else:
            errors.extend(flush_errors(output, list(current[len(previous) :]), len(previous) + 1))
            stage = STAGES[current[-1]]
            writes = int(stage == "Saved")
            results = [line for line in output.splitlines() if line.startswith("kernel:document-save-result")]
            prefix = f"kernel:document-save-result state={stage} writes={writes} "
            reasons = ("invalid", "timeout", "serial-error", "timer-stalled") if current[-1] == 6 else ("input",)
            suffix = "records=4 " if current[-1] == 4 else ""
            if len(results) != 1 or results[0] not in [prefix + suffix + f"reason={r}" for r in reasons]:
                errors.append("missing final save outcome")
            prompt = output.find(PROMPT)
            terminal = output.find(f"state={STAGES[current[2]]} sequence=3")
            completed = output.find(
                "kernel:document-job-recovered state=Completed" if previous else "state=Completed sequence=2"
            )
            if not 0 <= completed < prompt < terminal:
                errors.append("approval was not between completed classification and save transition")
    else:
        errors.append("unsupported interactive policy")
    if "reason=disk-" in output or "failure:" in output or "panic" in output:
        errors.append("document task failed before durable completion")
    return errors


def interactive(command, session, timeout, execute, data, elf, policy):
    disk = session / "journal.raw"
    if disk.is_symlink() or (disk.exists() and (not disk.is_file() or disk.stat().st_nlink != 1)):
        raise ValueError("journal must be a regular session file")
    before = disk.read_bytes() if disk.exists() else image(data, elf, ())
    allowed = [
        ((), False),
        ((1,), False),
        ((1, 2), False),
        ((1, 2, 3), False),
        ((1, 2, 3), True),
        ((1, 2, 3, 4), True),
        ((1, 2, 5), False),
        ((1, 2, 6), False),
    ]
    previous = next(
        (stages for stages, published in allowed if before == image(data, elf, stages, report=published)), None
    )
    if previous is None:
        raise ValueError("session journal differs from this job; no execution permitted")
    if not disk.exists():
        with disk.open("xb") as stream:
            stream.write(before)
    command = attach(command, disk)
    descriptor, name = tempfile.mkstemp(prefix="boot-", suffix=".log", dir=session)
    os.close(descriptor)
    log = Path(name)
    identifier = max(1, int.from_bytes(hashlib.sha256(data).digest()[:8], "little"))
    result = (
        console(command, log, timeout, "manual", identifier)
        if policy == "publish"
        else execute(command, timeout=timeout)
    )
    log.write_text(result.stdout, encoding="utf-8")
    after = disk.read_bytes()
    errors = session_errors(result.returncode, result.stdout, before, after, data, elf, policy)
    print(result.stdout, flush=True)
    return result.returncode, result.stdout, errors
