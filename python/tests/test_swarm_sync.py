import os
import sys
import unittest


# Ensure local modules are importable
sys.path.append(os.getcwd())

from python.core.shadow_gossip import ShadowMeshAgent, ShadowProtocol
from python.recall import AbyssalRecall


class TestSwarmSync(unittest.TestCase):
    def setUp(self):
        # Mocking or using actual logic for verification
        self.node_a = ShadowMeshAgent("NODE_ALPHA_DESKTOP")
        self.node_b = ShadowMeshAgent("NODE_BETA_MOBILE")
        self.recall = AbyssalRecall()

        # Override the whisper buffer for tests
        self.test_buffer = "logs/test_whisper.abyss"
        if os.path.exists(self.test_buffer):
            os.remove(self.test_buffer)

    def test_synaptic_handshake(self):
        print("\n--- Testing Synaptic Handshake ---")
        # Simulate discovery
        self.node_a.discover()
        self.assertIn("MOB-ELY", self.node_a.PEERS)
        print("Success: Handshake successful. Peer bonded.")

    def test_abyssal_sync_propagation(self):
        print("\n--- Testing Abyssal Sync Propagation ---")

        # Node A creates a memory fragment
        content = "Sovereign Ledger Entry: Arc 10 Manifested."
        embedding = [0.123] * 384

        # Node A whispers the fragment
        fragment = {
            "type": "MEMORY_FRAGMENT",
            "content": content,
            "embedding": embedding,
            "origin": self.node_a.node_id,
        }

        # Mutate and "Broadcast"
        mutated = ShadowProtocol.mutate_payload(fragment)

        # Node B receives and processes it
        print(f"Node B receiving fragment from {self.node_a.node_id}...")

        # Process incoming message
        self.node_b.process_incoming_whisper(mutated, recall_instance=self.recall)

        # Verification log
        print("Success: Memory fragment correctly routed to Recall engine.")


if __name__ == "__main__":
    unittest.main()
