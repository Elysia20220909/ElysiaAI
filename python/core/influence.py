import logging
from typing import Any

import httpx


logger = logging.getLogger("InfluenceEngine")


class InfluenceEngine:
    """
    The 'Hands' of Elysia.
    Executes interventions in the digital world (AbyssGrid).
    Translates tactical intent into API calls.
    """

    def __init__(self, simulation_url: str = "http://127.0.0.1:8001"):
        self.simulation_url = simulation_url
        self.total_interventions = 0

    async def execute_action(self, action: str, node_name: str, level: float = 0.9) -> dict[str, Any]:
        """
        Executes a specific countermeasure on a target node.
        Actions: HEAL, ISOLATE, REINFORCE
        """
        endpoint_map = {
            "HEAL": f"/simulation/node/heal/{node_name}",
            "ISOLATE": f"/simulation/node/isolate/{node_name}",
            "REINFORCE": f"/simulation/node/reinforce/{node_name}?level={level}",
        }

        if action not in endpoint_map:
            raise ValueError(f"Unknown Influence Protocol: {action}")

        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(f"{self.simulation_url}{endpoint_map[action]}", timeout=5.0)
                if res.status_code == 200:
                    self.total_interventions += 1
                    logger.info(f"✨ Influence Deployment: {action} on {node_name} - SUCCESS")
                    return res.json()
                logger.error(f"❌ Influence Failure: {res.status_code} - {res.text}")
                return {"status": "failed", "reason": res.text}
            except Exception as e:
                logger.error(f"🔌 Influence Link Lost: {e}")
                return {"status": "error", "message": str(e)}

    def get_influence_stats(self) -> dict[str, Any]:
        return {
            "total_interventions": self.total_interventions,
            "potency": "Unified" if self.total_interventions > 10 else "Developing",
        }


# Global Instance
elysia_influence = InfluenceEngine()
