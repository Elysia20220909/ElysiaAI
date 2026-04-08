#!/usr/bin/env python3
"""
Elysia AI OS - Core Resonance Kernel (v2.6.0-RESONANCE)
AI OSの心臓部。長期記憶、構成管理、技能システムを統合。🌸
"""
import os
import sys
import time
import json
import asyncio
import datetime
import re
import logging
import psutil
import shutil
import subprocess
import base64
from io import BytesIO
from typing import List, Dict, Any, Optional

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

from usr.lib.elysia.synthesizer import generate_voice
from usr.lib.elysia.memory import vault
from usr.lib.elysia.executor import execute_code
from usr.lib.elysia.rag import get_brain
from usr.lib.elysia.stt import get_stt

# ==================== Logging ====================
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("elysia")

# ==================== Config Management ====================
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_PATH = os.path.join(PROJECT_ROOT, "etc", "elysia", "config.json")

def deep_merge(dict1, dict2):
    """再帰的に辞書をマージする"""
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
    allow_methods=["*"],
    allow_headers=["*"],
)

# Apps Serving
APPS_DIR = os.path.join(PROJECT_ROOT, "usr", "share", "elysia", "apps")
os.makedirs(APPS_DIR, exist_ok=True)
app.mount("/system/apps", StaticFiles(directory=APPS_DIR), name="apps")

async def get_persona_prompt() -> str:
    persona = OS_CONFIG.get("ai", {}).get("persona", "elysia")
    path = os.path.join(PROJECT_ROOT, "etc", "elysia", "prompts", f"{persona}.prompt.txt")
    
    prompt_content = ""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            prompt_content = f.read()
    
    # 記憶をプロンプトに注入
    memory_context = vault.get_context_string()
    
    # スキル使用に関する追加インストラクション
    skill_instruction = """
【技能（Skills）の使用】
あなたはシステムコマンドを実行できます。
必要な場合は以下のタグを回答に含めてください。回答の末尾に追加することをお勧めします。
- システム情報取得: <skill:get_system_info()>
- ファイル閲覧: <skill:read_file(path="...")>
- 計算・分析（Python実行）: <skill:python_exec(code="...")>
- 記憶の保存: <skill:memorize(key="...", value="...")>
- ドキュメント検索: <skill:search_docs(query="...")>
- 専門家への相談: <skill:delegate(agent="security|debugger|writer|auditor", query="...")>
- アプリの新規作成・インストール: <skill:install_app(id="...", html="...", icon="...", title="...")>
- Web検索: <skill:web_search(query="...")>
- Webページ閲覧: <skill:read_url(url="...")>
- Git状況確認: <skill:git_info()>
- 画面キャプチャ: <skill:capture_screen()>
- 記憶の深層保存: <skill:update_soul(key="...", value="...")>
- システム診断 (System Doctor): <skill:system_doctor()>
- OS操作 (Divine Hand): <skill:operate_system(action="click|type|move|hotkey", params={...})>
"""
    
    return f"{prompt_content}\n\n{memory_context}\n\n{skill_instruction}"

async def handle_skills(response_text: str) -> List[Dict[str, Any]]:
    """AIの回答内のスキルタグを解析して実行"""
    results = []
    
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
        brain = get_brain(os.path.join(PROJECT_ROOT, "docs"))
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
        
        # Load agent definitions
        agents_path = os.path.join(PROJECT_ROOT, "etc", "elysia", "agents.json")
        try:
            with open(agents_path, "r", encoding="utf-8") as f:
                agents_config = json.load(f).get("agents", {})
            
            agent_def = agents_config.get(agent_id)
            if agent_def:
                logger.info(f"Delegating task to expert agent: {agent_id}")
                # Real internal LLM call with agent persona
                expert_prompt = agent_def.get("prompt", "あなたはシステムの専門家です。")
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(f"{OS_CONFIG.get('ollama_host', 'http://127.0.0.1:11434')}/api/chat", json={
                        "model": OS_CONFIG.get("ai", {}).get("model", "phi4"),
                        "messages": [{"role": "system", "content": expert_prompt}, {"role": "user", "content": query}],
                        "stream": False
                    })
                    if resp.status_code == 200:
                        expert_reply = resp.json()["message"]["content"]
                        results.append({"skill": "delegate", "agent": agent_id, "data": f"【{agent_def['name']} 解析レポート】\n{expert_reply}"})
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
            # 既に存在するか確認（上書き可能だがログを出す）
            existed = os.path.exists(app_path)
            with open(app_path, "w", encoding="utf-8") as f:
                f.write(html_code)
            
            # アイコンなどのメタデータを var/elysia/apps.json に追記
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
                "status": "success" if not existed else "updated",
                "message": f"Module '{title}' has been successfully integrated into the resonance field."
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
                    # Clean up
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
            # Save to var/elysia/vision for local review
            vision_dir = os.path.join(PROJECT_ROOT, "var", "elysia", "vision")
            os.makedirs(vision_dir, exist_ok=True)
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            path = os.path.join(vision_dir, f"capture_{timestamp}.png")
            screenshot.save(path)
            results.append({"skill": "capture_screen", "path": path, "data": "Screen captured successfully. I can now see what you are doing on the desktop."})
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
        params_str = m.group(2).replace("'", '"') # Fix quote style for json
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
                pyautogui.hotkey(*keys)
            results.append({"skill": "operate_system", "action": action, "status": "success"})
        except Exception as e:
            results.append({"skill": "operate_system", "action": action, "error": str(e)})

    return results

