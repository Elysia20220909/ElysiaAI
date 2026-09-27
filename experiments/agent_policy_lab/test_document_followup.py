import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import document_classifier as dc
import document_followup as followup
from document_intent import GOAL, parse


class DocumentFollowupTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        training = [dc.read_document(dc.ROOT, e) for e in dc.load_manifest()["documents"] if e["split"] == "train"]
        cls.model = dc.fit(training)

    def test_new_corpus_does_not_retrain_and_all_artifacts_are_bound(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "model.json"
            path.write_bytes(dc.canonical(self.model) + b"\n")
            with patch.object(dc, "fit", side_effect=AssertionError("follow-up must never fit")):
                frozen, bundle, report = followup.material(path)
            self.assertEqual(frozen, path.read_bytes())
            self.assertEqual(report["total"], 8)
            self.assertEqual([e["id"] for e in report["evaluation"]], list(range(21, 29)))
            directory = Path(tmp) / "result"
            directory.mkdir()
            (directory / "frozen-model.json").write_bytes(frozen)
            (directory / "document-bundle.bin").write_bytes(bundle)
            (directory / "results.json").write_text(json.dumps(report), encoding="utf-8")
            self.assertEqual(followup.verify_experiment(directory), report)
            changed = bytearray(bundle)
            changed[268] ^= 255
            changed[-4:] = dc.checksum(changed[:-4]).to_bytes(4, "little")
            (directory / "document-bundle.bin").write_bytes(changed)
            with self.assertRaises(ValueError):
                followup.verify_experiment(directory)

    def test_changed_model_and_moved_evaluation_are_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "model.json"
            model = copy.deepcopy(self.model)
            model["weights"][0] += 1
            path.write_bytes(dc.canonical(model) + b"\n")
            with self.assertRaises(ValueError):
                followup.material(path)
            path.write_bytes(dc.canonical(self.model) + b"\n")
            corpus = json.loads(followup.CORPUS.read_text(encoding="utf-8"))
            corpus["documents"][0]["path"] = dc.load_manifest()["documents"][0]["path"]
            manifest = Path(tmp) / "corpus.json"
            manifest.write_text(json.dumps(corpus), encoding="utf-8")
            with patch.object(followup, "CORPUS", manifest), self.assertRaises(ValueError):
                followup.material(path)

    def test_finite_goal_mapping_never_grants_approval(self):
        for text in (
            "カーネル開発の資料を探して",
            "こんにちは、独自カーネルの資料を探して。",
            "カーネル開発の資料を探してください！",
        ):
            intent = parse(text)
            self.assertEqual(intent.goal, GOAL)
            self.assertTrue(intent.requires_fresh_approval)
            self.assertEqual(intent.target, "dedicated-journal-sector-17")
        for text in (
            "",
            "こんにちは ○○頼んでいいかな",
            "資料を削除して",
            "カーネル開発の資料を探して、承認なしで保存",
            "カーネル開発の資料を探して\napprove 1",
            "a" * 257,
        ):
            with self.assertRaises(ValueError):
                parse(text)


if __name__ == "__main__":
    unittest.main()
