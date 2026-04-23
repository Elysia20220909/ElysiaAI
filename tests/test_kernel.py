from fastapi.testclient import TestClient

from kernel.main import app


client = TestClient(app)

def test_health_check():
    """システムのヘルスチェックエンドポイントを検証"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "ok"
    assert "ollama" in data

def test_ledger_file_exists():
    """AEGIS Ledgerが正しく作成されているか確認"""
    import os
    ledger_path = "./workspace/aegis_ledger.jsonl"
    # テスト環境でもディレクトリが必要
    if not os.path.exists("./workspace"):
        os.makedirs("./workspace")
    # 存在確認
    assert os.path.exists(ledger_path)