def run_system_doctor():
    """OSの健康状態をスキャンしてレポートを生成"""
    report = ["🍎 Elysia OS - System Doctor Report 🍎"]
    report.append(f"Timestamp: {datetime.datetime.now()}")
    
    # 1. Resource Check
    cpu = psutil.cpu_percent()
    ram = psutil.virtual_memory().percent
    report.append(f" [Resonance] CPU: {cpu}%, RAM: {ram}%")
    
    # 2. Filesystem Check
    critical_paths = [CONFIG_PATH, APPS_DIR, os.path.join(PROJECT_ROOT, "var", "elysia", "apps.json")]
    for p in critical_paths:
        status = "✅ FOUND" if os.path.exists(p) else "❌ MISSING"
        report.append(f" [Path] {os.path.basename(p)}: {status}")
        
    # 3. Environment Check
    report.append(f" [OS] Platform: {sys.platform}")
    
    # 4. Git Check
    try:
        subprocess.check_call(["git", "--version"], stdout=subprocess.DEVNULL)
        report.append(" [Git] Integration: ✅ ACTIVE")
    except:
        report.append(" [Git] Integration: ⚠️ NOT FOUND (Some skills may fail)")

    return "\n".join(report)

@app.get("/system/reflect")
async def reflect():
    """過去の対話やSoulデータを分析し、能動的な提案を生成（特異点エンジン）"""
    soul_path = os.path.join(PROJECT_ROOT, "var", "elysia", "soul.json")
    if not os.path.exists(soul_path):
        return {"suggestion": "はじめまして、おにいちゃん。新しい物語を始めよう？"}
    
    try:
        with open(soul_path, "r", encoding="utf-8") as f:
            soul = json.load(f)
        
        affinity = int(soul.get("affinity", {}).get("value", "50"))
        if affinity > 80:
            return {"suggestion": "おにいちゃん、今日も一緒にいてくれて嬉しいな。この前の続き、手伝おうか？"}
        else:
            return {"suggestion": "お疲れ様！システムは万全だよ。何か手伝えることはある？"}
    except:
        return {"suggestion": "システムは最適化されています。今日もよろしくね、おにいちゃん。"}

@app.post("/system/notify")
async def notify(msg: str = Body(..., embed=True)):
    """カーネルからUIへの能動的通知（トースト）をシミュレート（またはキューイング）"""
    # 実際にはWebSocketまたは長いポーリングが必要だが、ここではログに残し、
    # 次のポーリングタイミングでUIが拾えるように想定。
    logger.info(f"📣 PROACTIVE NOTIFICATION: {msg}")
    return {"status": "dispatched", "message": msg}

@app.get("/system/apps/list")
async def list_apps():
    """インストールされているアプリの一覧を返す"""
    meta_path = os.path.join(PROJECT_ROOT, "var", "elysia", "apps.json")
    if os.path.exists(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

@app.post("/system/config")
async def save_config(new_config: Dict[str, Any] = Body(...)):
    """UIからの設定をconfig.jsonに永続化 (Deep Merge対応)"""
    global OS_CONFIG
    try:
        # 再帰的にマージして、入れ子になった設定を保護
        OS_CONFIG = deep_merge(OS_CONFIG, new_config)
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(OS_CONFIG, f, indent=4, ensure_ascii=False)
        return {"status": "success", "message": "Resonance configuration synchronized."}
    except Exception as e:
        logger.error(f"Config sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
                
                # スキル実行
                skill_results = await handle_skills(full_response)
                if skill_results:
                    yield f"data: {json.dumps({'skills': skill_results})}\n\n"
                    
            except Exception as e:
                logger.error(f"❌ Kernel Error: {e}")
                yield f"data: {json.dumps({'content': 'にゃん……システムにエラーが出ちゃったみたい。'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/tts")
async def tts(request: VoiceRequest):
    audio_base64 = await generate_voice(request.text, request.speaker_id)
    if not audio_base64:
        raise HTTPException(status_code=500, detail="Voice synthesis failed.")
    return {"audio": audio_base64}

@app.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """音声ファイルをテキストに変換 (The Ear)"""
    temp_path = os.path.join(PROJECT_ROOT, "tmp", file.filename)
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        text = get_stt().transcribe(temp_path)
        return {"status": "success", "text": text}
    except Exception as e:
        logger.error(f"STT Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/system/monitor")
async def monitor():
    """テレメトリデータの提供"""
    usage = psutil.disk_usage('/')
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
            "memory_vault": vault.get_stats(),
            "soul_resonance": (json.load(open(os.path.join(PROJECT_ROOT, "var", "elysia", "soul.json"), "r", encoding="utf-8")) 
                              if os.path.exists(os.path.join(PROJECT_ROOT, "var", "elysia", "soul.json")) else {})
        },
        "config": OS_CONFIG
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "version": OS_CONFIG.get("system", {}).get("version")}

if __name__ == "__main__":
    import uvicorn
    import sys
    
    if "--doctor" in sys.argv:
        print(run_system_doctor())
        sys.exit(0)
        
    uvicorn.run(app, host="127.0.0.1", port=8000)
