"""Native dense inference shape contract and QEMU evidence, independent of guest code."""

import re
import struct
import tempfile
from pathlib import Path

from inference_test import arena_errors, identity_errors, rejection_errors
from persistence_test import fresh_image
from qemu_test_utils import qemu_path


SHAPES = (
    (1, 128, 8),
    (4, 128, 8),
    (1, 256, 16),
    (4, 256, 16),
    (1, 384, 24),
    (4, 384, 24),
    (2, 192, 12),
    (3, 320, 20),
    (2, 128, 8),
    (3, 256, 16),
    (2, 384, 24),
    (8, 384, 24),
)
CASES = {f"infer-size-{i}": shape for i, shape in enumerate(SHAPES)}


def expected_pages(shape):
    b, d, c = shape
    # Analytic comparator for this known packed layout, not a learned prediction.
    aligned = ((b * d * 4 + c * d * 4 + 7) // 8) * 8
    return (aligned + b * c * 8 + 4095) // 4096


def checksum(shape):
    b, d, c = shape
    return sum(
        sum((((row * d + k) % 5) - 2) * (((col * d + k) % 7) - 3) for k in range(d))
        for row in range(b)
        for col in range(c)
    )


def record(shape):
    return "user:log pid=0 hex=" + struct.pack("<QQQq", *shape, checksum(shape)).hex()


def verdict(case, code, output):
    shape = CASES[case]
    index = list(CASES).index(case)
    pages = expected_pages(shape)
    errors = identity_errors(
        case, output, expected_load=f"kernel:sized-inference-elf-loaded entry=0x40000010 mode={75 + index}"
    )
    errors.extend(arena_errors(case, output, expected_requests=[pages, 0]))
    errors.extend(rejection_errors(case, code, output))
    lines = output.splitlines()
    result = record(shape)
    if [line for line in lines if line.startswith("user:log pid=0 ")] != [result]:
        errors.append("missing, duplicate or wrong shape/checksum")
    else:
        acquire = next(
            (i for i, line in enumerate(lines) if line.startswith(f"kernel:arena-resize pid=0 request={pages} ")), -1
        )
        release = next(
            (i for i, line in enumerate(lines) if line.startswith("kernel:arena-resize pid=0 request=0 ")), -1
        )
        if not 0 <= acquire < lines.index(result) < release:
            errors.append("computation did not occur inside live arena lifetime")
    return errors


def observation(case, code, output):
    errors = verdict(case, code, output)
    if errors:
        raise ValueError("; ".join(errors))
    # Read measured allocation events rather than substituting the layout formula.
    pages = [
        int(n)
        for n in re.findall(r"^kernel:arena-resize pid=0 .* pages=(\d+) limit=16 frames=\d+$", output, re.MULTILINE)
    ]
    ticks = [int(n) for n in re.findall(r"^kernel:preempt pid=0 ticks=(\d+)$", output, re.MULTILINE)]
    return {
        "case": case,
        "shape": CASES[case],
        "peak_arena_pages": max(pages),
        "checksum": checksum(CASES[case]),
        "observed_preemptions": max(ticks, default=0),
    }


def exercise(command, case, case_dir, timeout, execute):
    directory = Path(tempfile.mkdtemp(prefix="sized-", dir=Path(case_dir).resolve()))
    disk = directory / "journal.raw"
    original = fresh_image()
    disk.write_bytes(original)
    command = list(command) + [
        "-device",
        "isa-ide,id=journalide,iobase=0x1f0,iobase2=0x3f6,irq=14",
        "-drive",
        f"if=none,id=journal,format=raw,cache=writeback,file={qemu_path(disk)}",
        "-device",
        "ide-hd,drive=journal,bus=journalide.0,unit=0",
    ]
    result = execute(command, timeout=timeout)
    (directory / "first.log").write_text(result.stdout, encoding="utf-8")
    errors = verdict(case, result.returncode, result.stdout)
    if disk.read_bytes() != original:
        errors.append("sized inference changed the journal")
    return result.returncode, result.stdout, errors
