import logging
import time
from typing import Any

import httpx


logger = logging.getLogger("PerceptionEngine")


class PerceptionEngine:
    """
    The 'Eyes' of Elysia.
    Aggregates environmental signals from AbyssGrid (Network) and Aegis (Security).
    Translates raw data into high-level Perception Context.
    """

    def __init__(self, simulation_url: str = "http://127.0.0.1:8001", system_url: str = "http://127.0.0.1:8000"):
        self.simulation_url = simulation_url
        self.system_url = system_url
        self.last_sync = 0
        self.cache = {
            "network": {"nodes": [], "threat_level": 0.0, "is_running": False},
            "security": {"resonance": 1.0, "status": "SECURE"},
            "awareness": "Total Tranquility",
        }

    async def sync(self):
        """Polls internal services to update the perception cache."""
        async with httpx.AsyncClient() as client:
            try:
                # 1. Sync with AbyssGrid (Network Simulation)
                sim_res = await client.get(f"{self.simulation_url}/simulation/status?include_nodes=true", timeout=2.0)
                if sim_res.status_code == 200:
                    self.cache["network"] = sim_res.json()
            except Exception as e:
                logger.warning(f"🌐 Perception: Network Simulation unreachable: {e}")
                self.cache["network"]["is_running"] = False

            try:
                # 2. Sync with Aegis (System Monitor)
                sys_res = await client.get(f"{self.system_url}/system/monitor", timeout=2.0)
                if sys_res.status_code == 200:
                    data = sys_res.json()
                    self.cache["security"]["resonance"] = (
                        data.get("elysia", {}).get("soul_resonance", {}).get("unified_resonance", 1.0)
                    )
                    self.cache["security"]["status"] = data.get("security", {}).get("lockdown", {}).get("active", False)
            except Exception as e:
                logger.warning(f"🛡️ Perception: System Gateway unreachable: {e}")

        # 3. Update Overall Awareness
        self._derive_awareness()
        self.last_sync = time.time()

    def _derive_awareness(self):
        """Translates combined metrics into an environmental context."""
        threat = self.cache["network"].get("threat_level", 0.0)
        res = self.cache["security"].get("resonance", 1.0)

        if threat > 0.7:
            self.cache["awareness"] = "Invasive Radiance: Critical"
        elif threat > 0.3:
            self.cache["awareness"] = "Approaching Shadows"
        elif res < 0.6:
            self.cache["awareness"] = "Abyssal Fog"
        else:
            self.cache["awareness"] = "Crystalline Clarity"

    def get_perception(self) -> dict[str, Any]:
        """Returns the current integrated perception state."""
        return self.cache


# Global Instance
elysia_perception = PerceptionEngine()
