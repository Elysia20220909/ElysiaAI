"""Build bounded native budget packets and check pre-launch rejection evidence."""

import hashlib
import struct

from sized_test import SHAPES, expected_pages


# Fixed is the original measurement ceiling; analytic is an explicit application experiment.
REJECTIONS = {
    "version": "version",
    "metric": "metric",
    "elf": "elf",
    "shape": "shape",
    "ceiling": "ceiling",
    "insufficient": "insufficient",
    "truncated": "length",
}
VARIANTS = ("fixed", "analytic", *REJECTIONS)


def packet(elf_digest, variant="fixed"):
    if len(elf_digest) != 32 or variant not in VARIANTS:
        raise ValueError("invalid ELF identity or budget variant")
    data = bytearray(struct.pack("<4sHHII", b"EAB1", 1, 1, len(SHAPES), 0) + elf_digest)
    for i, shape in enumerate(SHAPES):
        pages = expected_pages(shape) if variant == "analytic" else 16
        data.extend(struct.pack("<IHHHHI", 75 + i, *shape, pages, 0))
    edits = {
        "version": (4, 2),
        "metric": (6, 2),
        "elf": (16, data[16] ^ 1),
        "shape": (52, 2),
        "ceiling": (58, 17),
        "insufficient": (58, 1),
    }
    if variant in edits:
        offset, value = edits[variant]
        data[offset] = value
    return bytes(data[:-1] if variant == "truncated" else data)


def build_files(elf, directory, variant):
    # Both the embedded executable and its expected identity come from this trusted build.
    # A proposal carries a second digest which the kernel compares against that identity.
    identity = hashlib.sha256(elf.read_bytes()).digest()
    policy = directory / "arena-policy.bin"
    expected = directory / "sized-id.bin"
    policy.write_bytes(packet(identity, variant))
    expected.write_bytes(identity)
    return policy, expected


def rejection_errors(variant, code, output):
    errors = []
    expected = f"kernel:arena-budget-rejected reason={REJECTIONS[variant]}"
    lines = output.splitlines()
    if code != 61 or [line for line in lines if line.startswith("kernel:arena-budget-")] != [expected]:
        errors.append("missing or wrong budget rejection")
    for forbidden in (
        "kernel:agent-bound",
        "kernel:launch-policy",
        "kernel:user-",
        "user:log",
        "kernel:arena-policy",
        "kernel:arena-resize",
        "kernel:persist-",
        "kernel:operation-",
        "kernel:service-elf-loaded",
        "kernel:sized-inference-elf-loaded",
        "failure:",
        "panic",
    ):
        if forbidden in output:
            errors.append(f"side effect after invalid budget: {forbidden}")
    return errors
