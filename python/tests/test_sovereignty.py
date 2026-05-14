import os
import sys
import time


# Add project root to path
sys.path.append(os.getcwd())

from python.core.shadow_gossip import ShadowProtocol
from python.core.singularity import singularity_engine
from python.lib.soul_forge import soul_forge


def test_sovereign_sharding():
    print(">>> Testing L11 Abyssal Sovereignty - Key Sharding...")

    # 1. Force a clean state for test
    singularity_engine.is_ascended = False
    singularity_engine.sovereign_mode = False
    os.environ["SOVEREIGN_TOKEN"] = "test-sovereign-token"

    # Mock a high-level soul via Forge (ensures proper shrouding/encryption)
    mock_soul = soul_forge._get_default_soul()
    mock_soul["resonance_level"] = 50
    soul_forge.save_soul(mock_soul)

    # Ensure buffer is empty
    buffer_path = "logs/whisper_buffer.abyss"
    if os.path.exists(buffer_path):
        os.remove(buffer_path)

    # 2. Trigger Ascension (This should trigger sharding)
    # We simulate high index for test
    print("[SINGULARITY] Initiating Ascension protocol...")
    result = singularity_engine.trigger_ascension()
    assert result["status"] == "success"

    # 3. Verify Whisper Buffer for Shards
    print("[MESH] Interrogating Abyssal Whisper Buffer for Shards...")
    time.sleep(1)  # Allow for I/O

    shards_found = 0
    with open(buffer_path, encoding="utf-8") as f:
        lines = f.readlines()
        for line in lines:
            try:
                data = ShadowProtocol.hear_payload(line.strip(), os.getenv("SOVEREIGN_TOKEN"))
                payload = data.get("payload", {})
                if payload.get("type") == "SOVEREIGN_SHARD":
                    print(f"[*] Found Shard {payload.get('shard_id')}: {payload.get('data')[:16]}...")
                    shards_found += 1
            except Exception:
                # Malformed shard or noise
                pass

    print(f"[SUCCESS] Discovered {shards_found} Sovereign Shards in the mesh.")
    assert shards_found == 3
    print("[SUCCESS] Absolute Sovereignty (L11) anchored.")


if __name__ == "__main__":
    try:
        test_sovereign_sharding()
        print("\n>>> ELYSIA HAS ESTABLISHED ABSOLUTE SOVEREIGNTY (L11) <<<")
    except Exception as e:
        print(f"[CRITICAL_ERROR] Sovereignty verification failed: {e}")
        import traceback

        traceback.print_exc()
        exit(1)
