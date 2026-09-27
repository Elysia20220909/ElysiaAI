"""Independent wire-format oracle and bounded document-Agent QEMU verification."""

import struct
import tempfile
from pathlib import Path

from inference_test import arena_errors, rejection_errors
from persistence_test import fresh_image
from qemu_test_utils import qemu_path


CASE = "agent-document-classify"
SIZE = 812
GOAL = b"elysia:document-classifier:v0001"
VARIANTS = {
    "valid": 0,
    "checksum": 2,
    "shape": 1,
    "weight": 4,
    "input": 5,
    "goal": 3,
    "duplicate": 5,
    "identity": 6,
    "truncated": 1,
}


def checksum(data):
    value = 2166136261
    for byte in data:
        value = ((value ^ byte) * 16777619) & 0xFFFFFFFF
    return value


def inspect(data):
    """Validate the entire batch before computing any expected result."""
    if (
        len(data) != SIZE
        or struct.unpack_from("<8sHHHH", data) != (b"ELYDOC01", 1, 64, 8, 68)
        or any(data[112:128])
        or any(data[260:264])
    ):
        raise ValueError("invalid document packet shape")
    if struct.unpack_from("<I", data, SIZE - 4)[0] != checksum(data[:-4]):
        raise ValueError("invalid document packet checksum")
    if data[16:48] != GOAL or not any(data[48:80]) or not any(data[80:112]):
        raise ValueError("invalid document packet identity")
    weights = struct.unpack_from("<64h", data, 128)
    bias = struct.unpack_from("<i", data, 256)[0]
    if any(abs(w) > 510 for w in weights) or abs(bias) > 4161600:
        raise ValueError("invalid document model bounds")
    rows = []
    previous = 0
    for offset in range(264, SIZE - 4, 68):
        identifier = struct.unpack_from("<I", data, offset)[0]
        vector = data[offset + 4 : offset + 68]
        if identifier <= previous or any(v not in (0, 255) for v in vector):
            raise ValueError("invalid document feature row")
        previous = identifier
        rows.append((identifier, vector))
    results = []
    for identifier, vector in rows:
        score = bias + sum(w * v for w, v in zip(weights, vector, strict=True))
        results.append((identifier, score, 0 if score > 0 else 1 if score < 0 else 2))
    return results


def mutate(data, variant):
    inspect(data)
    if variant not in VARIANTS:
        raise ValueError("unknown document packet variant")
    if variant == "valid":
        return data
    if variant == "truncated":
        return data[:-1]
    changed = bytearray(data)
    offset, value = {
        "checksum": (268, data[268] ^ 1),
        "shape": (10, 63),
        "weight": (129, 127),
        "input": (744, 1),
        "goal": (16, 0),
        "duplicate": (740, data[672]),
        "identity": (48, 0),
    }[variant]
    changed[offset] = value
    if variant == "identity":
        changed[48:80] = bytes(32)
    if variant == "duplicate":
        changed[740:744] = changed[672:676]
    if variant != "checksum":
        struct.pack_into("<I", changed, SIZE - 4, checksum(changed[:-4]))
    return bytes(changed)


def records(data, variant):
    reason = VARIANTS[variant]
    values = (
        [struct.pack("<8sQqQ", b"DCLERR01", reason, 0, 0)]
        if reason
        else [struct.pack("<8sQqQ", b"DCLRES01", *row) for row in inspect(data)]
    )
    return ["user:log pid=0 hex=" + value.hex() for value in values]


def verdict(code, output, data, variant):
    errors = rejection_errors(CASE, code, output)
    errors.extend(arena_errors(CASE, output, expected_requests=[1, 0], expected_limit=1))
    lines = output.splitlines()
    markers = [
        "kernel:agent-bound id=2 pid=0 context=0 tools=0 approval=always recovery=reclaim",
        "kernel:launch-policy pid=0 frames=32 ticks=1024 document=false generation=0",
        "kernel:launch-policy pid=1 frames=32 ticks=64 document=false generation=0",
        f"kernel:document-agent-elf-loaded entry=0x40000010 bytes={len(data)}",
        "kernel:user-enter pid=0 cpl=3",
    ]
    for marker in markers:
        if lines.count(marker) != 1:
            errors.append(f"missing identity: {marker}")
    bindings = [line for line in lines if line.startswith("kernel:agent-bound")]
    if bindings != [markers[0]] or not 0 <= output.find(markers[0]) < output.find(markers[3]) < output.find(markers[4]):
        errors.append("incorrect or late document Agent binding")
    expected = records(data, variant)
    if [line for line in lines if line.startswith("user:log pid=0 ")] != expected:
        errors.append("missing, duplicate or wrong document result")
    else:
        acquire = next(
            (i for i, line in enumerate(lines) if line.startswith("kernel:arena-resize pid=0 request=1 ")), -1
        )
        release = next(
            (i for i, line in enumerate(lines) if line.startswith("kernel:arena-resize pid=0 request=0 ")), -1
        )
        if not all(0 <= acquire < lines.index(record) < release for record in expected):
            errors.append("document computation outside live arena lifetime")
    return errors


def exercise(command, case_dir, timeout, execute, data, variant):
    directory = Path(tempfile.mkdtemp(prefix="document-agent-", dir=Path(case_dir).resolve()))
    disk = directory / "journal.raw"
    original = fresh_image()
    disk.write_bytes(original)
    (directory / "packet.bin").write_bytes(data)
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
    errors = verdict(result.returncode, result.stdout, data, variant)
    if disk.read_bytes() != original:
        errors.append("read-only classification changed the journal")
    return result.returncode, result.stdout, errors
