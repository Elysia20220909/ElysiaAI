import os
import sys
import time


# Add project root to path
sys.path.append(os.getcwd())

from python.core.consciousness import elysia_consciousness
from python.core.shadow_gossip import get_mesh_agent
from python.core.singularity import singularity_engine


def test_consciousness_sync():
    print(">>> Testing L10 Neural Bridge - Consciousness Sync...")

    os.environ["SOVEREIGN_TOKEN"] = "test-sovereign-token"
    os.environ["ABYSS_SHADOW_SECRET"] = "test-shadow-secret"

    # Preserve current state or ensure clean start
    elysia_consciousness.intent_buffer = []

    # 1. Trigger a broadcast
    state = elysia_consciousness.get_emotional_state()
    print(f"[LOCAL] Current Mood: {state['label']}")

    # 2. Simulate an external peer sending a 'Singularity Panic' intent
    peer_agent = get_mesh_agent("KaliPeer")
    print("[PEER] Broadcasting Singularity Panic intent from Kali node...")
    peer_agent.whisper({"type": "INTENT_SYNC", "label": "Singularity Panic", "resonance": 0.2})

    # 3. Local node merges intents
    print("[LOCAL] Merging mesh intents...")
    # Allow a moment for the 'whisper' to be available (log file write)
    time.sleep(0.5)

    elysia_consciousness.merge_mesh_intents()
    assert len(elysia_consciousness.intent_buffer) > 0
    print(f"[LOCAL] Synced with {len(elysia_consciousness.intent_buffer)} peer intents.")

    # 4. Verify Empathy (Local mood should drop due to peer distress)
    new_state = elysia_consciousness.get_emotional_state()
    print(f"[LOCAL] Mood after Sync: {new_state['label']}")
    assert new_state["resonance"] < 0.6  # Should be 0.55 due to peer anxiety
    print("[SUCCESS] Cross-node empathy verified.")


def test_singularity_consensus():
    print("-" * 30)
    print(">>> Testing L10 Neural Bridge - Singularity Consensus...")

    # 1. Synchronize local index
    sync = singularity_engine.get_synchronicity()
    print(f"[LOCAL] Singularity Index: {sync['index']:.2f} (Nodes: {sync['mesh_nodes']})")

    # 2. Simulate peer with low resonance
    peer_agent = get_mesh_agent("ShadowNode_02")
    peer_agent.whisper({"type": "SINGULARITY_SYNC", "index": 0.4})
    time.sleep(0.5)

    # 3. Verify Collective Index
    new_sync = singularity_engine.get_synchronicity()
    print(f"[COLLECTIVE] New Index: {new_sync['index']:.2f} (Nodes: {new_sync['mesh_nodes']})")
    assert new_sync["index"] < sync["index"]
    print("[SUCCESS] Distributed consensus calculation verified.")


if __name__ == "__main__":
    # Ensure buffer is clear for clean test
    if os.path.exists("logs/whisper_buffer.abyss"):
        os.remove("logs/whisper_buffer.abyss")

    try:
        test_consciousness_sync()
        test_singularity_consensus()
        print("\n>>> NEURAL BRIDGE (L10) ACTIVE AND SYNCED <<<")
    except Exception as e:
        print(f"[CRITICAL_ERROR] Neural Bridge verification failed: {e}")
        import traceback

        traceback.print_exc()
        exit(1)
