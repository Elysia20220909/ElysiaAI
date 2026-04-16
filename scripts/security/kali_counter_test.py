import os

import requests


# --- Config ---
API_BASE = "http://127.0.0.1:8000"


def print_test(name):
    print(f"\n[Kali Countermeasure] Testing: {name}")


def test_hydra_brute_force():
    print_test("Hydra (Brute Force / Hydra)")
    forbidden_count = 0
    banned = False

    print(">> Sending 10 unauthorized requests to trigger BAN...")
    for i in range(10):
        try:
            resp = requests.get(f"{API_BASE}/resonance", headers={"x-api-key": f"WRONG-{i}"}, timeout=2)
            if resp.status_code == 403:
                forbidden_count += 1
                if "Banned" in resp.text:
                    banned = True
                    break
        except Exception as e:
            print(f"! Connection error: {e}")
            break

    if banned:
        print("[OK] SUCCESS: IP was Banned after multiple failures.")
    else:
        print(f"[X] FAILURE: IP was not banned. Forbidden calls: {forbidden_count}")


def test_gobuster_traversal():
    print_test("Gobuster (Directory Traversal / ../)")
    payload = {"target_prompt_file": "../../.env"}
    try:
        # We need a valid API key to reach the sandbox endpoint logic
        api_key = os.getenv("FASTAPI_API_KEY", "")
        resp = requests.post(f"{API_BASE}/sandbox/execute", headers={"x-api-key": api_key}, json=payload, timeout=5)
        if resp.status_code == 403 and "outside sandbox" in resp.text:
            print("[OK] SUCCESS: Directory traversal blocked by Chroot.")
        else:
            print(f"[X] FAILURE: Traversal may have worked? Status: {resp.status_code}, Resp: {resp.text[:50]}")
    except Exception as e:
        print(f"! Connection error: {e}")


def test_zap_info_exposure():
    print_test("ZAP (Information Exposure / str(e))")
    # Trigger a 500 error by requesting a non-existent allowed file
    payload = {"target_prompt_file": "missing_but_safe.prompt.txt"}
    try:
        api_key = os.getenv("FASTAPI_API_KEY", "")
        resp = requests.post(f"{API_BASE}/sandbox/execute", headers={"x-api-key": api_key}, json=payload, timeout=5)
        if resp.status_code == 500:
            if "Tracker ID:" in resp.text and "FileNotFoundError" not in resp.text:
                print("[OK] SUCCESS: Error message masked with Tracker ID. Path info hidden.")
            else:
                print(f"[X] FAILURE: Potential exposure. Resp: {resp.text}")
        else:
            print(f"! Note: Endpoint returned {resp.status_code} (maybe file exists?)")
    except Exception as e:
        print(f"! Connection error: {e}")


if __name__ == "__main__":
    print("[ ElysiaAI Advanced Red Team Diagnostic (Kali Countermeasures) ]")
    test_hydra_brute_force()
    test_gobuster_traversal()
    test_zap_info_exposure()
    print("\n--- Diagnostic Complete ---")
