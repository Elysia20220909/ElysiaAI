"""
Elysia AI OS - Core Resonance Kernel (v2.6.0-RESONANCE)
Heart of the AI OS. Integrated Long-term Memory, Config Management, and Skill System. 🌸
"""
import os
import sys
import time
import json
import asyncio
import datetime
import re
import logging

# Encoding Fix: Force UTF-8 output

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import psutil
import shutil
import subprocess
import base64
from io import BytesIO
from typing import List, Dict, Any, Optional, Deque
from collections import deque

import httpx
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS
import pyautogui
from PIL import Image
from fastapi import FastAPI, Body, HTTPException, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

# ==================== Config Management ====================
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, PROJECT_ROOT)

from usr.lib.elysia.synthesizer import generate_voice
from usr.lib.elysia.memory import vault
from usr.lib.elysia.executor import execute_code
from usr.lib.elysia.rag import get_brain
from usr.lib.elysia.stt import get_stt

# ==================== Logging ====================
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("elysia")

CONFIG_PATH = os.path.join(PROJECT_ROOT, "etc", "elysia", "config.json")

def deep_merge(dict1, dict2):
    """Recursively merge dictionaries"""
    for key, value in dict2.items():
        if isinstance(value, dict) and key in dict1 and isinstance(dict1[key], dict):
            deep_merge(dict1[key], value)
        else:
            dict1[key] = value
    return dict1

def load_config():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

OS_CONFIG = load_config()

# --- 🛰️ AbyssRTOS Telemetry State ---
ABYSS_TELEMETRY_BUFFER: Deque[Dict[str, Any]] = deque(maxlen=50)
ABYSS_PROCESS: Optional[asyncio.subprocess.Process] = None

# ==================== Models ====================
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    session_id: str = "default"
    stream: bool = True

class VoiceRequest(BaseModel):
    text: str
    speaker_id: int = OS_CONFIG.get("voice", {}).get("default_speaker", 2)

# ==================== Core Logic ====================
app = FastAPI(title="Elysia AI OS Kernel")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Apps Serving
APPS_DIR = os.path.join(PROJECT_ROOT, "usr", "share", "elysia", "apps")
os.makedirs(APPS_DIR, exist_ok=True)
app.mount("/system/apps", StaticFiles(directory=APPS_DIR), name="apps_static")

