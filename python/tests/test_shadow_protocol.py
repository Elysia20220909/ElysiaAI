import os
import sys


# Add project root to path
sys.path.append(os.getcwd())

from python.core.shadow_gossip import ShadowMeshAgent, ShadowProtocol


def test_polymorphism():
    print(">>> Testing Abyssal Shadow Gossip Polymorphism...")
    data = {"cmd": "CORE_SYNC", "payload": "0xDEADD00D", "origin": "SingularityEngine"}

    # Mutate twice within the same window (should have same seed)
    mutated_1 = ShadowProtocol.mutate_payload(data)
    mutated_2 = ShadowProtocol.mutate_payload(data)

    # They should have the same keys but randomized order
    parsed_1 = ShadowProtocol.hear_payload(mutated_1)
    parsed_2 = ShadowProtocol.hear_payload(mutated_2)

    assert parsed_1["payload"] == data["payload"]
    assert parsed_2["payload"] == data["payload"]
    print("[SUCCESS] Polymorphic mutation and parsing verified.")


def test_gossip_mesh():
    print(">>> Testing Shadow Mesh Whisper...")
    agent = ShadowMeshAgent("SoulEngine")

    # Trigger a whisper
    agent.whisper({"event": "ASCENSION_COMPLETE", "resonance": 0.9999})

    # Check if recorded in the whisper buffer
    buffer_path = "logs/whisper_buffer.abyss"
    if os.path.exists(buffer_path):
        with open(buffer_path, encoding="utf-8") as f:
            lines = f.readlines()
            last_whisper = lines[-1].strip()
            print(f"[TRACE] Last whisper intercepted: {last_whisper[:50]}...")

            # Verify we can hear it
            heard = ShadowProtocol.hear_payload(last_whisper)
            assert heard["origin"] == "SoulEngine"
            print("[SUCCESS] Shadow mesh communication verified.")
    else:
        print("[FAILURE] Whisper buffer not found.")
        exit(1)


if __name__ == "__main__":
    try:
        test_polymorphism()
        print("-" * 20)
        test_gossip_mesh()
        print("-" * 20)
        print(">>> ALL ABYSSAL WHISPERS SYNCHRONIZED <<<")
    except Exception as e:
        print(f"[CRITICAL_ERROR] Verification failed: {e}")
        exit(1)
