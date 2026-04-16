import os

from fastapi.testclient import TestClient

from usr.lib.elysia.kernel import app, parse_tool_calls


client = TestClient(app)
API_KEY = os.getenv("FASTAPI_API_KEY", "")


def test_health_check_status():
    """Verify that the kernel reports as healthy."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "embedding_provider" in data


def test_system_monitor_structure():
    """Verify that the system monitor returns structured telemetry data."""
    # Note: Requires x-api-key in actual use
    response = client.get("/system/monitor", headers={"x-api-key": API_KEY})
    assert response.status_code == 200
    data = response.json()
    assert "system" in data
    assert "cpu" in data["system"]
    assert "ram" in data["system"]
    assert "elysia" in data


def test_tool_call_parsing_python():
    """Verify that the regex parser correctly identifies execute_python tags."""
    sample_text = "Here is the code: <execute_python>print('hello')</execute_python> Hope it helps!"
    calls = parse_tool_calls(sample_text)
    assert len(calls) == 1
    assert calls[0]["tool"] == "execute_python"
    assert calls[0]["code"] == "print('hello')"


def test_tool_call_parsing_persona():
    """Verify that the regex parser correctly identifies switch_persona tags."""
    sample_text = "Switching now. <switch_persona>cyrene</switch_persona>"
    calls = parse_tool_calls(sample_text)
    assert len(calls) == 1
    assert calls[0]["tool"] == "switch_persona"
    assert calls[0]["name"] == "cyrene"


def test_vault_defenses_unauthorized():
    """Verify that the Vault Defenses block unauthorized access."""
    response = client.get("/system/monitor", headers={"x-api-key": "WRONG_KEY"})
    assert response.status_code == 403
    assert "Vault Defenses Activated" in response.json()["message"]