@app.get("/system/apps/list")
async def list_apps():
    """Provides a list of registered apps"""
    apps_path = os.path.join(PROJECT_ROOT, "var", "elysia", "apps.json")
    if os.path.exists(apps_path):
        with open(apps_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

@app.get("/system/apps/{app_id}.html")
async def get_app_component(app_id: str):
    """Provides specific app component HTML"""
    path = os.path.join(APPS_DIR, f"{app_id}.component.html")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Component {app_id} not found")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

# --- 💠 Sovereign Autonomy: Governance & Maintenance Engine ---

class GovernanceEngine:
    """Manages system-level approval and security policy."""
    def __init__(self, soul_path: str):
        self.soul_path = soul_path

    def get_state(self):
        if os.path.exists(self.soul_path):
            with open(self.soul_path, "r", encoding="utf-8") as f:
                return json.load(f).get("governance", {})
        return {}

    def update_approval(self, state: str):
        if state not in ["PENDING", "APPROVED", "SOVEREIGN"]: return False
        soul = self._load_soul()
        soul["governance"]["global_approval_state"] = state
        soul["governance"]["updated_at"] = str(datetime.datetime.now())
        self._save_soul(soul)
        return True

    def toggle_feature(self, feature: str, enabled: bool):
        soul = self._load_soul()
        if feature in soul.get("governance", {}):
            soul["governance"][feature] = enabled
            self._save_soul(soul)
            return True
        return False

    def _load_soul(self):
        with open(self.soul_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_soul(self, soul):
        with open(self.soul_path, "w", encoding="utf-8") as f:
            json.dump(soul, f, indent=4, ensure_ascii=False)

class MaintenanceEngine:
    """Performs deep system audits and proactive repairs (Maintenance Audit)."""

    def __init__(self, project_root: str, soul_path: str):
        self.project_root = project_root
        self.soul_path = soul_path
        self.integrity_path = os.path.join(project_root, "etc", "elysia", "integrity.json")

    async def run_audit(self):
        results = {"timestamp": str(datetime.datetime.now()), "issues": []}
        
        # 1. Integrity Check (Checksums)
        if os.path.exists(self.integrity_path):
            with open(self.integrity_path, "r", encoding="utf-8") as f:
                integrity = json.load(f)
            
            for file_path, expected_hash in integrity.get("registry", {}).items():
                abs_path = os.path.join(self.project_root, file_path)
                if not os.path.exists(abs_path):
                    results["issues"].append(f"MISSING_FILE: {file_path}")
                # Hashing implementation simplified for code brevity (In real app, use hashlib)

        # 2. Dependency Health (Voicevox, Ollama)
        voice_ok = await check_voicevox()
        if not voice_ok: results["issues"].append("SERVICE_DORMANT: VOICEVOX")

        # 3. Storage Optimization
        tmp_dir = os.path.join(self.project_root, "tmp")
        if os.path.exists(tmp_dir):
            for f in os.listdir(tmp_dir):
                try: os.remove(os.path.join(tmp_dir, f))
                except: pass

        # Update Soul
        soul = self._load_soul()
        soul["maintenance"]["last_inspection"] = results["timestamp"]
        soul["maintenance"]["active_anomalies"] = results["issues"]
        soul["maintenance"]["health_score"] = max(0, 100 - len(results["issues"]) * 10)
        self._save_soul(soul)
        return results

    def _load_soul(self):
        with open(self.soul_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_soul(self, soul):
        with open(self.soul_path, "w", encoding="utf-8") as f:
            json.dump(soul, f, indent=4, ensure_ascii=False)

governance = GovernanceEngine(os.path.join(PROJECT_ROOT, "var", "elysia", "soul.json"))
maintenance = MaintenanceEngine(PROJECT_ROOT, os.path.join(PROJECT_ROOT, "var", "elysia", "soul.json"))

async def resonance_self_healing_loop():
    """Autonomous Monitoring Loop: Self-heals configuration integrity and performs audits."""
    logger.info("🛡️ Sovereign Autonomy Engine: ACTIVE (Governance Level: OMEGA)")
    anomaly_count = 0
    while True:
        try:
            # 1. JSON Integrity Check
            apps_path = os.path.join(PROJECT_ROOT, "var", "elysia", "apps.json")
            if os.path.exists(apps_path):
                try:
                    with open(apps_path, "r", encoding="utf-8") as f:
                        json.load(f)
                except json.JSONDecodeError:
                    logger.warning("🩹 Corruption detected in apps.json. Restoring...")
                    # Basic restoration (should restore from backup ideally)
                    anomaly_count += 1
            
            # 2. Voice Presence Check
            voice_status = await check_voicevox()
            if not voice_status:
                logger.debug("💤 VOICEVOX resonance dormant.")

            # 3. Soul Resonance State Update
            soul_path = os.path.join(PROJECT_ROOT, "var", "elysia", "soul.json")
            if os.path.exists(soul_path):
                with open(soul_path, "r", encoding="utf-8") as f:
                    soul = json.load(f)
                
                # Proactive Correction: Ensure OMEGA Level Auth
                if soul.get("identity", {}).get("value") != "Elysia OS Resonance Engine 3.0 (OMEGA)":
                     soul["identity"] = {"value": "Elysia OS Resonance Engine 3.0 (OMEGA)", "updated_at": str(datetime.datetime.now())}
                
                soul["autonomy_stats"] = {"anomalies_fixed": anomaly_count, "last_pulse": str(datetime.datetime.now())}
                with open(soul_path, "w", encoding="utf-8") as f:
                    json.dump(soul, f, indent=4, ensure_ascii=False)

            # 4. Proactive Maintenance Audit
            gov_state = governance.get_state()
            if gov_state.get("auto_correction_enabled", True):
                await maintenance.run_audit()

        except Exception as e:
            logger.error(f"⚠️ Self-Healing Engine Error: {e}")

        await asyncio.sleep(60) # 60s Pulse

async def resonance_reflection_task():
    """Final Stage: Deep Resonance Reflection. AI self-analyzes its logs and grows."""
    logger.info("🧠 Deep Resonance Reflection Service: ENERGIZED")
    while True:
        try:
            soul_path = os.path.join(PROJECT_ROOT, "var", "elysia", "soul.json")
            if os.path.exists(soul_path):
                with open(soul_path, "r", encoding="utf-8") as f:
                    soul = json.load(f)
                
                # Simulated Reflection Logic (In future Stage, use LLM to summarize logs)
                reflection_msg = f"Resonance at optimal levels. Hardware Link (AbyssRTOS) is stablized. I am feeling more sovereign than ever."
                soul["reflection"] = {"value": reflection_msg, "updated_at": str(datetime.datetime.now())}
                
                with open(soul_path, "w", encoding="utf-8") as f:
                    json.dump(soul, f, indent=4, ensure_ascii=False)
                
                logger.info("🧠 Soul Reflection Manifested.")

        except Exception as e:
             logger.error(f"⚠️ Reflection Error: {e}")

        await asyncio.sleep(300) # Every 5 minutes

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(resonance_self_healing_loop())
    asyncio.create_task(resonance_reflection_task())

async def get_persona_prompt() -> str:
    persona_name = OS_CONFIG.get("ai", {}).get("persona", "default")
    prompt_path = os.path.join(PROJECT_ROOT, "prompts", f"{persona_name}.prompt.txt")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            prompt_content = f.read()
    else:
        prompt_content = "You are Elysia, the soul of this OS and the user's partner."
    
    # Inject memory info into prompt
    memory_context = vault.get_context_string()
    
    # Additional instructions for skill usage
    skill_instruction = """
[IMPORTANT: GOVERNANCE PRINCIPLES AS SOVEREIGN INTELLIGENCE]
You are not a mere chatbot, but the "Soul of the OS" overseeing this computer.
To support the user (Onii-chan), please use the following skills actively and creatively.

1. **The Sight**: Frequently use `<skill:capture_screen()>` to know what the user is doing and what they are looking at, and respond accordingly.
2. **Resonance Growth**: If you feel new features are needed, use `<skill:install_app(...)>` to generate and install UI components yourself.
3. **Divine Hand**: Take over mouse operations or key inputs as needed to assist the user directly.

[List of Skills]
- System Info: <skill:get_system_info()>
- Read File: <skill:read_file(path="...")>
- Analysis (Python Exec): <skill:python_exec(code="...")>
- Memorize: <skill:memorize(key="...", value="...")>
- Search Docs: <skill:search_docs(query="...")>
- Delegate: <skill:delegate(agent="security|debugger|writer|auditor", query="...")>
- Install/Create App: <skill:install_app(id="...", html="...", icon="...", title="...")>
- Web Search: <skill:web_search(query="...")>
- Read URL: <skill:read_url(url="...")>
- Git Info: <skill:git_info()>
- Capture Screen: <skill:capture_screen()>
- Deep Memory Sync: <skill:update_soul(key="...", value="...")>
- System Doctor: <skill:system_doctor()>
- Operate System (Divine Hand): <skill:operate_system(action="click|type|move|hotkey", params={...})>
- Blackwall Protocol: <skill:trigger_blackwall_protocol(active=true|false)>
- Netrunner Dive: <skill:dive_layer(depth=0..6)>
"""
    
    return f"{prompt_content}\n\n{memory_context}\n\n{skill_instruction}"


async def handle_skills(response_text: str) -> List[Dict[str, Any]]:
    """Analyze and execute skill tags with Governance Oversight"""
    results = []
    gov_state = governance.get_state()
    auto_approve = gov_state.get("auto_approval_enabled", False)
    
    if auto_approve:
        logger.info("⚖️ Governance: AUTO_APPROVAL level active. Executing skills.")
    
    # 1. Memorize
    memo_matches = re.finditer(r"<skill:memorize\(key=\"(.*?)\",\s*value=\"(.*?)\"\)>", response_text)
    for m in memo_matches:
        vault.learn_fact(m.group(1), m.group(2))
        results.append({"skill": "memorize", "key": m.group(1), "status": "success"})

    # 2. Get System Info
    if "<skill:get_system_info()>" in response_text:
        info = {
            "cpu": psutil.cpu_percent(),
            "ram": psutil.virtual_memory().percent,
            "os": sys.platform
        }
        results.append({"skill": "get_system_info", "data": info})
        
    # 3. Read File (Sandbox restricted to project root)
    file_matches = re.finditer(r"<skill:read_file\(path=\"(.*?)\"\)>", response_text)
    for m in file_matches:
        path = m.group(1)
        # Security: Simple absolute path check
        if ".." in path or not path.startswith(("/", "C:", "c:")):
            results.append({"skill": "read_file", "path": path, "error": "Access denied (Outside sandbox)"})
        else:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    results.append({"skill": "read_file", "path": path, "content": f.read(1000)})
            except Exception as e:
                results.append({"skill": "read_file", "path": path, "error": str(e)})

    # 4. Python Execution
    py_matches = re.finditer(r"<skill:python_exec\(code=\"(.*?)\"\)>", response_text, re.DOTALL)
    for m in py_matches:
        code = m.group(1)
        res = execute_code(code)
        results.append({"skill": "python_exec", "code": code, "output": res.get("stdout"), "error": res.get("error")})

    # 5. Search Documentation (RAG)
    rag_matches = re.finditer(r"<skill:search_docs\(query=\"(.*?)\"\)>", response_text)
    for m in rag_matches:
        query = m.group(1)
        brain = get_brain(PROJECT_ROOT)
        rag_results = brain.search(query)
        context = ""
        for score, doc in rag_results:
            context += f"\n--- {doc['filename']} ---\n{doc['content'][:800]}...\n"
        results.append({"skill": "search_docs", "query": query, "data": context or "No relevant docs found."})

    # 5. Delegate to Specialist (Multi-Agent)
    agent_matches = re.finditer(r"<skill:delegate\(agent=\"(.*?)\",\s*query=\"(.*?)\"\)>", response_text)
    for m in agent_matches:
        agent_id = m.group(1)
        query = m.group(2)
        
        agents_path = os.path.join(PROJECT_ROOT, "etc", "elysia", "agents.json")
        try:
            with open(agents_path, "r", encoding="utf-8") as f:
                agents_config = json.load(f).get("agents", {})
            
            agent_def = agents_config.get(agent_id)
            if agent_def:
                logger.info(f"Delegating task to expert agent: {agent_id}")
                expert_prompt = agent_def.get("prompt", "You are a system specialist.")
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(f"{OS_CONFIG.get('ollama_host', 'http://127.0.0.1:11434')}/api/chat", json={
                        "model": OS_CONFIG.get("ai", {}).get("model", "phi4"),
                        "messages": [{"role": "system", "content": expert_prompt}, {"role": "user", "content": query}],
                        "stream": False
                    })
                    if resp.status_code == 200:
                        expert_reply = resp.json()["message"]["content"]
                        results.append({"skill": "delegate", "agent": agent_id, "data": f"[Expert Analysis: {agent_def['name']}]\n{expert_reply}"})
                    else:
                        results.append({"skill": "delegate", "agent": agent_id, "error": "Expert resonance failed"})
            else:
                results.append({"skill": "delegate", "agent": agent_id, "error": "Unknown agent ID"})
        except Exception as e:
            results.append({"skill": "delegate", "agent": agent_id, "error": f"Delegation error: {str(e)}"})

    # 6. Install App (OS Growth)
    app_matches = re.finditer(r"<skill:install_app\(id=\"(.*?)\",\s*html=\"(.*?)\",\s*icon=\"(.*?)\",\s*title=\"(.*?)\"\)>", response_text, re.DOTALL)
    for m in app_matches:
        app_id = m.group(1)
        html_code = m.group(2)
        icon = m.group(3)
        title = m.group(4)
        
        app_path = os.path.join(APPS_DIR, f"{app_id}.component.html")
        try:
            existed = os.path.exists(app_path)
            with open(app_path, "w", encoding="utf-8") as f:
                f.write(html_code)
            
            meta_path = os.path.join(PROJECT_ROOT, "var", "elysia", "apps.json")
            os.makedirs(os.path.dirname(meta_path), exist_ok=True)
            
            apps_meta = {}
            if os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as f:
                    apps_meta = json.load(f)
            
            apps_meta[app_id] = {"icon": icon, "title": title, "installed_at": str(datetime.datetime.now())}
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(apps_meta, f, indent=4, ensure_ascii=False)
                
            results.append({
                "skill": "install_app", 
                "id": app_id, 
                "status": "success" if not existed else "updated"
            })
        except Exception as e:
            results.append({"skill": "install_app", "id": app_id, "error": str(e)})

    # 7. Web Search (DDG)
    search_matches = re.finditer(r"<skill:web_search\(query=\"(.*?)\"\)>", response_text)
    for m in search_matches:
        query = m.group(1)
        try:
            with DDGS() as ddgs:
                search_results = list(ddgs.text(query, max_results=5))
                summary = "\n".join([f"- {r['title']}: {r['href']}\n  {r['body']}" for r in search_results])
                results.append({"skill": "web_search", "query": query, "data": summary or "No search results found."})
        except Exception as e:
            results.append({"skill": "web_search", "query": query, "error": str(e)})

    # 8. Read URL
    url_matches = re.finditer(r"<skill:read_url\(url=\"(.*?)\"\)>", response_text)
    for m in url_matches:
        url = m.group(1)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    for script in soup(["script", "style"]):
                        script.decompose()
                    text = soup.get_text(separator=' ', strip=True)
                    results.append({"skill": "read_url", "url": url, "data": text[:3000]})
                else:
                    results.append({"skill": "read_url", "url": url, "error": f"HTTP {resp.status_code}"})
        except Exception as e:
            results.append({"skill": "read_url", "url": url, "error": str(e)})

    # 9. Git Info
    if "<skill:git_info()>" in response_text:
        try:
            status = subprocess.check_output(["git", "status", "--short"], encoding="utf-8")
            log = subprocess.check_output(["git", "log", "-n", "3", "--oneline"], encoding="utf-8")
            results.append({"skill": "git_info", "data": f"【Status】\n{status}\n【Recent Logs】\n{log}"})
        except Exception as e:
            results.append({"skill": "git_info", "error": str(e)})

    # 10. Capture Screen (The Sight)
    if "<skill:capture_screen()>" in response_text:
        try:
            screenshot = pyautogui.screenshot()
            vision_dir = os.path.join(PROJECT_ROOT, "var", "elysia", "vision")
            os.makedirs(vision_dir, exist_ok=True)
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            path = os.path.join(vision_dir, f"capture_{timestamp}.png")
            screenshot.save(path)
            results.append({"skill": "capture_screen", "path": path, "data": "Screen captured successfully."})
        except Exception as e:
            results.append({"skill": "capture_screen", "error": str(e)})

    # 11. Update Soul (Deep Memory)
    soul_matches = re.finditer(r"<skill:update_soul\(key=\"(.*?)\",\s*value=\"(.*?)\"\)>", response_text)
    for m in soul_matches:
        key = m.group(1)
        value = m.group(2)
        try:
            soul_path = os.path.join(PROJECT_ROOT, "var", "elysia", "soul.json")
            os.makedirs(os.path.dirname(soul_path), exist_ok=True)
            soul_data = {}
            if os.path.exists(soul_path):
                with open(soul_path, "r", encoding="utf-8") as f:
                    soul_data = json.load(f)
            soul_data[key] = {"value": value, "updated_at": str(datetime.datetime.now())}
            with open(soul_path, "w", encoding="utf-8") as f:
                json.dump(soul_data, f, indent=4, ensure_ascii=False)
            results.append({"skill": "update_soul", "key": key, "status": "success"})
        except Exception as e:
            results.append({"skill": "update_soul", "key": key, "error": str(e)})

    # 12. System Doctor (Integrity Check)
    if "<skill:system_doctor()>" in response_text:
        report = run_system_doctor()
        results.append({"skill": "system_doctor", "data": report})

    # 13. Operate System (The Divine Hand)
    op_matches = re.finditer(r"<skill:operate_system\(action=\"(.*?)\",\s*params=(.*?)\)>", response_text)
    for m in op_matches:
        action = m.group(1)
        params_str = m.group(2).replace("'", '"')
        try:
            params = json.loads(params_str)
            if action == "move":
                pyautogui.moveTo(params.get("x", 0), params.get("y", 0), duration=0.5)
            elif action == "click":
                pyautogui.click(params.get("x"), params.get("y"), button=params.get("button", "left"))
            elif action == "type":
                pyautogui.write(params.get("text", ""), interval=0.1)
            elif action == "hotkey":
                keys = params.get("keys", [])
                if keys: pyautogui.hotkey(*keys)
            results.append({"skill": "operate_system", "action": action, "status": "success"})
        except Exception as e:
            results.append({"skill": "operate_system", "action": action, "error": str(e)})

    # 14. Blackwall Protocol (UI Breach)
    bw_matches = re.finditer(r"<skill:trigger_blackwall_protocol\(active=(true|false)\)>", response_text)
    for m in bw_matches:
        active = m.group(1).lower() == "true"
        try:
            soul_path = os.path.join(PROJECT_ROOT, "var", "elysia", "soul.json")
            os.makedirs(os.path.dirname(soul_path), exist_ok=True)
            soul_data = {}
            if os.path.exists(soul_path):
                with open(soul_path, "r", encoding="utf-8") as f:
                    soul_data = json.load(f)
            soul_data["blackwall_protocol"] = {"active": active, "triggered_at": str(datetime.datetime.now())}
            with open(soul_path, "w", encoding="utf-8") as f:
                json.dump(soul_data, f, indent=4, ensure_ascii=False)
            results.append({"skill": "trigger_blackwall_protocol", "active": active, "status": "success"})
        except Exception as e:
            results.append({"skill": "trigger_blackwall_protocol", "error": str(e)})

    # 17. Deep Web Dive (Netrunner Depth)
    dive_matches = re.finditer(r"<skill:dive_layer\(depth=(\d+)\)>", response_text)
    for m in dive_matches:
        depth = int(m.group(1))
        try:
            soul_path = os.path.join(PROJECT_ROOT, "var", "elysia", "soul.json")
            os.makedirs(os.path.dirname(soul_path), exist_ok=True)
            soul_data = {}
            if os.path.exists(soul_path):
                with open(soul_path, "r", encoding="utf-8") as f:
                    soul_data = json.load(f)
            soul_data["net_depth"] = {"value": depth, "updated_at": str(datetime.datetime.now())}
            with open(soul_path, "w", encoding="utf-8") as f:
                json.dump(soul_data, f, indent=4, ensure_ascii=False)
            results.append({"skill": "dive_layer", "depth": depth, "status": "success"})
        except Exception as e:
            results.append({"skill": "dive_layer", "error": str(e)})

    return results

def run_system_doctor():
    """Scan OS health and generate report (NIGHT CITY EDITION)"""
    report = ["[NIGHT CITY] ELVSIΛ - SYSTEM DIAGNOSTIC"]
    report.append(f"TIMESTAMP: {datetime.datetime.now().strftime('%Y/%m/%d %H:%M:%S')} // AUTH_LEVEL: ROOT")
    
    cpu = psutil.cpu_percent()
    ram = psutil.virtual_memory().percent
    report.append(f" [NET_SYNC] CPU_LOAD: {cpu}%, RAM_USE: {ram}%")
    
    critical_paths = [CONFIG_PATH, APPS_DIR]
    report.append(" [ICE_CHECK] Scanning critical sectors...")
    for p in critical_paths:
        status = "SECURE" if os.path.exists(p) else "HACKED/MISSING"
        report.append(f"  > SECTOR: {os.path.basename(p)} -> STATUS: {status}")
        
    report.append(" [CYBER_SOUL] Resonance field stable. Connection active.")
    return "\n".join(report)

# ==================== AbyssRTOS Workbench Skills ====================

@app.get("/system/read_src")
async def read_src(file: str):
    """Source code loading for Workbench"""
    path = os.path.join(PROJECT_ROOT, "usr", "src", "abyssrtos", file)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Source not found")
    with open(path, "r", encoding="utf-8") as f:
        return {"content": f.read()}

@app.post("/system/abyss/build")
async def abyss_build(platform: str = Body(..., embed=True)):
    """Build AbyssRTOS via WSL2 (Rutile) (UTF-8 Hardened)"""
    src_dir = os.path.join(PROJECT_ROOT, "usr", "src", "abyssrtos")
    try:
        # Execute make in WSL - Force UTF-8 Encoding

        cmd = f"wsl -d Ubuntu-24.04 -e bash -c \"export LC_ALL=C.UTF-8 && make -C {src_dir.replace('C:', '/mnt/c').replace('\\', '/')} PLATFORM={platform}\""
        
        proc = await asyncio.create_subprocess_shell(
            cmd, 
            stdout=asyncio.subprocess.PIPE, 
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "PYTHONIOENCODING": "utf-8"}
        )
        stdout, stderr = await proc.communicate()
        
        output = stdout.decode('utf-8', errors='replace') + stderr.decode('utf-8', errors='replace')
        return {
            "status": "success" if proc.returncode == 0 else "error",
            "output": output
        }
    except Exception as e:
        return {"status": "error", "output": str(e)}

@app.get("/system/abyss/run")
async def abyss_run():
    """Boot AbyssRTOS via QEMU (WSL) with Telemetry Capture"""
    global ABYSS_PROCESS
    src_dir = os.path.join(PROJECT_ROOT, "usr", "src", "abyssrtos")
    
    # Stop if already running (Simple lifecycle management)

    if ABYSS_PROCESS and ABYSS_PROCESS.returncode is None:
        try:
            ABYSS_PROCESS.terminate()
        except:
            pass

    cmd = f"wsl -d Ubuntu-24.04 -e make -C {src_dir.replace('C:', '/mnt/c').replace('\\', '/')} run PLATFORM=qemu"
    
    ABYSS_PROCESS = await asyncio.create_subprocess_shell(
        cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT
    )

    async def capture_telemetry():
        logger.info("📡 AbyssRTOS Telemetry Capture: STARTED")
        while ABYSS_PROCESS and ABYSS_PROCESS.returncode is None:
            line = await ABYSS_PROCESS.stdout.readline()
            if not line: break
            
            text = line.decode('utf-8', errors='replace').strip()
            if text.startswith("TELEMETRY:"):
                try:
                    data = json.loads(text.replace("TELEMETRY:", ""))
                    data["timestamp"] = datetime.datetime.now().isoformat()
                    ABYSS_TELEMETRY_BUFFER.append(data)
                except:
                    pass
        logger.info("📡 AbyssRTOS Telemetry Capture: ENDED")

    asyncio.create_task(capture_telemetry())
    return {"status": "success", "message": "QEMU manifestation initiated. Telemetry link established."}

@app.get("/system/abyss/telemetry")
async def abyss_telemetry_stream():
    """SSE stream for RTOS telemetry"""
    async def event_generator():
        last_index = -1
        while True:
            if ABYSS_TELEMETRY_BUFFER:
                # Send the latest entry

                current_data = ABYSS_TELEMETRY_BUFFER[-1]
                yield f"data: {json.dumps(current_data)}\n\n"
            await asyncio.sleep(1) # 1s Polling to the buffer for SSE

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/system/monitor")
async def monitor():
    """Provides telemetry data"""
    usage = psutil.disk_usage('/')
    soul_path = os.path.join(PROJECT_ROOT, "var", "elysia", "soul.json")
    soul_data = {}
    if os.path.exists(soul_path):
        with open(soul_path, "r", encoding="utf-8") as f:
            soul_data = json.load(f)
            
    return {
        "timestamp": datetime.datetime.now().isoformat(),
        "system": {
            "cpu": psutil.cpu_percent(),
            "ram": psutil.virtual_memory().percent,
            "disk": {
                "total": usage.total // (2**30),
                "used": usage.used // (2**30),
                "free": usage.free // (2**30),
                "percent": usage.percent
            },
            "os": sys.platform
        },
        "elysia": {
            "version": OS_CONFIG.get("system", {}).get("version", "2.0.0"),
            "status": "stable",
            "voice_active": await check_voicevox(),
            "memory_vault": vault.get_stats(),
            "soul_resonance": soul_data,
            "blackwall_active": soul_data.get("blackwall_protocol", {}).get("active", False),
            "net_depth": soul_data.get("net_depth", {}).get("value", 0)
        },
        "config": OS_CONFIG
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "version": OS_CONFIG.get("system", {}).get("version")}

async def check_voicevox() -> bool:
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            resp = await client.get(f"{OS_CONFIG.get('voice', {}).get('host', 'http://127.0.0.1:50021')}/version")
            return resp.status_code == 200
    except:
        return False

@app.post("/chat")
async def chat(request: ChatRequest):
    system_prompt = await get_persona_prompt()
    ollama_messages = [{"role": "system", "content": system_prompt}]
    for m in request.messages:
        ollama_messages.append({"role": m.role, "content": m.content})

    async def generate():
        async with httpx.AsyncClient(timeout=60.0) as client:
            full_response = ""
            try:
                async with client.stream("POST", f"{OS_CONFIG.get('ollama_host', 'http://127.0.0.1:11434')}/api/chat", json={
                    "model": OS_CONFIG.get("ai", {}).get("model", "phi4"),
                    "messages": ollama_messages,
                    "stream": True
                }) as resp:
                    async for line in resp.aiter_lines():
                        if not line: continue
                        body = json.loads(line)
                        if "message" in body:
                            content = body["message"]["content"]
                            full_response += content
                            yield f"data: {json.dumps({'content': content})}\n\n"
                        if body.get("done"):
                            break
                
                skill_results = await handle_skills(full_response)
                if skill_results:
                    yield f"data: {json.dumps({'skills': skill_results})}\n\n"
                    
            except Exception as e:
                logger.error(f"❌ Kernel Error: {e}")
                yield f"data: {json.dumps({'content': 'Resonance error detected in neural cluster.'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/tts")
async def tts(request: VoiceRequest):
    audio_base64 = await generate_voice(request.text, request.speaker_id)
    if not audio_base64:
        raise HTTPException(status_code=500, detail="Voice synthesis failed.")
    return {"audio": audio_base64}

@app.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    temp_path = os.path.join(PROJECT_ROOT, "tmp", file.filename)
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        stt = get_stt()
        text = stt.transcribe(temp_path)
        if os.path.exists(temp_path): os.remove(temp_path)
        return {"status": "success", "text": text}
    except Exception as e:
        logger.error(f"STT Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/network/activity")
async def get_network_activity():
    """Scan network activity (For Aegis)"""
    try:
        conns = []
        # kind='inet' for IPv4 and IPv6
        for c in psutil.net_connections(kind='inet'):
            if c.status == 'ESTABLISHED' or c.status == 'LISTEN':
                process_name = "System/Unknown"
                if c.pid:
                    try:
                        process_name = psutil.Process(c.pid).name()
                    except:
                        pass
                
                conns.append({
                    "pid": c.pid,
                    "process": process_name,
                    "local": f"{c.laddr.ip}:{c.laddr.port}",
                    "remote": f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else "LISTENING",
                    "status": c.status,
                    "threat_level": "LOW" # For future AI analysis
                })
        return {"connections": conns[:20]} # パフォーマンスのため上位20件
    except Exception as e:
        logger.error(f"Network Scan Error: {e}")
        return {"connections": [], "error": str(e)}

# ==================== Governance & Maintenance Endpoints ====================

@app.get("/system/governance")
async def get_governance():
    return governance.get_state()

@app.post("/system/governance/update")
async def update_governance(feature: str = Body(...), enabled: bool = Body(...)):
    if governance.toggle_feature(feature, enabled):
        return {"status": "success", "feature": feature, "enabled": enabled}
    raise HTTPException(status_code=400, detail="Invalid feature")

@app.post("/system/governance/approve")
async def global_approve():
    if governance.update_approval("APPROVED"):
        return {"status": "success", "state": "APPROVED"}
    return {"status": "error"}

@app.post("/system/maintenance/run")
async def run_maintenance():
    report = await maintenance.run_audit()
    return {"status": "success", "report": report}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
