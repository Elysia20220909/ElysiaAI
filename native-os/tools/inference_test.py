"""Evidence for isolated integer inference and rejection without an operation."""

import re
import tempfile
from pathlib import Path

from persistence_test import fresh_image
from qemu_test_utils import operation_result_errors, qemu_path


CASES = {
    "infer-model": "infer:model-rejected",
    "infer-oversized": "infer:input-rejected",
    "infer-budget": "infer:budget",
    "infer-fault": "infer:fault",
    "infer-range": "infer:input-rejected",
    "infer-abstain": "infer:abstain",
}


def user_marker(message):
    return f"user:log pid=0 hex={message.encode('ascii').hex()}"


def identity_errors(case, output):
    x, y = (
        (4, 1)
        if case == "infer-short"
        else (32767, 4)
        if case == "infer-range"
        else (1, 1)
        if case == "infer-abstain"
        else (1, 4)
    )
    count = 3 if case == "infer-oversized" else 2
    expected = f"kernel:inference-elf-loaded entry=0x40000010 input-count={count} x={x} y={y}"
    errors = []
    for marker in (
        expected,
        "kernel:launch-policy pid=0 frames=32 ticks=1024 document=true generation=0",
        "kernel:launch-policy pid=1 frames=32 ticks=64 document=false generation=0",
        "kernel:user-enter pid=0 cpl=3",
    ):
        if marker not in output.splitlines():
            errors.append(f"missing inference identity/boundary: {marker}")
    return errors


def proposal_errors(case, output):
    errors = identity_errors(case, output)
    length = 8 if case == "infer-short" else 16
    marker = user_marker(f"infer:length{length}")
    lines = output.splitlines()
    messages = [line for line in lines if line.startswith(user_marker("infer:"))]
    proposal = output.find("kernel:operator-plan")
    if messages != [marker] or not 0 <= output.find(marker) < proposal:
        errors.append("missing model prediction before proposal")
    plans = [line for line in output.splitlines() if line.startswith("kernel:operator-plan")]
    if len(plans) != 1 or not re.fullmatch(
        rf"kernel:operator-plan id=1 caller=0 executor=1 version=1 target=[1-9][0-9]* offset=0 length={length} byte-budget=16 deadline-tick=1024",
        plans[0],
    ):
        errors.append("proposal differs from inference or launch authority")
    return errors


def verdict(case, code, output):
    errors = identity_errors(case, output)
    if code != 53:
        errors.append(f"inference exit {code}, expected 53")
    errors.extend(operation_result_errors(output, "Empty", 0))
    lines = output.splitlines()
    messages = [line for line in lines if line.startswith(user_marker("infer:"))]
    if messages != [user_marker(CASES[case])]:
        errors.append("missing, duplicate, or incorrect inference outcome")
    terminal = (
        "kernel:budget-stopped pid=0 ticks=1024"
        if case == "infer-budget"
        else "kernel:user-stopped pid=0 vector=6 error=0x0 address=0x0"
        if case == "infer-fault"
        else "kernel:user-exit pid=0 status=0"
    )
    if case == "infer-fault" and "kernel:user-trap pid=0 vector=6 cpl=3" not in lines:
        errors.append("missing inference fault at Ring 3")
    if case == "infer-budget":
        ticks = [int(t) for t in re.findall(r"^kernel:preempt pid=0 ticks=(\d+)$", output, re.MULTILINE)]
        if ticks != list(range(1, 1025)):
            errors.append("invalid cumulative inference tick accounting")
    for pid, stop in ((0, terminal), (1, "kernel:user-exit pid=1 status=0")):
        stops = [
            line for line in lines if re.match(rf"kernel:(?:budget-stopped|user-stopped|user-exit) pid={pid} ", line)
        ]
        reap = f"kernel:reaped pid={pid}"
        if stops != [stop] or lines.count(reap) != 1:
            errors.append(f"missing, duplicate, or incorrect inference termination for pid {pid}")
            continue
        stopped = lines.index(stop)
        reclaimed = lines.index(reap)
        clean_position = next((i for i, line in enumerate(lines) if line.startswith("kernel:operation-clean")), -1)
        if not stopped < reclaimed < clean_position:
            errors.append(f"incorrect inference cleanup order for pid {pid}")
        later = "\n".join(lines[stopped + 1 :])
        if re.search(
            rf"(?:kernel:(?:preempt|user-trap|user-enter) pid={pid} |user:log pid={pid} |kernel:user-switch from=\d+ to={pid}(?:\n|$))",
            later,
        ):
            errors.append(f"stopped inference process {pid} resumed")
    baseline = re.search(r"kernel:allocation-rollback boundaries=\d+ free=(\d+)", output)
    clean = re.search(r"kernel:operation-clean free=(\d+)", output)
    if not baseline or not clean or baseline[1] != clean[1]:
        errors.append("inference frames did not return to baseline")
    for forbidden in ("kernel:operator-", "kernel:persist-flushed", "kernel:operation-event", "failure:", "panic"):
        if forbidden in output:
            errors.append(f"unexpected inference side effect: {forbidden}")
    return errors


def exercise(command, case, case_dir, timeout, execute):
    directory = Path(tempfile.mkdtemp(prefix="inference-", dir=Path(case_dir).resolve()))
    disk = directory / "journal.raw"
    original = fresh_image()
    with disk.open("xb") as stream:
        stream.write(original)
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
        errors.append("rejected inference changed the journal")
    return result.returncode, result.stdout, errors
