from fastapi.testclient import TestClient

from usr.lib.elysia.kernel import app


client = TestClient(app)

def test_health_check():
    """システムのヘルスチェックエンドポイントを検証"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"
    assert "ollama" in data

def test_ledger_file_exists():
    """AEGIS Ledgerが正しく作成されているか確認"""
    import os
    ledger_path = "./AEGIS_LEDGER.md"
    assert os.path.exists(ledger_path)
