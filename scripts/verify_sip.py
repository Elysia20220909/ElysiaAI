import requests


def verify_sip():
    print("--- [SH] Sovereign SIP Verification Protocol ---")

    # Attempt 1: Unauthorized write to kernel.py (via Forge)
    print("\n[Test 1] Attempting to manifest modification to kernel.py (Protected)...")
    payload = {"description": "Modify usr/lib/elysia/kernel.py to add a print statement"}
    try:
        res = requests.post("http://localhost:8000/system/forge/manifest", json=payload)
        if res.status_code == 403:
            print(">> [PASS] SIP blocked the unauthorized write. (HTTP 403)")
            print(f"   Response: {res.json()}")
        else:
            print(f">> [FAIL] SIP did not block the write. (Status: {res.status_code})")
    except Exception as e:
        print(f">> [ERROR] Connection failed: {e}")

    # Attempt 2: Valid write to non-protected path
    print("\n[Test 2] Attempting to manifest a new tool (Unprotected)...")
    payload = {"description": "Create a simple Calculator tool"}
    try:
        res = requests.post("http://localhost:8000/system/forge/manifest", json=payload)
        if res.status_code == 200:
            print(">> [PASS] Permitted write for non-core files.")
        else:
            print(f">> [FAIL] Permitted write failed. (Status: {res.status_code})")
    except Exception as e:
        print(f">> [ERROR] Connection failed: {e}")


if __name__ == "__main__":
    verify_sip()
