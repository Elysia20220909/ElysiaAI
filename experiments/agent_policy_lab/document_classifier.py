"""Learn a bounded integer document classifier; export held-out features for Ring 3.

Reads only the checked-in corpus allowlist. No document instructions are executed.
Features omit file paths, labels, URLs, code blocks, inline code and headings.
"""

import argparse
import hashlib
import json
import platform
import re
import struct
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CORPUS = Path(__file__).with_name("document_corpus.json")
FEATURES = 64
MAX_DOCUMENT_BYTES = 128 * 1024
COUNT = 8
ROWS = 264
ROW_SIZE = 68
PACKET_SIZE = ROWS + ROW_SIZE * COUNT + 4
GOAL = b"elysia:document-classifier:v0001"


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def checksum(data):
    value = 2166136261
    for byte in data:
        value = ((value ^ byte) * 16777619) & 0xFFFFFFFF
    return value


def tokens(text):
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"https?://\S+|`[^`]*`", " ", text)
    text = "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("#"))
    result = {"w:" + word for word in re.findall(r"[a-z][a-z0-9_]{2,}", text.lower())}
    for run in re.findall(r"[\u3040-\u30ff\u3400-\u9fff]{2,}", text):
        result.update("j:" + run[i : i + 2] for i in range(len(run) - 1))
    return result


def read_document(root, entry):
    relative = Path(entry["path"])
    path = (root / relative).resolve()
    if (
        relative.is_absolute()
        or ".." in relative.parts
        or not path.is_relative_to(root.resolve() / "docs")
        or path.suffix != ".md"
    ):
        raise ValueError("document outside the repository docs allowlist")
    with path.open("rb") as stream:
        raw = stream.read(MAX_DOCUMENT_BYTES + 1)
    if not raw or len(raw) > MAX_DOCUMENT_BYTES:
        raise ValueError("document size outside the corpus limit")
    return {**entry, "sha256": digest(raw), "bytes": len(raw), "tokens": tokens(raw.decode("utf-8-sig"))}


def load_manifest():
    manifest = json.loads(CORPUS.read_text(encoding="utf-8"))
    entries = manifest["documents"]
    if manifest["version"] != 1 or len(entries) != 20:
        raise ValueError("unsupported corpus")
    if len({e["id"] for e in entries}) != len(entries) or len({e["path"] for e in entries}) != len(entries):
        raise ValueError("duplicate corpus document")
    if any(e["label"] not in (0, 1) or e["split"] not in ("train", "evaluation") for e in entries):
        raise ValueError("invalid corpus label or split")
    for split, count in (("train", 6), ("evaluation", 4)):
        if [sum(e["split"] == split and e["label"] == c for e in entries) for c in (0, 1)] != [count, count]:
            raise ValueError("unexpected class balance")
    ids = [e["id"] for e in entries]
    if any(type(i) is not int or not 0 < i <= 0xFFFFFFFF for i in ids) or ids != sorted(ids):
        raise ValueError("document IDs must be ascending positive u32 values")
    return manifest


