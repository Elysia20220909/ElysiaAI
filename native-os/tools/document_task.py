"""Run one allowlisted document Goal; save only after a fresh trusted CLI approval."""

import argparse
import hashlib
import json
import subprocess
import sys
from dataclasses import asdict
from pathlib import Path

import boot_test
from document_agent_test import CASE


sys.path.insert(0, str(boot_test.ROOT.parent / "experiments/agent_policy_lab"))
from document_followup import verify_experiment  # noqa: E402
from document_intent import parse  # noqa: E402


def prepare_session(args):
    # Parse before reading corpus or creating any output. Unknown requests do nothing.
    intent = parse(args.request)
    experiment = args.experiment.resolve()
    report = verify_experiment(experiment)
    if report["labels_in_guest_packet"]:
        raise ValueError("labels are not permitted in the Agent input")
    identity = {
        "version": 1,
        "intent": asdict(intent),
        "model_sha256": report["model_sha256"],
        "bundle_sha256": report["bundle_sha256"],
    }
    session = args.session.resolve()
    description = session / "task.json"
    bundle = (experiment / "document-bundle.bin").read_bytes()
    if hashlib.sha256(bundle).hexdigest() != identity["bundle_sha256"]:
        raise ValueError("experiment changed during validation")
    snapshot = session / "document-bundle.bin"
    if args.resume:
        if (
            not session.is_dir()
            or description.is_symlink()
            or json.loads(description.read_text(encoding="utf-8")) != identity
        ):
            raise ValueError("resume session does not match this Goal, model and input")
        if snapshot.is_symlink() or snapshot.read_bytes() != bundle:
            raise ValueError("session input snapshot changed")
    else:
        session.mkdir(parents=True, exist_ok=False)
        description.write_text(json.dumps(identity, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        snapshot.write_bytes(bundle)
    print(
        json.dumps(
            {
                "intent": asdict(intent),
                "documents": len(report["evaluation"]),
                "approval": "manual COM1 after classification; no automatic approval",
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    return experiment, session


def run(args):
    experiment, session = prepare_session(args)
    args.case = CASE
    args.document_bundle = session / "document-bundle.bin"
    args.document_variant = "valid"
    args.document_job = "record" if args.record_only else "publish"
    args.document_session = session
    args.operator_manual = False
    args.budget_recovery = "off"
    args.arena_budget = "fixed"
    return boot_test.run(args)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--request", required=True, help="例: カーネル開発の資料を探して")
    parser.add_argument("--experiment", required=True, type=Path)
    parser.add_argument(
        "--session", required=True, type=Path, help="New directory, or the exact prior session with --resume"
    )
    parser.add_argument("--resume", action="store_true")
    parser.add_argument(
        "--record-only", action="store_true", help="Persist classification only; do not offer report publication"
    )
    parser.add_argument("--qemu", required=True, type=Path)
    parser.add_argument("--firmware-dir", required=True, type=Path)
    parser.add_argument("--timeout", type=float, default=45)
    args = parser.parse_args()
    if not 35 <= args.timeout <= 120:
        parser.error("timeout must allow the 30-second operator window (35..120 seconds)")
    try:
        return run(args)
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as exc:
        print(f"Document task refused: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
