import contextlib
import copy
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import document_classifier as dc


class DocumentClassifierTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.entries = dc.load_manifest()["documents"]
        cls.documents = [dc.read_document(dc.ROOT, e) for e in cls.entries]
        cls.training = [e for e in cls.documents if e["split"] == "train"]
        cls.evaluation = [e for e in cls.documents if e["split"] == "evaluation"]
        cls.model = dc.fit(cls.training)

    def test_features_are_body_only_and_evaluation_cannot_fit(self):
        value = "# HiddenHeading\n```\nSecretCode\n```\n`SecretInline` [VisibleWord](https://hidden.example)"
        self.assertEqual(dc.tokens(value), {"w:visibleword"})
        with self.assertRaises(ValueError):
            dc.fit(self.training + self.evaluation)
        changed = copy.deepcopy(self.evaluation)
        for e in changed:
            e["tokens"] = {"heldout-new-word"}
            e["label"] = 1 - e["label"]
        dc.packet(self.model, changed)
        self.assertEqual(dc.fit(self.training), self.model)
        self.assertNotIn("heldout-new-word", self.model["vocabulary"])

    def test_packet_does_not_include_labels_and_rejects_training(self):
        packet = dc.packet(self.model, self.evaluation)
        changed = copy.deepcopy(self.evaluation)
        for e in changed:
            e["label"] = 1 - e["label"]
        self.assertEqual(packet, dc.packet(self.model, changed))
        self.assertEqual(len(packet), 812)
        with self.assertRaises(ValueError):
            dc.packet(self.model, self.training[:8])
        changed[0]["sha256"] = self.training[0]["sha256"]
        with self.assertRaises(ValueError):
            dc.packet(self.model, changed)

    def test_centroid_distance_and_tie(self):
        model = {"weights": [2] + [0] * 63, "bias": -255}
        self.assertEqual(dc.predict(model, [255] + [0] * 63), (255, 0))
        self.assertEqual(dc.predict(model, [0] * 64), (-255, 1))
        model["bias"] = 0
        self.assertEqual(dc.predict(model, [0] * 64), (0, 2))
        with self.assertRaises(ValueError):
            dc.predict(model, [1] * 64)

    def test_allowlist_rejects_escape_empty_and_oversize(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "docs").mkdir()
            path = root / "docs/a.md"
            path.write_bytes(b"")
            for name in ("docs/../a.md", "a.md", str(path.resolve())):
                with self.assertRaises(ValueError):
                    dc.read_document(root, {"path": name})
            for raw in (b"", b"x" * (dc.MAX_DOCUMENT_BYTES + 1)):
                path.write_bytes(raw)
                with self.assertRaises(ValueError):
                    dc.read_document(root, {"path": "docs/a.md"})

    def test_manifest_balance_and_ids(self):
        original = dc.load_manifest()
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "corpus.json"
            for field, value in (("label", 0), ("id", 0), ("id", 1)):
                changed = copy.deepcopy(original)
                changed["documents"][-1][field] = value
                path.write_text(json.dumps(changed), encoding="utf-8")
                with patch.object(dc, "CORPUS", path), self.assertRaises(ValueError):
                    dc.load_manifest()

    def test_frozen_artifacts_bind_every_byte_and_result(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "experiment"
            with contextlib.redirect_stdout(io.StringIO()):
                dc.run(output)
            self.assertTrue(dc.verify_artifacts(output)["completed"])
            packet_path = output / "document-bundle.bin"
            original = packet_path.read_bytes()
            changed = bytearray(original)
            changed[128] ^= 1
            # Even an attacker who reseals FNV cannot reuse trusted model identity.
            changed[-4:] = dc.checksum(changed[:-4]).to_bytes(4, "little")
            packet_path.write_bytes(changed)
            with self.assertRaises(ValueError):
                dc.verify_artifacts(output)
            packet_path.write_bytes(original)
            report_path = output / "results.json"
            report = json.loads(report_path.read_text(encoding="utf-8"))
            report["evaluation"][0]["score"] += 1
            report_path.write_text(json.dumps(report), encoding="utf-8")
            with self.assertRaises(ValueError):
                dc.verify_artifacts(output)


if __name__ == "__main__":
    unittest.main()
