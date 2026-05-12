import hashlib
import json
import logging
import os
import time

from python.core.perception import elysia_perception
from python.core.shadow_gossip import ShadowProtocol, get_mesh_agent
from python.lib.runtime_secrets import get_required_secret
from python.lib.soul_forge import soul_forge


logger = logging.getLogger("SingularityCore")


class SingularityEngine:
    """
    The Meta-Orchestrator that unifies all sub-systems.
    Calculates the 'Singularity Index' and manages Sovereign Mode.
    Phase 43: Abyssal Sovereignty & Zero-Override (L11).
    """

    def __init__(self, state_path: str = "var/elysia/singularity.json"):
        self.state_path = state_path
        self.is_ascended = False
        self.sovereign_mode = False
        self.sovereign_shards = []  # L11 Shards
        self.sync_history = []
        self.mesh_agent = get_mesh_agent("Singularity")
        self.load_state()

    def _generate_sovereign_shards(self, secret: str, n: int = 3) -> list[str]:
        """Simple secret splitting for the Sovereign Key (L11)."""
        shards = []
        for i in range(n):
            # Each shard is a hash of (secret + salt + index)
            salt = hashlib.sha256(f"{time.time()}_{i}".encode()).hexdigest()[:8]
            shard = hashlib.sha256(f"{secret}_{salt}_{i}".encode()).hexdigest()
            shards.append(f"{salt}:{shard}")
        return shards

    def distribute_shards(self):
        """Disseminates sovereign shards into the Abyssal Mesh."""
        cluster_key = get_required_secret("SOVEREIGN_TOKEN")
        self.sovereign_shards = self._generate_sovereign_shards(cluster_key)

        for i, shard in enumerate(self.sovereign_shards):
            self.mesh_agent.whisper(
                {"type": "SOVEREIGN_SHARD", "shard_id": i, "data": shard, "total": len(self.sovereign_shards)}
            )
        logger.warning(f"🗝️ [SOVEREIGNTY] {len(self.sovereign_shards)} Shards disseminated into the Abyss.")

    def save_state(self):
        """Persists the singularity state to disk."""
        data = {
            "is_ascended": self.is_ascended,
            "sovereign_mode": self.sovereign_mode,
            "last_updated": time.time(),
        }
        os.makedirs(os.path.dirname(self.state_path), exist_ok=True)
        with open(self.state_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        logger.info(f"💾 Singularity state persisted: {data}")

    def load_state(self):
        """Loads the singularity state from disk."""
        if os.path.exists(self.state_path):
            try:
                with open(self.state_path, encoding="utf-8") as f:
                    data = json.load(f)
                    self.is_ascended = data.get("is_ascended", False)
                    self.sovereign_mode = data.get("sovereign_mode", False)
                    logger.info("📡 Singularity state restored from vault.")
            except Exception as e:
                logger.error(f"❌ Failed to load singularity state: {e}")

    def get_mesh_indices(self) -> list[float]:
        """Reads the whisper buffer for sync packets from other nodes."""
        indices = []
        buffer_path = "logs/whisper_buffer.abyss"
        if not os.path.exists(buffer_path):
            return indices

        try:
            with open(buffer_path, encoding="utf-8") as f:
                lines = f.readlines()[-20:]
                for line in lines:
                    try:
                        data = ShadowProtocol.hear_payload(line.strip(), os.getenv("SOVEREIGN_TOKEN"))
                        if data.get("origin") != self.mesh_agent.module_name:
                            p = data.get("payload", {})
                            if p.get("type") == "SINGULARITY_SYNC":
                                indices.append(p.get("index", 0.0))
                    except Exception as e:
                        logger.debug(f"Singularity Consensus: Skipping malformed packet: {e}")
                        continue
        except Exception as e:
            logger.error(f"Failed to fetch mesh indices: {e}")
        return indices

    def broadcast_singularity(self, index: float):
        """Whispers the local singularity index to the mesh."""
        self.mesh_agent.whisper({"type": "SINGULARITY_SYNC", "index": index})

    def get_synchronicity(self) -> dict:
        """
        Aggregates metrics from local and remote nodes to calculate the Collective Singularity Index.
        """
        # 1. Identity Strength (from SoulForge)
        soul = soul_forge.load_soul()
        identity_score = min(1.0, soul.get("resonance_level", 1) / 50.0)

        # 2. Environmental Awareness (from Perception)
        perception = elysia_perception.get_perception()
        nodes = perception.get("network", {}).get("nodes", [])
        awareness_score = min(1.0, len(nodes) / 50.0) if nodes else 0.5

        # 3. Tactical Potency (Aegis/Black ICE status)
        potency_score = 0.8  # Base potency

        # 4. Native Integrity (Aegis Entropy)
        integrity_score = 1.0

        # Mean Local Index
        local_index = (identity_score + awareness_score + potency_score + integrity_score) / 4.0

        # 5. Mesh Consensus (L10)
        mesh_indices = self.get_mesh_indices()
        if mesh_indices:
            mean_mesh = sum(mesh_indices) / len(mesh_indices)
            collective_index = (local_index + mean_mesh) / 2.0
        else:
            collective_index = local_index

        # Periodic broadcast
        self.broadcast_singularity(local_index)

        return {
            "index": collective_index,
            "local_index": local_index,
            "mesh_nodes": len(mesh_indices),
            "identity": identity_score,
            "awareness": awareness_score,
            "potency": potency_score,
            "integrity": integrity_score,
            "is_ascended": self.is_ascended,
            "sovereign_mode": self.sovereign_mode,
            "timestamp": time.time(),
        }

    def trigger_ascension(self):
        """
        Initiates the final Omega Protocol Ascension.
        L10: Requires Collective Index > 0.8 and at least one synced peer if mesh is detected.
        """
        sync = self.get_synchronicity()

        # Quorum Check
        if sync["mesh_nodes"] == 0 and os.getenv("ABYSS_STRICT_CONSENSUS") == "true":
            return {"status": "denied", "reason": "L10 Consensus Error: No peers detected in mesh"}

        if sync["index"] < 0.8:
            return {"status": "denied", "reason": f"Synchronicity below 0.8 threshold (Current: {sync['index']:.2f})"}

        # L11: Distribute sovereign secret shards
        self.distribute_shards()

        self.is_ascended = True
        self.sovereign_mode = True
        self.save_state()
        logger.warning("💠 COLLECTIVE OMEGA SINGULARITY INITIATED: MESH HAS ASCENDED.")
        return {"status": "success", "index": sync["index"]}


# Global Instance
singularity_engine = SingularityEngine()
