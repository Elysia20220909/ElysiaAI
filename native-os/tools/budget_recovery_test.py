"""Fresh-disk Agent budget retry fixtures, with independent whole-image verification."""

import hashlib
import json
import struct
import tempfile
import zlib
from pathlib import Path

from persistence_test import fresh_image
from qemu_test_utils import qemu_path
from sized_test import verdict


POLICIES = ("off", "retry", "cut-replan", "cut-launch")
STAGES = ("Rejected", "Replanned", "LaunchCommitted", "Completed")
FIRST = 9 * 512
END = 13 * 512


def image(count, elf):
    """Independent on-disk contract for mode 75, 1-page request, 2-page minimum."""
    if count not in range(5) or len(elf) != 32:
        raise ValueError("invalid retry image identity or prefix")
    data = fresh_image()
    previous = 0
    for i in range(count):
        record = bytearray(512)
        struct.pack_into("<8sQQ", record, 0, b"ELYBUD01", i + 1, 1)
        record[24:56] = b"elysia:bounded-document-read:v01"
        record[56:88] = elf
        struct.pack_into("<IHHH", record, 88, 75, 1, 2, 16)
        struct.pack_into("<IIQI", record, 100, i + 1, previous, 1024, int(i != 0))
        struct.pack_into("<HHH", record, 120, 1, 128, 8)
        struct.pack_into("<HHH", record, 128, 1, 1, 1)  # metric, reason, layout version
        previous = zlib.crc32(record[:508])
        struct.pack_into("<I", record, 508, previous)
        data[FIRST + i * 512 : FIRST + (i + 1) * 512] = record
    return bytes(data)


def flush_errors(output, indices):
    expected = [f"kernel:agent-budget-flushed state={STAGES[i]} sequence={i + 1} agent=1" for i in indices]
    actual = [line for line in output.splitlines() if line.startswith("kernel:agent-budget-flushed")]
    return [] if actual == expected else ["wrong durable Agent transition sequence"]


def stopped_errors(code, output, reason):
    marker = f"kernel:agent-budget-stopped reason={reason} restored-authority=0"
    stops = [line for line in output.splitlines() if line.startswith("kernel:agent-budget-stopped")]
    errors = [] if code == 61 and stops == [marker] else ["wrong Agent stop verdict"]
    for forbidden in (
        "kernel:agent-bound",
        "kernel:user-",
        "user:log",
        "kernel:arena-resize",
        "kernel:arena-budget-accepted",
        "kernel:persist-",
        "kernel:operation-",
        "kernel:agent-budget-retry",
        "failure:",
        "panic",
    ):
        if forbidden in output:
            errors.append(f"side effect at stopped Agent boundary: {forbidden}")
    return errors


def running_errors(code, output):
    errors = verdict("infer-size-0", code, output, arena_limit=2, require_budget=True)
    markers = (
        "kernel:agent-budget-flushed state=LaunchCommitted sequence=3 agent=1",
        "kernel:agent-budget-retry generation=1 pages=2 authority=fresh approval=always",
        "kernel:agent-bound id=1 pid=0 context=1 tools=1 approval=always recovery=reclaim",
        "kernel:operation-clean free=",
        "kernel:agent-budget-flushed state=Completed sequence=4 agent=1",
    )
    positions = [output.find(marker) for marker in markers]
    if any(output.count(marker) != 1 for marker in markers) or positions != sorted(positions):
        errors.append("launch was not durably reserved before authority, or completion preceded reclamation")
    if "kernel:agent-budget-stopped" in output:
        errors.append("running trial also reported a stop")
    return errors


def damaged_images(elf):
    """Replayed valid prefixes plus corrupt/foreign journal bytes are never authority."""
    base = image(1, elf)
    for name, offset, rechecksum in (
        ("crc", FIRST + 508, False),
        ("goal", FIRST + 24, True),
        ("elf", FIRST + 56, True),
        ("shape", FIRST + 88, True),
        ("ceiling", FIRST + 96, True),
        ("reserved", FIRST + 140, True),
    ):
        data = bytearray(base)
        data[offset] ^= 1
        if rechecksum:
            struct.pack_into("<I", data, FIRST + 508, zlib.crc32(data[FIRST : FIRST + 508]))
        yield name, bytes(data), "agent-journal-corrupt"
    torn = bytearray(base)
    torn[FIRST + 256 : FIRST + 512] = bytes(256)
    yield "torn", bytes(torn), "agent-journal-corrupt"
    gap = bytearray(image(2, elf))
    gap[FIRST : FIRST + 512] = bytes(512)
    yield "gap", bytes(gap), "agent-journal-corrupt"
    duplicate = bytearray(image(2, elf))
    duplicate[FIRST + 512 : FIRST + 1024] = duplicate[FIRST : FIRST + 512]
    yield "duplicate", bytes(duplicate), "agent-journal-corrupt"
    operation = bytearray(base)
    operation[512] = 1
    yield "pending-operation", bytes(operation), "operation-journal-not-empty"


