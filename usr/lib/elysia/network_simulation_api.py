#!/usr/bin/env python3
"""
Network Simulation API Wrapper
Blackwall Simulation統合用のFastAPIラッパー
"""
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
import os

# network_simulationをパスに追加
# sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "network_simulation"))

app = FastAPI(title="Network Simulation API", version="1.0.0")

class SimulationConfig(BaseModel):
    max_cycles: int = 100
    threat_threshold: float = 0.8
    spread_probability: float = 0.1
    num_nodes: int = 30
    m_value: int = 3

class SimulationStatus(BaseModel):
    cycle: int
    infected_count: int
    total_nodes: int
    threat_level: float
    is_running: bool

@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "AbyssGrid Network Simulation API",
        "endpoints": [
            "GET /simulation/status",
            "POST /simulation/start",
            "POST /simulation/stop",
            "GET /simulation/config"
        ]
    }

@app.get("/simulation/status")
async def get_simulation_status() -> SimulationStatus:
    """シミュレーション状態を取得"""
    return SimulationStatus(
        cycle=0,
        infected_count=0,
        total_nodes=30,
        threat_level=0.0,
        is_running=False
    )

@app.post("/simulation/start")
async def start_simulation(config: Optional[SimulationConfig] = None):
    """シミュレーション開始"""
    if config:
        return {
            "status": "started",
            "message": "Simulation started with custom config",
            "config": config.dict()
        }
    return {
        "status": "started",
        "message": "Simulation started with default config"
    }

@app.post("/simulation/stop")
async def stop_simulation():
    """シミュレーション停止"""
    return {
        "status": "stopped",
        "message": "Simulation stopped"
    }

@app.get("/simulation/config")
async def get_config() -> SimulationConfig:
    """現在の設定を取得"""
    return SimulationConfig()

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "network_simulation",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    print("🌐 Starting Network Simulation API Server...")
    print("📍 Access at: http://127.0.0.1:8001")
    print("📚 Docs at: http://127.0.0.1:8001/docs")
    uvicorn.run(app, host="127.0.0.1", port=8001)
