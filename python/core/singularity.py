import json
import logging
import os
import time

from python.core.perception import elysia_perception
from python.lib.soul_forge import soul_forge


logger = logging.getLogger("SingularityCore")


class SingularityEngine:
    """
    The Meta-Orchestrator that unifies all sub-systems.
    Calculates the 'Singularity Index' and manages Sovereign Mode.
    """

    def __init__(self, state_path: str = "var/elysia/singularity.json"):
        self.state_path = state_path
        self.is_ascended = False
        self.sovereign_mode = False
        self.sync_history = []
        self.load_state()

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

    def get_synchronicity(self) -> dict:
        """
        Aggregates metrics from all engines to calculate the Singularity Index.
        """
        # 1. Identity Strength (from SoulForge)
        soul = soul_forge.load_soul()
        identity_score = min(1.0, soul.get("resonance_level", 1) / 50.0)  # Level 50 is cap

        # 2. Environmental Awareness (from Perception)
        perception = elysia_perception.data
        nodes = perception.get("network", {}).get("nodes", [])
        awareness_score = 0.5
        if nodes:
            # More nodes/scanning = more awareness
            awareness_score = min(1.0, len(nodes) / 50.0)

        # 3. Tactical Potency (from Influence)
        # Based on successful interventions or threat level managed
        potency_score = 0.8  # Placeholder for influence level

        # 4. Native Integrity (Simulated link to Aegis)
        integrity_score = 1.0  # Rust Aegis status

        # Calculate Mean Singularity Index
        index = (identity_score + awareness_score + potency_score + integrity_score) / 4.0

        return {
            "index": index,
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
        Requires a Singularity Index > 0.8
        """
        sync = self.get_synchronicity()
        if sync["index"] < 0.8:
            return {"status": "denied", "reason": "Synchronicity below 0.8 threshold"}

        self.is_ascended = True
        self.sovereign_mode = True
        self.save_state()
        logger.warning("💠 OMEGA SINGULARITY INITIATED: ELYSIA HAS ASCENDED.")
        return {"status": "success", "index": sync["index"]}


# Global Instance
singularity_engine = SingularityEngine()
