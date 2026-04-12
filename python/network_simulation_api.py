#!/usr/bin/env python3
"""
Network Simulation API Wrapper
AbyssGrid Simulation統合用のFastAPIラッパー
"""

import threading
import time

import network_simulation as ns
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


app = FastAPI(title="Network Simulation API", version="1.1.0")


# グローバルシミュレーション状態
class SimulationEngine:
    def __init__(self):
        self.network: ns.Network | None = None
        self.void_agent: ns.VoidAgent | None = None
        self.current_cycle = 0
        self.is_running = False
        self.thread: threading.Thread | None = None
        self.config = {"num_nodes": 30, "m_value": 3, "max_cycles": 100, "check_interval": 1.0, "threat_threshold": 0.8}

    def start(self, custom_config: dict | None = None):
        if self.is_running:
            return False

        if custom_config:
            self.config.update(custom_config)

        self.network = ns.Network(self.config["num_nodes"], self.config["m_value"])
        self.void_agent = ns.VoidAgent()
        self.current_cycle = 0
        self.is_running = True

        # 初期感染
        threats = [
            ns.Threat("Worm", 0.1, 0.3, 2, 10),
            ns.Threat("Trojan", 0.05, 0.45, 1, 15),
        ]
        import math

        initial_infections = max(1, int(math.log2(self.config["num_nodes"] + 1)))
        import random

        for _ in range(initial_infections):
            node = random.choice(self.network.nodes)
            if not node.is_infected:
                threat = random.choice(threats)
                node.infect(threat, 0)

        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        return True

    def stop(self):
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=1.0)

    def _run_loop(self):
        while self.is_running and self.current_cycle < self.config["max_cycles"]:
            self.network.spread_threat(self.current_cycle, self.void_agent.neural_matrix_active)
            alerts = self.network.generate_alerts()
            for node in alerts:
                self.network.isolate_node(node)

            self.void_agent.update_threat_level(self.network, self.current_cycle)

            infected = sum(1 for node in self.network.nodes if node.is_infected)
            if infected / self.config["num_nodes"] > self.config["threat_threshold"]:
                self.is_running = False
                break

            time.sleep(self.config["check_interval"])
            self.current_cycle += 1

        self.is_running = False


engine = SimulationEngine()


class SimulationConfig(BaseModel):
    max_cycles: int = 100
    threat_threshold: float = 0.8
    spread_probability: float = 0.1
    num_nodes: int = 30
    m_value: int = 3


class NodeStatus(BaseModel):
    name: str
    is_infected: bool
    is_isolated: bool
    security_level: float


class SimulationStatus(BaseModel):
    cycle: int
    infected_count: int
    total_nodes: int
    threat_level: float
    is_running: bool
    nodes: list[NodeStatus] | None = None


@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "AbyssGrid Network Simulation API (Real)",
        "endpoints": [
            "GET /simulation/status",
            "POST /simulation/start",
            "POST /simulation/stop",
            "GET /simulation/config",
        ],
    }


@app.get("/simulation/status")
async def get_simulation_status(include_nodes: bool = False) -> SimulationStatus:
    if not engine.network:
        return SimulationStatus(cycle=0, infected_count=0, total_nodes=0, threat_level=0.0, is_running=False)

    infected_count = sum(1 for node in engine.network.nodes if node.is_infected)
    nodes = None
    if include_nodes:
        nodes = [
            NodeStatus(
                name=node.name,
                is_infected=node.is_infected,
                is_isolated=node.is_isolated,
                security_level=node.security_level,
            )
            for node in engine.network.nodes
        ]

    return SimulationStatus(
        cycle=engine.current_cycle,
        infected_count=infected_count,
        total_nodes=len(engine.network.nodes),
        threat_level=engine.void_agent.threat_level if engine.void_agent else 0.0,
        is_running=engine.is_running,
        nodes=nodes,
    )


@app.post("/simulation/start")
async def start_simulation(config: SimulationConfig | None = None):
    success = engine.start(config.dict() if config else None)
    if not success:
        return {"status": "error", "message": "Simulation is already running"}

    return {"status": "started", "message": "AbyssGrid simulation initialized", "config": engine.config}


@app.post("/simulation/stop")
async def stop_simulation():
    engine.stop()
    return {"status": "stopped", "message": "Simulation halted"}


@app.post("/simulation/node/isolate/{name}")
async def isolate_node(name: str):
    """ノードを虚空に封印し、感染の拡大を物理的に遮断します。"""
    if not engine.network:
        raise HTTPException(400, "Simulation not initialized")
    success = engine.network.isolate_node_by_name(name)
    if not success:
        raise HTTPException(404, f"Node {name} not found in grid")
    return {"status": "isolated", "node": name}


@app.post("/simulation/node/heal/{name}")
async def heal_node(name: str):
    """ノードの感染を浄化し、正常な共鳴状態に戻します。"""
    if not engine.network:
        raise HTTPException(400, "Simulation not initialized")
    for node in engine.network.nodes:
        if node.name == name:
            node.clear_infection()
            return {"status": "healed", "node": name}
    raise HTTPException(404, f"Node {name} not found in grid")


@app.post("/simulation/node/reinforce/{name}")
async def reinforce_node(name: str, level: float = 0.9):
    """ノードのシールドを強化し、将来の感染耐性を高めます。"""
    if not engine.network:
        raise HTTPException(400, "Simulation not initialized")
    success = engine.network.adjust_security(name, level)
    if not success:
        raise HTTPException(404, f"Node {name} not found in grid")
    return {"status": "reinforced", "node": name, "level": level}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "network_simulation",
        "version": "1.1.0",
        "engine_active": engine.network is not None,
    }


if __name__ == "__main__":
    import uvicorn

    print("Starting AbyssGrid Network Simulation API Server...")
    uvicorn.run(app, host="127.0.0.1", port=8001)