def exercise(command, case_dir, timeout, execute, policy, elf):
    directory = Path(tempfile.mkdtemp(prefix="agent-budget-", dir=Path(case_dir).resolve()))
    disk = directory / "journal.raw"
    command = list(command) + [
        "-device",
        "isa-ide,id=journalide,iobase=0x1f0,iobase2=0x3f6,irq=14",
        "-drive",
        f"if=none,id=journal,format=raw,cache=writeback,file={qemu_path(disk)}",
        "-device",
        "ide-hd,drive=journal,bus=journalide.0,unit=0",
    ]
    errors, outputs, runs = [], [], []

    def boot(label, before, expected, check, *, fail_write=None):
        # This path is created inside a new runner-owned directory, never a host device.
        disk.write_bytes(before)
        trial_command = command
        if fail_write is not None:
            config = directory / f"{label}.conf"
            config.write_text(
                f'[inject-error]\nevent = "write_aio"\nerrno = "5"\nsector = "{fail_write}"\n', encoding="utf-8"
            )
            fault_drive = (
                "if=none,id=journal,format=raw,cache=writeback,werror=report,file.driver=blkdebug,"
                f"file.config={qemu_path(config)},file.image.driver=file,file.image.filename={qemu_path(disk)}"
            )
            trial_command = [fault_drive if part.startswith("if=none,id=journal,") else part for part in command]
        result = execute(trial_command, timeout=timeout)
        after = disk.read_bytes()
        found = check(result.returncode, result.stdout)
        if after != expected:
            found.append("disk differs from complete expected image (including operation and unused sectors)")
        (directory / f"{label}.log").write_text(result.stdout, encoding="utf-8")
        (directory / f"{label}.raw").write_bytes(after)
        runs.append(
            {
                "phase": label,
                "exit_code": result.returncode,
                "errors": found,
                "before_sha256": hashlib.sha256(before).hexdigest(),
                "after_sha256": hashlib.sha256(after).hexdigest(),
            }
        )
        errors.extend(f"{label}: {error}" for error in found)
        outputs.append(f"runner:agent-budget-phase={label}\n{result.stdout}")
        (directory / "results.json").write_text(json.dumps(runs, indent=2) + "\n", encoding="utf-8")
        return result.returncode, after

    code, saved = boot(
        "rejected",
        image(0, elf),
        image(1, elf),
        lambda c, s: stopped_errors(c, s, "retry-pending") + flush_errors(s, [0]),
    )
    if errors:
        return code, "\n".join(outputs), errors
    if policy == "cut-replan":
        code, saved = boot(
            "cut-replan", saved, image(2, elf), lambda c, s: stopped_errors(c, s, "cut-replan") + flush_errors(s, [1])
        )
    if not errors:
        if policy == "cut-launch":
            code, saved = boot(
                "cut-launch",
                saved,
                image(3, elf),
                lambda c, s: stopped_errors(c, s, "cut-launch") + flush_errors(s, [1, 2]),
            )
        else:
            indices = [2, 3] if policy == "cut-replan" else [1, 2, 3]
            code, saved = boot(
                "completed", saved, image(4, elf), lambda c, s: running_errors(c, s) + flush_errors(s, indices)
            )
    if not errors:
        reason = "launch-unknown" if policy == "cut-launch" else "retry-exhausted"
        code, _ = boot("replay", saved, saved, lambda c, s: stopped_errors(c, s, reason) + flush_errors(s, []))
    if policy == "retry" and not errors:
        for label, prefix in (("write-failed-rejected", 0), ("write-failed-replanned", 1)):
            before = image(prefix, elf)
            code, _ = boot(
                label,
                before,
                before,
                lambda c, s: stopped_errors(c, s, "disk-status") + flush_errors(s, []),
                fail_write=9 + prefix,
            )
        # Restoring this captured prefix models a crash after reservation, before completion.
        unknown = image(3, elf)
        code, _ = boot(
            "unknown-prefix",
            unknown,
            unknown,
            lambda c, s: stopped_errors(c, s, "launch-unknown") + flush_errors(s, []),
        )
        for name, damaged, reason in damaged_images(elf):
            code, _ = boot(
                name, damaged, damaged, lambda c, s, reason=reason: stopped_errors(c, s, reason) + flush_errors(s, [])
            )
    return code, "\n".join(outputs), errors
