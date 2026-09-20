#!/usr/bin/env python3
"""Build and test the native OS kernel and document service in a bounded, headless QEMU process."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import sys
import time
from persistence_test import CASES as PERSISTENCE_CASES, exercise as persistence_exercise

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_RUST = "1.96.0"
EXPECTED_QEMU = "11.1.0 (v11.1.0-12130-ge470268ff4)"
MACHINE = "pc-q35-11.1"
CASES = {
    "normal": (33, ["kernel:ready"]),
    "bad-boot-info": (35, ["kernel:boot-info-rejected:header"]),
    "invalid-opcode": (37, ["kernel:injecting-invalid-opcode", "kernel:fault:invalid-opcode"]),
    "stale-map-key": (33, ["kernel:ready"]),
    "unmapped-page": (39, ["kernel:injecting-unmapped", "kernel:fault:unmapped"]),
    "readonly-page": (41, ["kernel:injecting-readonly", "kernel:fault:readonly"]),
    "noexecute-page": (43, ["kernel:injecting-noexecute", "kernel:fault:noexecute"]),
}
USER_CASES = {
    "user-cooperate": (7, None),
    "user-kernel": (8, "vector=14 error=0x5 address=0x2000000"),
    "user-peer": (9, "vector=14 error=0x4 address=0x70002000"),
    "user-readonly": (10, "vector=14 error=0x7 address=0x40000000"),
    "user-noexecute": (11, "vector=14 error=0x15 address=0x60000000"),
    "user-invalid-opcode": (12, "vector=6 error=0x0 address=0x0"),
    "user-io": (13, "vector=13 error=0x0 address=0x0"),
    "user-bad-stack": (14, "vector=14 error=0x6 address=0x8ffffff8"),
    "user-gate": (15, "vector=13 error=0x202 address=0x0"),
    "user-fpu": (16, "vector=7 error=0x0 address=0x0"),
    "user-bad-return": (17, "vector=128 error=0x0 address=0x1000000000000"),
}
for name, (mode, fault) in USER_CASES.items():
    CASES[name] = (45, [
        "kernel:user-enter pid=0 cpl=3",
        "kernel:user-trap pid=0 vector=128 cpl=3",
        "kernel:syscall-rejected pid=0 reason=number",
        "kernel:syscall-rejected pid=0 reason=range",
        "user:log pid=0 hex=41", "kernel:user-yield pid=0",
        "kernel:user-switch from=0 to=1",
        "kernel:user-trap pid=1 vector=128 cpl=3",
        "user:log pid=1 hex=42", "kernel:user-yield pid=1",
        "kernel:user-switch from=1 to=0", "user:log pid=0 hex=61",
        f"kernel:user-stopped pid=0 {fault}" if fault else "kernel:user-exit pid=0 status=0",
        "kernel:user-switch from=0 to=1", "user:log pid=1 hex=62",
        "kernel:user-exit pid=1 status=0", f"kernel:user-tests-passed mode={mode}",
    ])
LIFECYCLE_CASES = {"user-preempt": 18, "user-recycle": 19, "user-yield-spin": 20}
for name, mode in LIFECYCLE_CASES.items():
    CASES[name] = (47, ["kernel:allocation-rollback", "kernel:user-spaces-ready",
                       "kernel:user-enter pid=0 cpl=3",
                       f"kernel:lifecycle-tests-passed mode={mode}"])
IPC_CASES = {"ipc-echo": 21, "ipc-peer-exit": 22, "ipc-peer-fault": 23,
             "ipc-revoke": 24, "ipc-deadlock": 25, "ipc-queue": 26}
for name, mode in IPC_CASES.items():
    CASES[name] = (49, ["kernel:allocation-rollback", "kernel:user-spaces-ready",
                       "kernel:timer-ready", "kernel:user-enter pid=0 cpl=3",
                       "user:log pid=0 hex=6f6b", "kernel:ipc-clean",
                       f"kernel:ipc-tests-passed mode={mode}"])
DOCUMENT_CASES = {"document-read": 27, "document-denied": 28, "document-revoke": 29,
                  "document-range": 30, "document-service-exit": 31, "document-service-fault": 32}
DOCUMENT_STATUSES = {"document-read": [0, 0, 0], "document-denied": [0, -9, -9, -38, -22],
                     "document-revoke": [0, 0, -9], "document-range": [0, -22, -22, -90],
                     "document-service-exit": [], "document-service-fault": []}
for name, mode in DOCUMENT_CASES.items():
    CASES[name] = (49, ["kernel:allocation-rollback", "kernel:user-spaces-ready",
                       "kernel:timer-ready", "kernel:user-enter pid=0 cpl=3",
                       "user:log pid=0 hex=6f6b", "kernel:documents-clean", "kernel:ipc-clean",
                       f"kernel:ipc-tests-passed mode={mode}"])
RECOVERY_CASES = {"recovery-fault": 33, "recovery-exit": 34, "recovery-budget": 35,
                  "recovery-repeat": 36, "recovery-allocation": 37, "recovery-limit": 38}
for name, mode in RECOVERY_CASES.items():
    CASES[name] = (49, ["kernel:allocation-rollback", "kernel:user-spaces-ready",
                       "kernel:recovery-live generation=0", "kernel:timer-ready",
                       "kernel:user-enter pid=0 cpl=3", "user:log pid=0 hex=6f6b",
                       "kernel:documents-clean", "kernel:recovery-tests-passed",
                       "kernel:ipc-clean", f"kernel:ipc-tests-passed mode={mode}"])
ELF_CASES = {"elf-run": 39, "elf-fault": 40, "elf-readonly": 41,
             "elf-noexecute": 42, "elf-reject": 43, "elf-rollback": 44}
for name, mode in ELF_CASES.items():
    CASES[name] = (51, ["kernel:allocation-rollback", "kernel:elf-loaded pid=0",
                       "kernel:elf-loaded pid=1", "kernel:user-spaces-ready", "kernel:timer-ready",
                       "kernel:user-enter pid=0 cpl=3", "user:log pid=1 hex=6f6b",
                       "kernel:elf-clean", f"kernel:elf-tests-passed mode={mode}"])
OPERATION_CASES = {"operation-complete": (45, "Completed", 1), "operation-denied": (46, "Denied", 0),
                   "operation-interrupted": (47, "Interrupted", 0), "operation-unknown": (48, "Unknown", 1),
                   "operation-failed": (49, "Failed", 1)}
for name, (mode, state, executions) in OPERATION_CASES.items():
    CASES[name] = (53, ["kernel:user-spaces-ready", "kernel:timer-ready", "kernel:user-enter pid=0 cpl=3",
                       "user:log pid=0 hex=6f6b", f"kernel:operation-result state={state} executions={executions}",
                       "kernel:operation-clean"])
for name in PERSISTENCE_CASES:
    CASES[name] = (55, [])
PREFIX = ["loader:entered", "loader:kernel-loaded", "loader:boot-services-exited",
          "kernel:entered", "kernel:exceptions-ready"]
MEMORY_PREFIX = ["kernel:boot-info-valid", "kernel:frames-verified",
                 "kernel:paging-active", "kernel:mapped-memory-verified"]
FAULT_CASES = set(CASES) - {"normal", "stale-map-key"}


def execute(args: list[str], *, env: dict[str, str] | None = None,
            timeout: float = 180) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args, cwd=ROOT, env=env, check=False, text=True, encoding="utf-8",
        errors="replace", stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )


def checked(args: list[str], *, env: dict[str, str] | None = None) -> str:
    result = execute(args, env=env)
    if result.returncode:
        raise RuntimeError(f"{args[0]} failed ({result.returncode}):\n{result.stdout}")
    return result.stdout


def sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def verify_output(case: str, code: int, output: str) -> list[str]:
    """Require both the exact exit code and ordered evidence from each side of the handoff."""
    if case in PERSISTENCE_CASES:
        return ["persistence requires two-boot and disk-integrity verification"]
    expected_code, markers = CASES[case]
    errors = []
    if code != expected_code:
        errors.append(f"exit code {code}, expected {expected_code}")
    sequence = list(PREFIX)
    if case == "stale-map-key":
        sequence[2:2] = ["loader:map-key-rejected", "loader:exit-attempt=1"]
    if case != "bad-boot-info":
        sequence += MEMORY_PREFIX
    sequence += markers
    position = 0
    for marker in sequence:
        found = output.find(marker, position)
        if found < 0:
            errors.append(f"missing or out-of-order marker: {marker}")
            break
        position = found + len(marker)
    if "failure:" in output or "panic" in output or "kernel:fault:unexpected" in output:
        errors.append("unexpected failure diagnostic")
    if case in FAULT_CASES and "kernel:ready" in output:
        errors.append("fault case reached normal completion")
    if case == "bad-boot-info" and "kernel:boot-info-valid" in output:
        errors.append("corrupted boot info was accepted")
    if case == "invalid-opcode" and "kernel:boot-info-valid" not in output:
        errors.append("exception did not follow a validated handoff")
    if case in USER_CASES:
        roots = re.search(r"kernel:user-spaces-ready roots=(0x[0-9a-f]+),(0x[0-9a-f]+)", output)
        if not roots or int(roots[1], 16) == int(roots[2], 16):
            errors.append("missing distinct process roots")
        for pid in (0, 1):
            for reason, count in (("range", 8), ("number", 1), ("status", 1)):
                marker = f"kernel:syscall-rejected pid={pid} reason={reason}"
                if output.splitlines().count(marker) != count:
                    errors.append(f"incorrect rejection count: {marker}")
            stopped = re.search(rf"kernel:user-(?:stopped|exit) pid={pid} ", output)
            if stopped:
                later = output[output.find("\n", stopped.start()) + 1:]
                if re.search(rf"(?:kernel:user-trap pid={pid} |user:log pid={pid} |kernel:user-switch from=\d+ to={pid}(?:\r?\n|$))", later):
                    errors.append(f"stopped process {pid} resumed")
    if case in LIFECYCLE_CASES:
        errors.extend(verify_lifecycle(case, output))
    if case in IPC_CASES or case in DOCUMENT_CASES or case in RECOVERY_CASES:
        errors.extend(verify_ipc(case, output))
    if case in DOCUMENT_CASES:
        errors.extend(verify_documents(case, output))
    if case in RECOVERY_CASES:
        errors.extend(verify_recovery(case, output))
        if output.count("kernel:launch-definitions-rejected count=4") != 1:
            errors.append("missing launch definition rejection evidence")
        policies = re.findall(r"kernel:launch-policy pid=(\d+) frames=(\d+) ticks=(\d+) document=(true|false) generation=(\d+)", output)
        expected_generations = re.findall(r"kernel:recovery-live generation=(\d+) free=", output)
        expected = [("0", "32", "1024", "true", "0")] + [("1", "32", "64", "false", g) for g in expected_generations]
        if policies != expected:
            errors.append("launch definitions changed across process lifetimes")
    if case in ELF_CASES:
        errors.extend(verify_elf(case, output))
    if case in OPERATION_CASES:
        _, state, executions = OPERATION_CASES[case]
        expected = ["Proposed", "Denied"] if state == "Denied" else ["Proposed", "Approved", "Interrupted"] if state == "Interrupted" else ["Proposed", "Approved", "Running", state]
        events = re.findall(r"kernel:operation-event id=1 state=(\w+) tick=(\d+)", output)
        if [e[0] for e in events] != expected or [int(e[1]) for e in events] != sorted(int(e[1]) for e in events):
            errors.append("missing or invalid operation journal")
        baseline = re.search(r"kernel:allocation-rollback boundaries=\d+ free=(\d+)", output)
        clean = re.search(r"kernel:operation-clean free=(\d+)", output)
        if not baseline or not clean or baseline[1] != clean[1]:
            errors.append("operation resource leak")
        if "kernel:document-response status=-38" not in output or "kernel:document-response status=-13" not in output:
            errors.append("missing unapproved execution or self-approval rejection")
        if state == "Unknown" and "kernel:user-stopped pid=1 vector=6" not in output:
            errors.append("unknown result lacks observed service fault")
    return errors


def verify_lifecycle(case: str, output: str) -> list[str]:
    errors = []
    lines = output.splitlines()
    rollback = re.search(r"kernel:allocation-rollback boundaries=(\d+) free=(\d+)", output)
    generations = re.findall(r"kernel:generation-reclaimed generation=(\d+) free=(\d+)", output)
    count = 64 if case == "user-recycle" else 1
    if not rollback or int(rollback[1]) < 8:
        errors.append("missing partial-construction rollback evidence")
    if ([int(g) for g, _ in generations] != list(range(count)) or not rollback
            or any(free != rollback[2] for _, free in generations)):
        errors.append("missing generations or leaked frames")
    roots = re.findall(r"kernel:user-spaces-ready roots=(0x[0-9a-f]+),(0x[0-9a-f]+)", output)
    if len(roots) != count or any(a == b for a, b in roots):
        errors.append("missing distinct roots for every generation")
    if count > 1 and len(set(roots)) == count:
        errors.append("no observed root-frame reuse")
    for pid in (0, 1):
        if lines.count(f"kernel:reaped pid={pid}") != count:
            errors.append(f"incorrect reclamation count for process {pid}")
    if case == "user-recycle":
        for marker in ("kernel:user-exit pid=0 status=0",
                       "kernel:user-stopped pid=1 vector=6 error=0x0 address=0x0"):
            if lines.count(marker) != count:
                errors.append("missing exit/fault in a recycling generation")
    else:
        for marker in ("kernel:timer-ready source=pit irq=0 hz=100",
                       "user:log pid=1 hex=50", "user:log pid=1 hex=51",
                       "kernel:user-exit pid=1 status=0",
                       "kernel:budget-stopped pid=0 ticks=8"):
            if lines.count(marker) != 1:
                errors.append(f"missing or repeated lifecycle evidence: {marker}")
        for pid in (0, 1):
            ticks = [int(t) for t in re.findall(rf"kernel:preempt pid={pid} ticks=(\d+)", output)]
            if not ticks or ticks != list(range(1, len(ticks) + 1)) or (pid == 0 and len(ticks) != 8):
                errors.append(f"invalid cumulative timer accounting for process {pid}")
            marker = "kernel:budget-stopped pid=0" if pid == 0 else "kernel:user-exit pid=1"
            stopped = output.find(marker)
            if stopped >= 0:
                later = output[output.find("\n", stopped) + 1:]
                if re.search(rf"(?:kernel:(?:preempt|user-trap) pid={pid} |user:log pid={pid} |kernel:user-switch from=\d+ to={pid}(?:\r?\n|$))", later):
                    errors.append(f"stopped process {pid} resumed")
        if case == "user-preempt" and "kernel:user-yield pid=0" in output:
            errors.append("CPU hog yielded instead of requiring preemption")
        if case == "user-yield-spin" and "kernel:user-yield pid=0" not in output:
            errors.append("yield-spin fixture never yielded")
        if output.find("user:log pid=1 hex=50") >= output.find("user:log pid=1 hex=51"):
            errors.append("survivor progress reversed")
    return errors



def verify_ipc(case: str, output: str) -> list[str]:
    errors = []
    lines = output.splitlines()
    baseline = re.search(r"kernel:allocation-rollback boundaries=(\d+) free=(\d+)", output)
    clean = re.search(r"kernel:ipc-clean free=(\d+)", output)
    if not baseline or not clean or baseline[2] != clean[1]:
        errors.append("IPC memory did not return to baseline")
    blocked = set()
    stopped = set()
    for line in lines:
        if case in RECOVERY_CASES:
            restarted = re.fullmatch(r"kernel:recovery-live generation=(\d+) free=\d+", line)
            if restarted and int(restarted[1]) > 0:
                if 1 not in stopped or 1 in blocked:
                    errors.append("service restarted before stopping")
                stopped.discard(1)
            budget = re.fullmatch(r"kernel:budget-stopped pid=(\d+) ticks=\d+", line)
            if budget:
                stopped.add(int(budget[1]))
        event = re.fullmatch(r"kernel:ipc-block pid=(\d+)", line)
        if event:
            pid = int(event[1])
            if pid in blocked or pid in stopped:
                errors.append("invalid receive block state")
            blocked.add(pid)
        event = re.fullmatch(r"kernel:ipc-wake pid=(\d+) result=(-?\d+)", line)
        if event:
            pid = int(event[1])
            if pid not in blocked or pid in stopped:
                errors.append("wake without live blocked receiver")
            blocked.discard(pid)
        event = re.match(r"kernel:user-(?:exit|stopped) pid=(\d+) ", line)
        if event:
            pid = int(event[1])
            if pid in blocked or pid in stopped:
                errors.append("blocked or already stopped process exited")
            stopped.add(pid)
        event = re.match(r"kernel:(?:user-trap|preempt) pid=(\d+) ", line)
        if event and int(event[1]) in blocked | stopped:
            errors.append("blocked/stopped process ran")
        event = re.fullmatch(r"kernel:user-switch from=\d+ to=(\d+)", line)
        if event and int(event[1]) in blocked | stopped:
            errors.append("scheduler selected a blocked/stopped process")
    if blocked or stopped != {0, 1}:
        errors.append("IPC processes or waiters remain")
    for pid in (0, 1):
        expected_reaps = (9 if case in ("recovery-repeat", "recovery-limit") else 2) if case in RECOVERY_CASES and pid == 1 else 1
        if lines.count(f"kernel:reaped pid={pid}") != expected_reaps:
            errors.append("missing process reclamation")
    required = {
        "ipc-echo": ["kernel:ipc-result pid=0 op=3 result=-9",
                     "kernel:ipc-result pid=0 op=3 result=-13",
                     "kernel:ipc-result pid=0 op=3 result=-90",
                     "kernel:ipc-result pid=0 op=4 result=-14",
                     "kernel:ipc-result pid=1 op=4 result=-90"],
        "ipc-peer-exit": ["kernel:user-exit pid=1 status=0", "kernel:ipc-wake pid=0 result=-32"],
        "ipc-peer-fault": ["kernel:user-stopped pid=1 vector=6 error=0x0 address=0x0", "kernel:ipc-wake pid=0 result=-32"],
        "ipc-revoke": ["kernel:ipc-result pid=1 op=5 result=0", "kernel:ipc-wake pid=0 result=-32",
                       "kernel:ipc-result pid=0 op=3 result=-9", "kernel:ipc-result pid=0 op=4 result=-9"],
        "ipc-queue": ["kernel:ipc-result pid=0 op=3 result=-11"],
    }
    for marker in required.get(case, []):
        if marker not in lines:
            errors.append(f"missing IPC evidence: {marker}")
    if case == "ipc-deadlock":
        rejected = re.findall(r"kernel:ipc-result pid=([01]) op=4 result=-35", output)
        if len(rejected) != 1 or f"kernel:ipc-wake pid={1 - int(rejected[0])} result=2" not in lines:
            errors.append("missing symmetric deadlock rejection and peer wakeup")
    if case == "ipc-echo":
        if lines.count("kernel:ipc-result pid=0 op=3 result=-9") != 2:
            errors.append("missing forged or foreign handle rejection")
        for pid in (0, 1):
            if lines.count(f"kernel:ipc-result pid={pid} op=3 result=2") != 2:
                errors.append("missing request/reply sends")
    return errors


def verify_documents(case: str, output: str) -> list[str]:
    errors = []
    lines = output.splitlines()
    statuses = [int(n) for n in re.findall(r"^kernel:document-response status=(-?\d+)$", output, re.M)]
    if statuses != DOCUMENT_STATUSES[case]:
        errors.append("incorrect document responses")
    if lines.count("kernel:documents-clean") != 1:
        errors.append("document grants or pending work not reclaimed")
    if lines.count("kernel:document-serve pid=0 result=-13") != 1:
        errors.append("missing client service-call rejection")
    for marker in ("kernel:document-serve pid=1 result=-14",
                   "kernel:document-serve pid=1 result=-11",
                   "kernel:document-serve pid=1 result=64",
                   "kernel:ipc-result pid=1 op=4 result=-11"):
        if lines.count(marker) != len(statuses):
            errors.append(f"missing pending-request protection: {marker}")
    if case in ("document-service-exit", "document-service-fault"):
        reason = "exit pid=1 status=0" if case.endswith("exit") else "stopped pid=1 vector=6 error=0x0 address=0x0"
        for marker in (f"kernel:user-{reason}", "kernel:ipc-result pid=0 op=3 result=-32"):
            if marker not in lines:
                errors.append(f"missing service closure evidence: {marker}")
        if not any(f"kernel:ipc-{operation} pid=0 {suffix}result=-32" in lines
                   for operation, suffix in (("wake", ""), ("result", "op=4 "))):
            errors.append("client did not observe service closure")
    return errors


def verify_recovery(case: str, output: str) -> list[str]:
    errors = []
    lines = output.splitlines()
    count = 8 if case in ("recovery-repeat", "recovery-limit") else 1
    if lines.count("kernel:client-elf-loaded entry=0x40000010") != 1:
        errors.append("client ELF entry was not loaded exactly once")
    if lines.count("kernel:document-serve pid=0 result=-13") != 1:
        errors.append("client acquired service-only operation")
    for pid, expected in ((0, 1), (1, count + 1)):
        for operation in (3, 4):
            if lines.count(f"kernel:ipc-result pid={pid} op={operation} result=-13") != expected:
                errors.append("wrong-operation startup handle was not rejected")
            invalid = expected + (count if pid == 0 else 0)
            if lines.count(f"kernel:ipc-result pid={pid} op={operation} result=-9") != invalid:
                errors.append("unissued or stale startup handle was not rejected")
    loaded = re.findall(r"kernel:service-elf-loaded generation=(\d+) entry=(0x[0-9a-f]+)", output)
    if loaded != [(str(g), "0x40000010") for g in range(count + 1)]:
        errors.append("service did not load ELF entry for every generation")
    live = re.findall(r"kernel:recovery-live generation=(\d+) free=(\d+)", output)
    reclaimed = re.findall(r"kernel:service-reclaimed generation=(\d+) free=(\d+)", output)
    failures = count + (case == "recovery-limit")
    if [int(g) for g, _ in live] != list(range(count + 1)) or len({f for _, f in live}) != 1:
        errors.append("restart generations or live frame counts differ")
    if ([int(g) for g, _ in reclaimed] != list(range(failures))
            or len({f for _, f in reclaimed}) != 1
            or not live or not reclaimed or int(reclaimed[0][1]) <= int(live[0][1])):
        errors.append("service reclamation did not preserve client frames")
    statuses = [int(n) for n in re.findall(r"^kernel:document-response status=(-?\d+)$", output, re.M)]
    if statuses != [-9, -9, 0] * count:
        errors.append("old document grant accepted or resumed read missing")
    for marker, expected in (("kernel:reconnect pid=0 result=24", count),
            ("kernel:reconnect pid=0 result=-14", count),
            ("kernel:reconnect pid=0 result=-22", count),
            ("kernel:reconnect pid=0 result=-11", 2 if case == "recovery-limit" else 1),
            ("kernel:reconnect pid=1 result=-13", count + 1),
            ("kernel:documents-clean", 1)):
        if lines.count(marker) != expected:
            errors.append(f"missing recovery evidence: {marker}")
    disconnects = sum(lines.count(marker) for marker in
                     ("kernel:ipc-wake pid=0 result=-32", "kernel:ipc-result pid=0 op=4 result=-32"))
    if disconnects != failures:
        errors.append("client did not observe every service disconnect")
    if case == "recovery-budget":
        if lines.count("kernel:budget-stopped pid=1 ticks=64") != 1:
            errors.append("service CPU budget did not stop the hog")
    elif case != "recovery-exit":
        if lines.count("kernel:user-stopped pid=1 vector=6 error=0x0 address=0x0") != failures:
            errors.append("missing service faults")
    if case == "recovery-allocation":
        rollback = re.findall(r"kernel:restart-allocation-rollback free=(\d+)", output)
        if len(rollback) != 1 or not reclaimed or rollback[0] != reclaimed[0][1]:
            errors.append("failed restart leaked frames")
        if lines.count("kernel:reconnect pid=0 result=-12") != 1:
            errors.append("allocation failure not reported to client")
    return errors


def verify_elf(case: str, output: str) -> list[str]:
    errors = []
    lines = output.splitlines()
    baseline = re.search(r"kernel:allocation-rollback boundaries=\d+ free=(\d+)", output)
    clean = re.search(r"kernel:elf-clean free=(\d+)", output)
    if not baseline or not clean or baseline[1] != clean[1]:
        errors.append("ELF process frames did not return to baseline")
    roots = re.search(r"kernel:user-spaces-ready roots=(0x[0-9a-f]+),(0x[0-9a-f]+)", output)
    if not roots or roots[1] == roots[2]:
        errors.append("ELF processes share a root")
    faults = {"elf-fault": "vector=6 error=0x0 address=0x0",
              "elf-readonly": "vector=14 error=0x7 address=0x40000000",
              "elf-noexecute": "vector=14 error=0x15 address=0x60000000"}
    for pid in (0, 1):
        for marker in (f"kernel:reaped pid={pid}", f"kernel:user-yield pid={pid}",
                       f"kernel:syscall-rejected pid={pid} reason=number",
                       f"kernel:elf-loaded pid={pid} entry=0x40000010"):
            if lines.count(marker) != 1:
                errors.append(f"missing ELF evidence: {marker}")
        expected = f"kernel:user-stopped pid=0 {faults[case]}" if pid == 0 and case in faults else f"kernel:user-exit pid={pid} status=0"
        if lines.count(expected) != 1:
            errors.append("incorrect ELF process termination")
        stopped = output.find(expected)
        if stopped >= 0:
            later = output[output.find("\n", stopped) + 1:]
            if re.search(rf"(?:kernel:(?:user-trap|preempt) pid={pid} |user:log pid={pid} |kernel:user-switch from=\d+ to={pid}(?:\r?\n|$))", later):
                errors.append("stopped ELF process resumed")
    if case in faults and output.find("kernel:user-stopped pid=0") > output.find("user:log pid=1 hex=6f6b"):
        errors.append("survivor did not progress after ELF process fault")
    if case == "elf-reject":
        rejected = re.findall(r"kernel:elf-rejected reason=(\S+) free=(\d+)", output)
        if [reason for reason, _ in rejected] != ["header", "dynamic", "interpreter", "permissions", "kernel-address", "overlap", "entry", "overflow", "truncated"] or not baseline or any(free != baseline[1] for _, free in rejected):
            errors.append("missing malformed ELF rejection or leaked frames")
    if case == "elf-rollback":
        rollback = re.search(r"kernel:elf-rollback boundaries=(\d+) free=(\d+)", output)
        if not rollback or int(rollback[1]) < 8 or not baseline or rollback[2] != baseline[1]:
            errors.append("ELF allocation rollback incomplete")
    return errors


def qemu_path(path: Path) -> str:
    # Commas delimit QEMU suboptions; doubling preserves a literal comma.
    return path.resolve().as_posix().replace(",", ",,")


def source_digest() -> str:
    digest = hashlib.sha256()
    for path in sorted(ROOT.rglob("*")):
        relative = path.relative_to(ROOT)
        if any(part in ("target", "out", "__pycache__") for part in relative.parts):
            continue
        if path.is_file():
            digest.update(relative.as_posix().encode())
            digest.update(b"\0")
            digest.update(path.read_bytes())
    return digest.hexdigest()


def run(args: argparse.Namespace) -> int:
    qemu = args.qemu.resolve()
    firmware = args.firmware_dir.resolve()
    code = firmware / "edk2-x86_64-code.fd"
    variables = firmware / "edk2-i386-vars.fd"
    for path in (qemu, code, variables):
        if not path.is_file():
            raise RuntimeError(f"Required tool/firmware missing: {path}")
    rust = checked(["rustc", "+stable", "--version"]).strip()
    if rust.split()[1] != EXPECTED_RUST:
        raise RuntimeError(f"Expected Rust {EXPECTED_RUST}; found {rust}; no toolchain was changed")
    qemu_version = checked([str(qemu), "--version"]).splitlines()[0]
    if qemu_version != f"QEMU emulator version {EXPECTED_QEMU}":
        raise RuntimeError(f"Expected QEMU {EXPECTED_QEMU}; found {qemu_version}")
    out = ROOT / "out"
    out.mkdir(exist_ok=True)
    kernel = ROOT / "target/x86_64-unknown-none/release/elysia-kernel"
    user_elf = ROOT / "target/x86_64-unknown-none/release/elysia-user-probe"
    service_elf = ROOT / "target/x86_64-unknown-none/release/elysia-document-service"
    client_elf = ROOT / "target/x86_64-unknown-none/release/elysia-document-client"
    for package, directory in (("elysia-user-probe", "probe"), ("elysia-document-service", "document-service"), ("elysia-document-client", "document-client")):
        print(f"Building {package}", flush=True)
        print(checked([
            "cargo", "+stable", "rustc", "--locked", "-p", package,
            "--target", "x86_64-unknown-none", "--release", "--",
            "-C", "relocation-model=static",
            "-C", f"link-arg=-T{ROOT / 'apps' / directory / 'linker.ld'}", "-C", "link-arg=--build-id=none",
        ]), end="", flush=True)
    kernel_environment = os.environ.copy()
    kernel_environment["ELYSIA_USER_ELF"] = str(user_elf)
    kernel_environment["ELYSIA_SERVICE_ELF"] = str(service_elf)
    kernel_environment["ELYSIA_CLIENT_ELF"] = str(client_elf)
    print("Building kernel", flush=True)
    print(checked([
        "cargo", "+stable", "rustc", "--locked", "-p", "elysia-kernel", "--bin", "elysia-kernel",
        "--target", "x86_64-unknown-none", "--release", "--",
        "-C", "relocation-model=static",
        "-C", f"link-arg=-T{ROOT / 'kernel/linker.ld'}", "-C", "link-arg=--build-id=none",
    ], env=kernel_environment), end="", flush=True)
    results = []
    selected = list(CASES) if args.case == "all" else [args.case]
    for case in selected:
        print(f"Testing {case}", flush=True)
        environment = os.environ.copy()
        environment.update(ELYSIA_KERNEL_PATH=str(kernel), ELYSIA_BOOT_MODE=case)
        print(checked([
            "cargo", "+stable", "build", "--locked", "-p", "elysia-bootloader",
            "--bin", "elysia-bootloader", "--target", "x86_64-unknown-uefi", "--release",
        ], env=environment), end="", flush=True)
        case_dir = out / case
        esp = case_dir / "esp"
        boot = esp / "EFI/BOOT"
        boot.mkdir(parents=True, exist_ok=True)
        loader = boot / "BOOTX64.EFI"
        shutil.copyfile(ROOT / "target/x86_64-unknown-uefi/release/elysia-bootloader.efi", loader)
        mutable_vars = case_dir / "vars.fd"
        shutil.copyfile(variables, mutable_vars)
        command = [
            str(qemu), "-machine", MACHINE, "-accel", "tcg", "-cpu", "qemu64",
            "-smp", "1", "-m", "256M", "-nodefaults", "-no-user-config",
            "-display", "none", "-monitor", "none", "-serial", "stdio",
            "-nic", "none", "-no-reboot",
            "-device", "isa-debug-exit,iobase=0xf4,iosize=0x04",
            "-drive", f"if=pflash,format=raw,readonly=on,file={qemu_path(code)}",
            "-drive", f"if=pflash,format=raw,file={qemu_path(mutable_vars)}",
            "-drive", f"if=none,id=esp,format=raw,readonly=on,file=fat:ro:{qemu_path(esp)}",
            "-device", "virtio-blk-pci,drive=esp,bootindex=1",
        ]
        started = time.monotonic()
        try:
            if case in PERSISTENCE_CASES:
                returncode, output, errors = persistence_exercise(command, case, case_dir, args.timeout, execute, verify_output)
            else:
                result = execute(command, timeout=args.timeout)
                output = result.stdout
                errors = verify_output(case, result.returncode, output)
                returncode = result.returncode
        except subprocess.TimeoutExpired as exc:
            raw = exc.stdout or b""
            output = raw.decode("utf-8", "replace") if isinstance(raw, bytes) else raw
            errors = ["QEMU timed out; the process was killed"]
            returncode = None
        duration = round(time.monotonic() - started, 3)
        (case_dir / "serial.log").write_text(output, encoding="utf-8")
        record = {
            "case": case, "passed": not errors, "exit_code": returncode,
            "seconds": duration, "errors": errors, "loader_sha256": sha256(loader),
        }
        results.append(record)
        print(json.dumps(record), flush=True)
    report = {
        "recorded_at_utc": datetime.now(timezone.utc).isoformat(),
        "rust": rust, "qemu": qemu_version, "machine": MACHINE,
        "memory_mib": 256, "vcpus": 1, "accelerator": "tcg", "network": "none",
        "qemu_sha256": sha256(qemu), "firmware_code_sha256": sha256(code),
        "firmware_vars_sha256": sha256(variables), "kernel_sha256": sha256(kernel),
        "native_os_source_sha256": source_digest(), "user_elf_sha256": sha256(user_elf), "service_elf_sha256": sha256(service_elf), "client_elf_sha256": sha256(client_elf), "cases": results,
    }
    (out / "results.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return 0 if all(case["passed"] for case in results) else 1


def main() -> int:
    default_tools = ROOT.parent / ".tools/qemu"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--qemu", type=Path, default=default_tools / "qemu-system-x86_64.exe")
    parser.add_argument("--firmware-dir", type=Path, default=default_tools / "share")
    parser.add_argument("--case", choices=["all", *CASES], default="all")
    parser.add_argument("--timeout", type=float, default=45)
    args = parser.parse_args()
    if not 1 <= args.timeout <= 120:
        parser.error("--timeout must be between 1 and 120 seconds")
    try:
        return run(args)
    except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
        print(f"Boot test failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
