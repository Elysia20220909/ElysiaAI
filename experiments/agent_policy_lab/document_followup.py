"""Evaluate a fixed classifier on a separately selected, source-pinned corpus."""

import argparse
import json
import platform
from pathlib import Path

import document_classifier as dc


CORPUS = Path(__file__).with_name("document_followup_corpus.json")
MODEL_SHA256 = "09399994c34ea7318b132ae63e3a463247974a431098325769f2a27a239ceb79"


def material(model_path):
    frozen = model_path.read_bytes()
    model = json.loads(frozen)
    if frozen != dc.canonical(model) + b"\n" or dc.digest(dc.canonical(model)) != MODEL_SHA256:
        raise ValueError("follow-up evaluation requires the unchanged original model")
    manifest = json.loads(CORPUS.read_text(encoding="utf-8"))
    entries = manifest["documents"]
    if (
        manifest["version"] != 1
        or manifest["model_sha256"] != MODEL_SHA256
        or [e["id"] for e in entries] != list(range(21, 29))
        or [sum(e["label"] == c for e in entries) for c in (0, 1)] != [4, 4]
        or any(e["split"] != "evaluation" for e in entries)
    ):
        raise ValueError("invalid follow-up corpus")
    previous = dc.load_manifest()["documents"]
    old_paths = {e["path"] for e in previous}
    if len({e["path"] for e in entries}) != 8 or any(e["path"] in old_paths for e in entries):
        raise ValueError("follow-up overlaps a previous document")
    documents = [dc.read_document(dc.ROOT, e) for e in entries]
    if any(e["sha256"] != d["sha256"] for e, d in zip(entries, documents, strict=True)):
        raise ValueError("follow-up document changed since selection")
    old_hashes = {dc.read_document(dc.ROOT, e)["sha256"] for e in previous}
    if len({d["sha256"] for d in documents}) != 8 or any(d["sha256"] in old_hashes for d in documents):
        raise ValueError("follow-up duplicates previous content")
    bundle = dc.packet(model, documents)
    quality = dc.evaluate(model, documents)
    quality["abstained"] = sum(e["prediction"] == 2 for e in quality["evaluation"])
    quality["misclassified"] = sum(e["prediction"] != 2 and not e["correct"] for e in quality["evaluation"])
    quality["quality_target"] = "unchanged original threshold: >=6/8 correct and native precision >=0.75"
    summary = {
        "completed": True,
        "kind": "document-followup-v1",
        "model_sha256": MODEL_SHA256,
        "bundle_sha256": dc.digest(bundle),
        "corpus_sha256": dc.digest(CORPUS.read_bytes()),
        "source_sha256": dc.digest(Path(__file__).read_bytes()),
        "classifier_source_sha256": dc.digest(Path(dc.__file__).read_bytes()),
        "training_changed": False,
        **quality,
    }
    return frozen, bundle, summary


def run(model_path, output):
    # No fit call, vocabulary changes or threshold tuning occur on this path.
    frozen, bundle, summary = material(model_path)
    output.mkdir(parents=True, exist_ok=False)
    (output / "frozen-model.json").write_bytes(frozen)
    (output / "document-bundle.bin").write_bytes(bundle)
    summary.update(platform=platform.platform(), python=platform.python_version())
    (output / "results.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: summary[k] for k in ("correct", "total", "misclassified", "abstained", "quality_target_met")}))
    return summary


def verify_experiment(directory):
    report = json.loads((directory / "results.json").read_text(encoding="utf-8"))
    if report.get("kind") != "document-followup-v1":
        return dc.verify_artifacts(directory)
    _, bundle, expected = material(directory / "frozen-model.json")
    if (directory / "document-bundle.bin").read_bytes() != bundle or any(
        report.get(k) != v for k, v in expected.items()
    ):
        raise ValueError("follow-up artifacts differ from pinned source documents and model")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    run(args.model, args.output)


if __name__ == "__main__":
    main()
