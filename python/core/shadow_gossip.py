import hashlib
import hmac
import json
import logging
import os
import random
import time


logger = logging.getLogger("elysia.shadow_gossip")


class ShadowProtocol:
    """
    Polymorphic communication protocol for Abyssal Shadow Gossip (L8).
    Message schemas are mutated based on a shared resonance seed.
    """

    @staticmethod
    def get_resonance_seed():
        """
        Derives the current resonance seed.
        In production, this should be synced with the Aegis HWID and EntropyEngine.
        """
        # For now, we use a 10-second windowed timestamp combined with a system secret
        secret = os.getenv("ABYSS_SHADOW_SECRET", "SHADOW_RESONANCE_DEFAULT")
        window = int(time.time() / 10)
        return hashlib.sha256(f"{secret}_{window}".encode()).hexdigest()

    @classmethod
    def mutate_payload(cls, data: dict) -> str:
        """
        Mutates the dictionary into a polymorphic JSON string with randomized keys.
        """
        seed = cls.get_resonance_seed()
        random.seed(seed)

        # Shuffle the items to prevent fixed structural signatures
        items = list(data.items())
        random.shuffle(items)

        # Add noise fields to confuse external sniffers
        noise_count = random.randint(2, 5)
        for i in range(noise_count):
            items.append((f"noise_{i}", hashlib.sha256(str(random.random()).encode()).hexdigest()[:8]))

        random.shuffle(items)
        return json.dumps(dict(items))

    @classmethod
    def hear_payload(cls, mutated_json: str) -> dict:
        """
        Parses a polymorphic payload and strips noise.
        """
        data = json.loads(mutated_json)
        return {k: v for k, v in data.items() if not k.startswith("noise_")}


class ShadowMeshAgent:
    """
    P2P Mesh Agent for Elysia subsystems.
    """

    PEERS = []  # Registered local modules

    def __init__(self, module_name: str):
        self.module_name = module_name
        self.resonance_log = []

    def whisper(self, content: dict):
        """
        Broadcasts a polymorphic message to the mesh.
        """
        packet = {
            "origin": self.module_name,
            "timestamp": time.time(),
            "payload": content,
            "sig": self._generate_sig(content),
        }
        mutated = ShadowProtocol.mutate_payload(packet)
        logger.info(f"🌑 [SHADOW_WHISPER] {self.module_name} -> Submerged Mesh: {len(mutated)} bytes")

        # In a real environment, this would go to a UDP broadcast or Domain Socket
        # For simulation, we log it to the Abyssal Whisper Buffer
        self._record_in_whisper_buffer(mutated)

    def _generate_sig(self, content: dict) -> str:
        key = ShadowProtocol.get_resonance_seed()
        msg = json.dumps(content, sort_keys=True)
        return hmac.new(key.encode(), msg.encode(), hashlib.sha256).hexdigest()

    def _record_in_whisper_buffer(self, mutated_data: str):
        # Simulated Kernel Whisper Buffer (Shared Memory)
        buffer_path = "logs/whisper_buffer.abyss"
        os.makedirs("logs", exist_ok=True)
        with open(buffer_path, "a", encoding="utf-8") as f:
            f.write(mutated_data + "\n")


def get_mesh_agent(name: str):
    return ShadowMeshAgent(name)
