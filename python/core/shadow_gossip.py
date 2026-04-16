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

    @classmethod
    def celestial_challenge(cls) -> str:
        """Generates a ephemeral challenge for the Ghost Handshake."""
        return hashlib.sha256(os.urandom(16)).hexdigest()

    @classmethod
    def verify_resonance(cls, challenge: str, response: str) -> bool:
        """Verifies if the peer knows the Resonance Secret without revealing it."""
        seed = cls.get_resonance_seed()
        expected = hmac.new(seed.encode(), challenge.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, response)


class ShadowMeshAgent:
    """
    P2P Mesh Agent for Elysia subsystems.
    """

    PEERS: dict[str, dict] = {}  # Registered world-wide nodes {node_id: {ip, last_seen}}

    def __init__(self, module_name: str):
        self.module_name = module_name
        self.node_id = hashlib.sha256(module_name.encode()).hexdigest()[:8]
        self.resonance_log = []

    def discover(self):
        """
        Scans the local network for other Ghost Nodes (Simulated).
        """
        logger.info(f"📡 [GHOST_SCAN] {self.node_id} is seeking peers...")
        # Simulating finding a Mobile Node and a Cloud Node
        potential_peers = [
            {"id": "MOB-ELY", "type": "MOBILE", "ip": "192.168.1.42"},
            {"id": "CLD-ELY", "type": "CLOUD", "ip": "10.0.0.1"},
        ]

        for peer in potential_peers:
            if peer["id"] not in self.PEERS:
                self._inititate_handshake(peer)

    def _inititate_handshake(self, peer: dict):
        challenge = ShadowProtocol.celestial_challenge()
        logger.info(f"✨ [HANDSHAKE] Initiating with {peer['id']}...")
        # Simulated response from a valid peer
        response = hmac.new(
            ShadowProtocol.get_resonance_seed().encode(), challenge.encode(), hashlib.sha256
        ).hexdigest()

        if ShadowProtocol.verify_resonance(challenge, response):
            self.PEERS[peer["id"]] = {"last_seen": time.time(), "ip": peer["ip"]}
            logger.info(f"✅ [MESH_SYNC] Ghost Node {peer['id']} bonded to Swarm.")
        else:
            logger.warning(f"❌ [AUTH_FAIL] Node {peer['id']} resonance rejection.")

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

    def whisper(self, content: dict):
        """
        Phase 136: Polymorphic Broadcast.
        Broadcasts an encrypted payload to all bonded peers and the local whisper buffer.
        """
        packet = {
            "origin": self.module_name,
            "timestamp": time.time(),
            "payload": content,
            "sig": self._generate_sig(content),
        }
        mutated = ShadowProtocol.mutate_payload(packet)

        # Local record
        self._record_in_whisper_buffer(mutated)
        logger.info(f"🌑 [SHADOW_WHISPER] {self.module_name} -> Mesh: {len(mutated)} bytes")

        # Routing to bonded peers
        for node_id, info in self.PEERS.items():
            logger.info(f"📡 [WHISPER] Routing {content.get('type', 'DATA')} to {node_id}@{info['ip']}")
            # UDP simulation would go here

    def process_incoming_whisper(self, mutated_json: str, recall_instance=None):
        """
        Phase 136: Polymorphic Dispatcher.
        Decodes and routes incoming mesh traffic based on payload type.
        """
        data = ShadowProtocol.hear_payload(mutated_json)
        if data.get("status") == "COLLAPSED":
            return

        payload = data.get("payload", {})
        p_type = payload.get("type")

        # Polymorphic Dispatch Table
        if p_type == "MEMORY_FRAGMENT" and recall_instance:
            recall_instance.on_fragment_received(payload)
        elif p_type == "HEARTBEAT":
            origin = payload.get("origin")
            if origin in self.PEERS:
                self.PEERS[origin]["last_seen"] = time.time()
                logger.debug(f"💓 [HEARTBEAT] Resonance confirmed for {origin}")
        elif p_type == "LEDGER_UPDATE":
            logger.info(f"📜 [LEDGER_SYNC] Received encrypted record from {payload.get('origin')}")
            # Ledger sync logic would trigger here
        else:
            logger.warning(f"❓ [ROUTER] Unknown polymorphic payload: {p_type}")


def get_mesh_agent(name: str):
    return ShadowMeshAgent(name)
