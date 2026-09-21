"""Shared QEMU argument encoding and exact operation-result checks."""

from pathlib import Path


def qemu_path(path: Path) -> str:
    # Commas delimit QEMU suboptions; doubling preserves a literal comma.
    return path.resolve().as_posix().replace(",", ",,")


def operation_result_errors(output: str, state: str, executions: int) -> list[str]:
    results = [line for line in output.splitlines() if line.startswith("kernel:operation-result")]
    expected = f"kernel:operation-result state={state} executions={executions}"
    return [] if results == [expected] else ["missing, duplicate, or incorrect operation result"]
