import asyncio
import hashlib
import json
import os
from datetime import datetime
from typing import Any

import ollama
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pymilvus import MilvusClient, model


load_dotenv()

app = FastAPI(title="ElysiaAI Kernel")

class ProcessRequest(BaseModel):
    query: str
    context_id: str | None = None

# --- Initialization & Integrity Check (メモリ層の整合性確認) ---
MILVUS_FILE = "elysia_memory.db"
WORKSPACE = "./workspace"

def init_system():
    if not os.path.exists(WORKSPACE):
        os.makedirs(WORKSPACE)
    
    try:
        client = MilvusClient(MILVUS_FILE)
        # 整合性チェック: コレクションが存在するか確認
        if not client.has_collection("elysia_memories"):
            client.create_collection(collection_name="elysia_memories", dimension=768)
        print("[SUCCESS] Memory Layer Integrated.")
        return client
    except Exception as e:
        print(f"[CRITICAL] Memory Layer Corrupted: {e}. Re-initializing...")
        if os.path.exists(MILVUS_FILE):
            os.remove(MILVUS_FILE)
        new_client = MilvusClient(MILVUS_FILE)
        new_client.create_collection(collection_name="elysia_memories", dimension=768)
        return new_client

client = init_system()
embedding_fn = model.DefaultEmbeddingFunction()

# --- Dynamic Health Check (推論層の動的監視) ---
async def is_ollama_alive():
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, ollama.list)
        return True
    except Exception:
        return False

# --- AEGIS Ledger ---
last_action_hash = "0" * 64

def log_action(action_name: str, params: Any, result: str):
    global last_action_hash
    timestamp = datetime.now().isoformat()
    raw_data = f"{last_action_hash}|{action_name}|{json.dumps(params)}|{result}|{timestamp}"
    new_hash = hashlib.sha256(raw_data.encode()).hexdigest()
    print(f"[AEGIS LEDGER] {action_name} recorded. Hash: {new_hash[:8]}")
    last_action_hash = new_hash
    return new_hash

# --- Sandbox Tools ---
def safe_write_file(filename: str, content: str):
    try:
        safe_path = os.path.abspath(os.path.join(WORKSPACE, os.path.basename(filename)))
        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(content)
        res = f"Successfully wrote to {os.path.basename(safe_path)}"
        log_action("write_file", {"file": filename}, res)
        return res
    except Exception as e:
        res = f"Error: {str(e)}"
        log_action("write_file_failed", {"file": filename}, res)
        return res

def safe_list_files():
    try:
        files = os.listdir(WORKSPACE)
        res = f"Workspace Files: {', '.join(files)}"
        log_action("list_files", {}, res)
        return res
    except Exception as e:
        return f"Error: {str(e)}"

TOOLS = {"write_file": safe_write_file, "list_files": safe_list_files}

TOOL_SPEC = [
    {
        'type': 'function',
        'function': {
            'name': 'write_file',
            'description': 'workspace内にファイルを保存。',
            'parameters': {
                'type': 'object',
                'properties': {
                    'filename': {'type': 'string'},
                    'content': {'type': 'string'},
                },
                'required': ['filename', 'content'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'list_files',
            'description': 'ファイル一覧を取得。',
            'parameters': {'type': 'object', 'properties': {}},
        },
    }
]

# --- Core Reasoning (推論・意思決定) ---
ELYSIA_PERSONA = "あなたはElysia。主権を持つAI。深淵な思考と確かな行動を。workspace内でのみ活動可能。"

@app.get("/health")
async def health():
    ollama_status = await is_ollama_alive()
    return {"status": "ok", "ollama": ollama_status, "workspace": os.path.exists(WORKSPACE)}

@app.post("/process")
async def process_query(request: ProcessRequest):
    if not await is_ollama_alive():
        raise HTTPException(status_code=503, detail="Ollama Node Offline")

    try:
        # 推論プロセスをタイムアウト制限(60秒)付きで実行
        return await asyncio.wait_for(execute_reasoning(request), timeout=60.0)
    except TimeoutError:
        return {"response": "思索が深淵に捕らわれました（タイムアウト）。", "status": "warning", "thoughts": ["思考時間が限界を超えました。"]}
    except Exception as e:
        return {"response": f"共鳴エラー: {str(e)}", "status": "error"}

async def execute_reasoning(request: ProcessRequest):
    # RAG
    search_res = client.search(collection_name="elysia_memories", data=[embedding_fn.encode_queries([request.query])[0]], limit=3)
    context = "\n".join([h['entity']['text'] for h in search_res[0]]) if search_res[0] else ""

    messages = [{'role': 'system', 'content': ELYSIA_PERSONA + "\n【想起】:" + context}, {'role': 'user', 'content': request.query}]
    thought_steps = ["深層意識へのアクセス開始。"]
    
    for i in range(20): # 最大20ステップ（仕様書通り）
        loop = asyncio.get_event_loop()
        # Ollama呼び出しを別スレッドで実行してイベントループを止めないようにする
        response = await loop.run_in_executor(None, lambda: ollama.chat(model='llama3.2', messages=messages, tools=TOOL_SPEC))
        msg = response['message']
        
        if not msg.get('tool_calls'):
            if i < 1:
                continue # 早期終了抑制
            break
        
        messages.append(msg)
        for tool in msg['tool_calls']:
            name = tool['function']['name']
            args = tool['function']['arguments']
            thought_steps.append(f"決断: {name}")
            
            result = TOOLS[name](**args) if name in TOOLS else "Error: Tool not found"
            messages.append({'role': 'tool', 'content': result})
            thought_steps.append(f"観測: {result}")

    # 最終回答
    loop = asyncio.get_event_loop()
    final = await loop.run_in_executor(None, lambda: ollama.chat(model='llama3.2', messages=messages))
    answer = final['message']['content']
    
    # 記憶
    client.insert(collection_name="elysia_memories", data=[{"text": f"Q: {request.query}\nA: {answer}", "vector": embedding_fn.encode_documents([request.query])[0]}])
    
    return {"response": answer, "thoughts": thought_steps, "status": "success"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
