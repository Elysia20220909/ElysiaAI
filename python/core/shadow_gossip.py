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
    Phase 41: Quantum Deep Abyss - Observer Effect (Data collapse on intercept).
    """

    OBSERVED_PIDS: set[str] = set()

    @staticmethod
    def get_resonance_seed():
        # ... (Existing implementation)
        secret = os.getenv("ABYSS_SHADOW_SECRET", "SHADOW_RESONANCE_DEFAULT")
        window = int(time.time() / 10)
        return hashlib.sha256(f"{secret}_{window}".encode()).hexdigest()

    @classmethod
    def mutate_payload(cls, data: dict) -> str:
        """
        Mutates the dictionary into a polymorphic JSON string with randomized keys.
        Includes a Quantum Canary (PID) to detect unauthorized observation.
        """
        seed = cls.get_resonance_seed()
        random.seed(seed)

        # Add a unique Packet ID (Quantum Canary)
        packet_id = hashlib.sha256(f"{time.time()}_{random.random()}".encode()).hexdigest()[:16]
        data["pid"] = packet_id

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
    def hear_payload(cls, mutated_json: str, sovereign_token: str = None) -> dict:
        """
        Parses a polymorphic payload and strips noise.
        DEEP ABYSS: If the data has been observed before without a valid sovereign token, it collapses.
        """
        data = json.loads(mutated_json)
        pid = data.get("pid")

        if pid:
            if pid in cls.OBSERVED_PIDS:
                # Re-observation detected. Verify sovereignty.
                sov_secret = os.getenv("SOVEREIGN_TOKEN")
                # If secret is unset or token doesn't match, trigger collapse
                if not sov_secret or sovereign_token != sov_secret:
                    logger.warning(f"⚠️ QUANTUM_COLLAPSE: Packet {pid} was re-observed. Wavefunction collapsed.")
                    return {"status": "COLLAPSED", "data": "VOID_RESONANCE_ERROR", "observed": True}

            # Mark as observed in the current timeline
            cls.OBSERVED_PIDS.add(pid)

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
