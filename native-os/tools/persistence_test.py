"""Two-boot, fresh-file-only persistence tests. No user-selected block device paths."""

import hashlib
import subprocess
import tempfile
import zlib
from pathlib import Path


CASES = {
    "persist-complete": "Completed",
    "persist-interrupted": "Interrupted",
    "persist-unknown": "Unknown",
    "persist-torn": "journal-corrupt",
    "persist-corrupt": "journal-corrupt",
    "persist-truncated": "disk-size",
    "persist-full": "Completed",
}


def fresh_image():
    data = bytearray(64 * 512)
    data[:8] = b"ELYSJNL1"
    data[8:12] = (64).to_bytes(4, "little")
    data[12:16] = (8).to_bytes(4, "little")
    data[508:512] = zlib.crc32(data[:508]).to_bytes(4, "little")
    return data


def damage(case, data):
    data = bytearray(data)
    if case == "persist-corrupt":
        data[512 + 88] ^= 1
    elif case == "persist-truncated":
        data = data[: 512 * 3 + 128]
    elif case == "persist-full":
        previous = 0
        for slot in range(8):
            record = bytearray(data[512 * (slot % 4 + 1) : 512 * (slot % 4 + 2)])
            record[8:16] = (slot + 1).to_bytes(8, "little")
            record[32:40] = (slot // 4 + 1).to_bytes(8, "little")
            record[104:108] = previous.to_bytes(4, "little")
            previous = zlib.crc32(record[:508])
            record[508:] = previous.to_bytes(4, "little")
            data[512 * (slot + 1) : 512 * (slot + 2)] = record
    return data


def recovery_errors(case, code, output, before, after):
    errors = []
    if code != 55:
        errors.append(f"recovery exit {code}, expected 55")
    expected = CASES[case]
    marker = (
        f"kernel:persist-rejected reason={expected}"
        if expected in ("journal-corrupt", "disk-size")
        else f"kernel:persist-recovered state={expected}"
    )
    if marker not in output:
        errors.append("missing recovery verdict")
    if expected not in ("journal-corrupt", "disk-size") and "restored-authority=0 executions=0" not in output:
        errors.append("missing non-execution evidence")
    if any(
        x in output
        for x in ("kernel:user-enter", "kernel:persist-empty", "kernel:persist-flushed", "failure:", "panic")
    ):
        errors.append("recovery executed or modified state")
    if before != after:
        errors.append("recovery changed disk bytes")
    if case == "persist-full" and "kernel:persist-full refused-before-write" not in output:
        errors.append("missing full journal rejection")
    return errors


def exercise(command, case, case_dir, timeout, execute, verify_live):
    root = Path(case_dir).resolve()
    directory = Path(tempfile.mkdtemp(prefix="journal-", dir=root))
    disk = directory / "journal.raw"
    with disk.open("xb") as f:
        f.write(fresh_image())
    command = list(command) + [
        "-device",
        "isa-ide,id=journalide,iobase=0x1f0,iobase2=0x3f6,irq=14",
        "-drive",
        f"if=none,id=journal,format=raw,cache=writeback,file={disk.as_posix()}",
        "-device",
        "ide-hd,drive=journal,bus=journalide.0,unit=0",
    ]
    cut = case in ("persist-interrupted", "persist-unknown", "persist-torn")
    errors = []
    killed = False
    try:
        first = execute(command, timeout=min(timeout, 10) if cut else timeout)
        first_output = first.stdout
        if cut:
            errors.append("cut fixture did not require host termination")
        else:
            errors.extend(verify_live("operation-complete", first.returncode, first_output))
    except subprocess.TimeoutExpired as exc:
        first_output = exc.stdout or b""
        if isinstance(first_output, bytes):
            first_output = first_output.decode("utf-8", "replace")
        killed = True
        if not cut or "kernel:persist-cut state=" not in first_output:
            errors.append("timeout without expected cut checkpoint")
    (directory / "first.log").write_text(first_output, encoding="utf-8")
    if errors:
        return 1, first_output, errors
    if not cut:
        expected = ["Proposed", "Approved", "Running", "Completed"]
        position = 0
        for state in expected:
            found = first_output.find(f"kernel:persist-flushed state={state}", position)
            if found < 0:
                errors.append("missing durable transition")
                break
            position = found + 1
    data = damage(case, disk.read_bytes())
    if case in ("persist-corrupt", "persist-truncated", "persist-full"):
        disk.write_bytes(data)
    before = hashlib.sha256(disk.read_bytes()).hexdigest()
    second = execute(command, timeout=timeout)
    after = hashlib.sha256(disk.read_bytes()).hexdigest()
    (directory / "recovery.log").write_text(second.stdout, encoding="utf-8")
    errors.extend(recovery_errors(case, second.returncode, second.stdout, before, after))
    output = first_output + f"\nrunner:restart killed={int(killed)}\n" + second.stdout
    return second.returncode, output, errors