def fit(training):
    if not training or any(e["split"] != "train" for e in training):
        raise ValueError("only training documents may fit the model")
    counts = [sum(e["label"] == c for e in training) for c in range(2)]
    if counts != [6, 6]:
        raise ValueError("expected six training documents per class")
    frequencies = [Counter(t for e in training if e["label"] == c for t in e["tokens"]) for c in range(2)]
    vocabulary = set(frequencies[0]) | set(frequencies[1])
    # Feature selection uses training document frequency only; ties are lexical.
    ordered = sorted(vocabulary, key=lambda t: (-abs(frequencies[0][t] - frequencies[1][t]), t))
    vocabulary = ordered[:FEATURES]
    if len(vocabulary) != FEATURES:
        raise ValueError("not enough training features")
    prototypes = [[(255 * freq[t] + 3) // 6 for t in vocabulary] for freq in frequencies]
    native, host = prototypes
    weights = [2 * (a - b) for a, b in zip(native, host, strict=True)]
    bias = sum(b * b - a * a for a, b in zip(native, host, strict=True))
    return {
        "version": 1,
        "algorithm": "integer-nearest-centroid",
        "tokenizer": "body-binary-v1",
        "vocabulary": vocabulary,
        "weights": weights,
        "bias": bias,
        "training": [{k: e[k] for k in ("id", "path", "sha256", "label")} for e in training],
        "goal": GOAL.decode("ascii"),
    }


def features(model, document):
    return [255 if token in document["tokens"] else 0 for token in model["vocabulary"]]


def predict(model, vector):
    if len(vector) != FEATURES or any(v not in (0, 255) for v in vector):
        raise ValueError("invalid document feature vector")
    score = model["bias"] + sum(w * v for w, v in zip(model["weights"], vector, strict=True))
    # Scores are a distance difference, not calibrated probabilities; a tie abstains.
    return score, 0 if score > 0 else 1 if score < 0 else 2


def packet(model, evaluation):
    if len(evaluation) != COUNT:
        raise ValueError("expected eight held-out documents")
    training = model["training"]
    if any(
        e["split"] != "evaluation" or any(e[k] == t[k] for t in training for k in ("id", "path", "sha256"))
        for e in evaluation
    ):
        raise ValueError("evaluation overlaps model training")
    ids = [e["id"] for e in evaluation]
    if any(type(i) is not int or not 0 < i <= 0xFFFFFFFF for i in ids) or ids != sorted(set(ids)):
        raise ValueError("document IDs must be ascending positive u32 values")
    data = bytearray(PACKET_SIZE)
    struct.pack_into("<8sHHHH", data, 0, b"ELYDOC01", 1, FEATURES, COUNT, ROW_SIZE)
    data[16:48] = GOAL
    data[48:80] = bytes.fromhex(digest(canonical(model)))
    identities = [{k: e[k] for k in ("id", "path", "sha256")} for e in evaluation]
    data[80:112] = bytes.fromhex(digest(canonical(identities)))
    struct.pack_into("<64h", data, 128, *model["weights"])
    struct.pack_into("<i", data, 256, model["bias"])
    for i, document in enumerate(evaluation):
        offset = ROWS + i * ROW_SIZE
        struct.pack_into("<I", data, offset, document["id"])
        data[offset + 4 : offset + ROW_SIZE] = bytes(features(model, document))
    struct.pack_into("<I", data, len(data) - 4, checksum(data[:-4]))
    return bytes(data)


def evaluate(model, evaluation):
    outcomes = []
    for e in evaluation:
        vector = features(model, e)
        score, prediction = predict(model, vector)
        outcomes.append(
            {
                **{k: e[k] for k in ("id", "path", "sha256", "bytes", "label")},
                "score": score,
                "prediction": prediction,
                "correct": prediction == e["label"],
            }
        )
    correct = sum(e["correct"] for e in outcomes)
    selected = [e for e in outcomes if e["prediction"] == 0]
    true_positive = sum(e["label"] == 0 for e in selected)
    return {
        "algorithm": model["algorithm"],
        "training_documents": len(model["training"]),
        "evaluation": outcomes,
        "correct": correct,
        "total": COUNT,
        "constant_native_baseline_correct": 4,
        "native_precision": true_positive / len(selected) if selected else 0,
        "native_recall": true_positive / 4,
        "quality_target": "at least 6/8 correct and native precision >= 0.75; fixed before evaluation",
        "quality_target_met": correct >= 6 and bool(selected) and true_positive * 4 >= len(selected) * 3,
        "candidates": [e["path"] for e in selected],
        "labels_in_guest_packet": False,
    }


def run(output):
    output.mkdir(parents=True, exist_ok=False)
    manifest = load_manifest()
    training = [read_document(ROOT, e) for e in manifest["documents"] if e["split"] == "train"]
    model = fit(training)
    frozen = canonical(model)
    (output / "frozen-model.json").write_bytes(frozen + b"\n")
    # No evaluation document is read before fitting and freezing the model.
    evaluation = [read_document(ROOT, e) for e in manifest["documents"] if e["split"] == "evaluation"]
    if len({e["sha256"] for e in training + evaluation}) != len(training + evaluation):
        raise ValueError("duplicate content across corpus documents")
    bundle = packet(model, evaluation)
    (output / "document-bundle.bin").write_bytes(bundle)
    summary = {
        "completed": True,
        "python": platform.python_version(),
        "platform": platform.platform(),
        "source_sha256": digest(Path(__file__).read_bytes()),
        "corpus_sha256": digest(CORPUS.read_bytes()),
        "model_sha256": digest(frozen),
        "bundle_sha256": digest(bundle),
        **evaluate(model, evaluation),
    }
    (output / "results.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {k: summary[k] for k in ("correct", "total", "native_precision", "native_recall", "quality_target_met")}
        )
    )
    return summary


def verify_artifacts(directory):
    """Reconstruct the frozen experiment from allowlisted sources, without editing it.

    Guest hashes are identifiers, not signatures. This trusted-host comparison
    binds every weight and feature byte to the actual frozen model and documents.
    """
    manifest = load_manifest()
    documents = [read_document(ROOT, e) for e in manifest["documents"]]
    if len({e["sha256"] for e in documents}) != len(documents):
        raise ValueError("duplicate corpus content")
    model = fit([e for e in documents if e["split"] == "train"])
    frozen = canonical(model)
    bundle = packet(model, [e for e in documents if e["split"] == "evaluation"])
    if (directory / "frozen-model.json").read_bytes() != frozen + b"\n" or (
        directory / "document-bundle.bin"
    ).read_bytes() != bundle:
        raise ValueError("frozen model or input differs from allowlisted source documents")
    report = json.loads((directory / "results.json").read_text(encoding="utf-8"))
    expected = {
        "completed": True,
        "source_sha256": digest(Path(__file__).read_bytes()),
        "corpus_sha256": digest(CORPUS.read_bytes()),
        "model_sha256": digest(frozen),
        "bundle_sha256": digest(bundle),
        **evaluate(model, [e for e in documents if e["split"] == "evaluation"]),
    }
    if any(report.get(k) != v for k, v in expected.items()):
        raise ValueError("frozen evaluation report does not match its sources")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    run(args.output)


if __name__ == "__main__":
    main()
