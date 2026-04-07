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
from typing import List, Dict, Any, Optional

import httpx
from fastapi import FastAPI, Body, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from usr.lib.elysia.synthesizer import generate_voice
from usr.lib.elysia.memory import vault
from usr.lib.elysia.executor import execute_code

# ==================== Logging ====================
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("elysia")

# ==================== Config Management ====================
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_PATH = os.path.join(PROJECT_ROOT, "etc", "elysia", "config.json")

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

    return results

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

@app.get("/system/monitor")
async def monitor():
    """テレメトリデータの提供"""
    return {
        "timestamp": datetime.datetime.now().isoformat(),
        "system": {
            "cpu": psutil.cpu_percent(),
            "ram": psutil.virtual_memory().percent,
            "disk": psutil.disk_usage("/").percent
        },
        "config": OS_CONFIG
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "version": OS_CONFIG.get("system", {}).get("version")}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
