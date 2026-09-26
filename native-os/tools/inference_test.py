"""Evidence for isolated integer inference and rejection without an operation."""

import re
import tempfile
from pathlib import Path

from persistence_test import fresh_image
from qemu_test_utils import operation_result_errors, qemu_path


CASES = {
    "infer-quota-denied": None,
    "infer-model": "infer:model-rejected",
    "infer-oversized": "infer:input-rejected",
    "infer-budget": "infer:budget",
    "infer-fault": "infer:fault",
    "infer-range": "infer:input-rejected",
    "infer-abstain": "infer:abstain",
    "infer-mem-grow": "infer:memory-grow",
    "infer-mem-limit": "infer:memory-limit",
    "infer-mem-release": "infer:memory-release",
    "infer-mem-fault": "infer:memory-fault",
    "infer-mem-budget": "infer:memory-budget",
    "infer-mem-rollback": "infer:memory-rollback",
    "infer-mem-guard": "infer:memory-guard",
    "infer-mem-nx": "infer:memory-nx",
    "infer-mem-released": "infer:memory-released",
}
FAULTS = {
    "infer-fault": (6, 0, 0),
    "infer-mem-fault": (6, 0, 0),
    "infer-mem-guard": (14, 4, 0x90010000),
    "infer-mem-nx": (14, 0x15, 0x90000000),
    "infer-mem-released": (14, 4, 0x90000000),
}
BUDGET_CASES = {"infer-budget", "infer-mem-budget"}


def arena_errors(case, output, *, expected_requests=None, expected_limit=None):
    """Validate actual allocations, denial without mutation, and final ownership."""
    lines = output.splitlines()
    errors = []
    limit = {"infer-quota-approve": 2, "infer-quota-denied": 1}.get(case, 16)
    if expected_limit is not None:
        limit = expected_limit
    policy = f"kernel:arena-policy pid=0 max-pages={limit} frames=32"
    if [line for line in lines if line.startswith("kernel:arena-policy")] != [policy]:
        errors.append("missing or incorrect inference memory authority")
    if case == "infer-quota-denied":
        requests = [2]
    elif case == "infer-mem-grow":
        requests = [2, 16, 1, 16]
    elif case == "infer-mem-limit":
        requests = [16, 17, 2**64 - 1]
    elif case == "infer-mem-release":
        requests = [16, 1, 16, 0] * 8
    elif case in {"infer-mem-rollback", "infer-mem-released"}:
        requests = [16, 0]
    elif case.startswith("infer-mem-"):
        requests = [16]
    elif case in BUDGET_CASES or case in FAULTS:
        requests = [2]
    else:
        requests = [2, 0]
    if expected_requests is not None:
        requests = expected_requests
    pages = 0
    expected = []
    for request in requests:
        if request > limit:
            result = -22
        else:
            pages = request
            result = 0x90000000 if pages else 0
        expected.append(
            f"kernel:arena-resize pid=0 request={request} result={result} pages={pages} limit={limit} frames={15 + pages}"
        )
    observed = [line for line in lines if line.startswith("kernel:arena-resize")]
    client = [line for line in observed if line.startswith("kernel:arena-resize pid=0 ")]
    service = [line for line in observed if line.startswith("kernel:arena-resize pid=1 ")]
    # The timer can interleave the service's denial before, during, or after the
    # client's computation. Preserve each process's order without assuming a schedule.
    if (client != expected
            or service != ["kernel:arena-resize pid=1 request=1 result=-13 pages=0 limit=0 frames=14"]
            or len(observed) != len(client) + len(service)):
        errors.append("incorrect arena growth, quota denial, or frame accounting")
    denial = "kernel:syscall-rejected pid=1 reason=range"
    if lines.count(denial) != 1:
        errors.append("service gained access to inference memory")
    reclaim = f"kernel:arena-reclaim pid=0 pages={pages} frames={15 + pages}"
    if [line for line in lines if line.startswith("kernel:arena-reclaim")] != [reclaim]:
        errors.append("missing or incorrect arena reclamation")
    else:
        for pid in (0, 1):
            stops = [i for i, line in enumerate(lines) if re.match(rf"kernel:(?:budget-stopped|user-stopped|user-exit) pid={pid} ", line)]
            resizes = [i for i, line in enumerate(lines) if line.startswith(f"kernel:arena-resize pid={pid} ")]
            reap = f"kernel:reaped pid={pid}"
            enter = "kernel:user-enter pid=0 cpl=3"
            if (
                len(stops) != 1 or not resizes or lines.count(reap) != 1 or enter not in lines
                or not lines.index(enter) < resizes[0] <= resizes[-1] < stops[0] < lines.index(reap)
                or (pid == 0 and not stops[0] < lines.index(reclaim) < lines.index(reap))
            ):
                errors.append(f"arena resize or reclamation outside process {pid} lifetime")
    if case == "infer-mem-grow":
        if lines.count("user:log pid=0 hex=5a5a") != 1 or lines.count("kernel:syscall-rejected pid=0 reason=range") != 1:
            errors.append("missing live and unmapped cross-page copy checks")
    if case == "infer-mem-rollback":
        baseline = re.search(r"^kernel:allocation-rollback boundaries=14 free=(\d+)$", output, re.MULTILINE)
        for kind in ("arena-construction-rollback", "arena-rollback"):
            marker = f"kernel:{kind} boundaries=15 free={baseline[1]}" if baseline else ""
            if not marker or lines.count(marker) != 1 or output.find(marker) >= output.find("kernel:user-enter"):
                errors.append(f"missing complete allocator rollback evidence: {kind}")
    return errors


def user_marker(message):
    return f"user:log pid=0 hex={message.encode('ascii').hex()}"


def identity_errors(case, output, *, expected_load=None):
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
    if expected_load is not None:
        expected = expected_load
    errors = []
    binding = "kernel:agent-bound id=1 pid=0 context=1 tools=1 approval=always recovery=reclaim"
    lines = output.splitlines()
    bindings = [line for line in lines if line.startswith("kernel:agent-bound")]
    if bindings != [binding] or not 0 <= output.find(binding) < output.find(expected):
        errors.append("missing, changed, duplicate or late agent binding")
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
    errors.extend(arena_errors(case, output))
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
    errors.extend(arena_errors(case, output))
    messages = [line for line in output.splitlines() if line.startswith(user_marker("infer:"))]
    expected_messages = [] if CASES[case] is None else [user_marker(CASES[case])]
    if messages != expected_messages:
        errors.append("missing, duplicate, or incorrect inference outcome")
    errors.extend(rejection_errors(case, code, output))
    return errors


def rejection_errors(case, code, output):
    """A completed computation must not create an operation or outlive cleanup."""
    errors = []
    if code != 53:
        errors.append(f"inference exit {code}, expected 53")
    errors.extend(operation_result_errors(output, "Empty", 0))
    lines = output.splitlines()
    status = 1 if case == "infer-quota-denied" else 0
    terminal = f"kernel:user-exit pid=0 status={status}"
    if case in FAULTS:
        vector, error, address = FAULTS[case]
        terminal = f"kernel:user-stopped pid=0 vector={vector} error={error:#x} address={address:#x}"
        if lines.count(f"kernel:user-trap pid=0 vector={vector} cpl=3") != 1:
            errors.append("missing inference fault at Ring 3")
    if case in BUDGET_CASES:
        terminal = "kernel:budget-stopped pid=0 ticks=1024"
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
