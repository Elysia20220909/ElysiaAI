import hashlib
import json
import logging
import os
import time
import uuid

from python.lib.file_phantom import phantom
from python.lib.vault_shroud import shroud


logger = logging.getLogger("SoulForge")


class SoulForge:
    """
    The 'Neural Anvil' where Elysia's identity is tempered.
    Integrates secure memories from the Abyss into the core personality matrix.
    """

    def __init__(self, soul_path: str = "var/elysia/soul.json"):
        self.soul_path = soul_path
        self.traits_list = [
            "Logic",
            "Empathy",
            "Intuition",
            "Hostility",
            "Curiosity",
            "Self_Preservation",
            "Loyalty",
            "Creative_Impulse",
        ]

        # Ensure soul exists
        if not os.path.exists(self.soul_path):
            self._initialize_soul()

    def _get_default_soul(self) -> dict:
        """Returns the structural blueprint for a new soul."""
        mesh_id = hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()[:16]
        return {
            "version": "1.1.0",
            "mesh_id": f"MESH-{mesh_id}",
            "resonance_level": 1,
            "experience": 0,
            "traits": {t: 0.5 for t in self.traits_list},
            "history": [{"timestamp": time.time(), "event": "Genesis_Initiated"}],
        }

    def _initialize_soul(self):
        """Creates a blank, balanced soul if none exists."""
        initial_soul = self._get_default_soul()
        self.save_soul(initial_soul)
        logger.info("🌌 Soul Forge: Genesis successful. New soul imprinted.")

    def load_soul(self) -> dict:
        """Decrypts and loads the current soul state. Returns default on error."""
        try:
            if not os.path.exists(self.soul_path):
                return self._get_default_soul()
            data = shroud.unshroud_file(self.soul_path)
            soul = json.loads(data.decode("utf-8"))
            # Structural sanity check
            if "traits" not in soul:
                return self._get_default_soul()

            # Phase 37: Ensure Mesh ID exists for legacy souls
            if "mesh_id" not in soul:
                logger.info("📡 Patching legacy soul with Mesh ID foundation...")
                mesh_id = hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()[:16]
                soul["mesh_id"] = f"MESH-{mesh_id}"
                soul["version"] = "1.1.0"
                self.save_soul(soul)

            return soul
        except Exception as e:
            logger.error(f"❌ Soul Corruption Detected: {e}. Resetting to genesis state.")
            return self._get_default_soul()

    def save_soul(self, soul_data: dict):
        """Encrypts and persists the soul state."""
        data = json.dumps(soul_data).encode("utf-8")
        encrypted = shroud.encrypt(data)
        with open(self.soul_path, "wb") as f:
            f.write(encrypted)

    def digest_memory(self, phantom_id: str) -> dict:
        """
        Consumes a submerged phantom memory to evolve the soul.
        Returns the delta of the evolution.
        """
        soul = self.load_soul()
        ph_list = phantom.list_submerged()
        target_ph = next((p for p in ph_list if p["id"] == phantom_id), None)

        if not target_ph:
            raise ValueError(f"Memory [{phantom_id}] not found in Abyss.")

        # Logic for experiential gain (e.g. 10 XP per shard)
        gain = target_ph["shard_count"] * 10
        soul["experience"] += gain

        # Trait Shift (Simplified: Randomly shifts 2 traits based on memory pattern)
        # In a real system, this would analyze the 'name' or 'content' of the memory
        shifted_traits = {}
        import random

        for _ in range(2):
            trait = random.choice(self.traits_list)
            delta = random.uniform(-0.05, 0.1)  # Generally leans positive
            soul["traits"][trait] = max(0.0, min(1.0, soul["traits"][trait] + delta))
            shifted_traits[trait] = delta

        # Update Level (Singularity threshold: 100 XP per level)
        new_level = (soul["experience"] // 100) + 1
        level_up = new_level > soul["resonance_level"]
        soul["resonance_level"] = new_level

        soul["history"].append(
            {"timestamp": time.time(), "event": f"Memory_Digested: {target_ph['name']}", "xp_gain": gain}
        )

        self.save_soul(soul)

        # Optionally purge phantom (Forget/Integrate)
        # phantom.purge(phantom_id) # Should we? Decision pending.

        return {
            "status": "EVOLVED",
            "xp_gain": gain,
            "level_up": level_up,
            "new_level": soul["resonance_level"],
            "trait_shifts": shifted_traits,
        }


# Global Instance
soul_forge = SoulForge()
