import os
import sys
import unittest
import json
import shutil

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(os.path.join(PROJECT_ROOT, "usr", "lib", "elysia"))

from kernel import run_system_doctor

class TestSovereignSkills(unittest.TestCase):
    """
    Elysia OS: v3.0 Sovereign スキルのロジックテスト
    """

    def setUp(self):
        # テスト用のテンポラリディレクトリ作成
        self.test_var = os.path.join(PROJECT_ROOT, "var", "test_elysia")
        os.makedirs(self.test_var, exist_ok=True)

    def tearDown(self):
        # クリーンアップ
        if os.path.exists(self.test_var):
            shutil.rmtree(self.test_var)

    def test_system_doctor_output(self):
        """System Doctor が Night City 風のレポートを生成するか"""
        report = run_system_doctor()
        self.assertIn("NIGHT CITY // ELVSIΛ - SYSTEM DIAGNOSTIC", report)
        self.assertIn("CPU_LOAD:", report)
        self.assertIn("RAM_USE:", report)
        self.assertIn("[ICE_CHECK]", report)

    def test_soul_vault_structure(self):
        """Soul Vault (Memory) の書き込みロジックシミュレーション"""
        soul_path = os.path.join(self.test_var, "soul.json")
        test_data = {"affinity": {"value": "high", "updated_at": "now"}}
        
        with open(soul_path, "w", encoding="utf-8") as f:
            json.dump(test_data, f, indent=4)
            
        self.assertTrue(os.path.exists(soul_path))
        with open(soul_path, "r", encoding="utf-8") as f:
            loaded = json.load(f)
            self.assertEqual(loaded["affinity"]["value"], "high")

if __name__ == "__main__":
    unittest.main()
