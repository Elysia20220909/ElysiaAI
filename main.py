import asyncio
import json
import os
import sys

import ollama
from dotenv import load_dotenv
from pymilvus import MilvusClient, model

from modules import ModuleManager


load_dotenv()

WORKSPACE = os.path.abspath("./data")
module_manager = ModuleManager(WORKSPACE)
MILVUS_FILE = os.path.join(WORKSPACE, "elysia_memory.db")

def init_system():
    if not os.path.exists(WORKSPACE):
        os.makedirs(WORKSPACE)
    
    # Pre-pull model if needed
    try:
        print("[KERNEL] Checking for llama3.2...", file=sys.stderr)
        ollama.pull('llama3.2')
    except Exception as e:
        print(f"[KERNEL] Warning: Failed to pull model: {e}", file=sys.stderr)

    try:
        client = MilvusClient(MILVUS_FILE)
        if not client.has_collection("elysia_memories"):
            # DefaultEmbeddingFunction is 768 for bge-small-en-v1.5
            client.create_collection(collection_name="elysia_memories", dimension=768)
        return client
    except Exception as e:
        print(f"[KERNEL] Milvus Reset: {e}", file=sys.stderr)
        if os.path.exists(MILVUS_FILE):
            os.remove(MILVUS_FILE)
        try:
            new_client = MilvusClient(MILVUS_FILE)
            print(f"[MILVUS] Connected to {MILVUS_FILE}")
            new_client.create_collection(collection_name="elysia_memories", dimension=768)
        except Exception as e:
            print(f"[WARNING] Milvus initialization failed: {e}. Falling back to MockClient.")
            class MockClient:
                def __init__(self, *args, **kwargs): pass
                def has_collection(self, *args, **kwargs): return True
                def create_collection(self, *args, **kwargs): pass
                def insert(self, *args, **kwargs): pass
                def search(self, *args, **kwargs): return []
            new_client = MockClient()
        return new_client

client = init_system()
embedding_fn = model.DefaultEmbeddingFunction()

async def is_ollama_alive():
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, ollama.list)
        return True
    except Exception:
        return False

# --- Core Reasoning ---
ELYSIA_PERSONA = "あなたはElysia。主権を持つAI。深淵な思考と確かな行動を。workspace内でのみ活動可能。"

async def execute_reasoning(query: str):
    try:
        query_vec = embedding_fn.encode_queries([query])[0]
        search_res = client.search(collection_name="elysia_memories", data=[query_vec], limit=3)
        db_context = "\n".join([h['entity'].get('text', '') for h in search_res[0]]) if search_res and search_res[0] else ""
    except Exception as e:
        print(f"[KERNEL] Memory Search Error: {e}", file=sys.stderr)
        db_context = ""
    
    messages = [{'role': 'system', 'content': ELYSIA_PERSONA + "\n" + db_context}, {'role': 'user', 'content': query}]
    thought_steps = ["深層意識へのアクセス開始"]
    
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: ollama.chat(model='llama3.2', messages=messages))
        answer = response['message']['content']
        
        # Async memory commit
        try:
            client.insert(collection_name="elysia_memories", data=[{"text": f"Q: {query}\nA: {answer}", "vector": query_vec}])
        except Exception:
            pass
    except Exception as e:
        print(f"[KERNEL] Ollama Error: {e}", file=sys.stderr)
        answer = f"Error in neural bridge: {str(e)}"
    
    return {"response": answer, "thoughts": thought_steps, "status": "success"}

async def main():
    print("[KERNEL] Sovereign Logic Engine Online (Binary Stream Mode)", file=sys.stderr)
    
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        
        try:
            request = json.loads(line)
            method = request.get("method")
            params = request.get("params", {})
            
            if method == "health":
                alive = await is_ollama_alive()
                result = {"ollama": alive, "kernel": True, "workspace": True}
            elif method == "process":
                result = await execute_reasoning(params.get("query", ""))
            elif method == "nanotech":
                result = module_manager.initiate_nanotech()
            elif method == "desktop":
                result = module_manager.access_workspace()
            elif method == "neural":
                result = module_manager.neural_authenticate(params.get("seed", "ELYSIAN_SEED"))
            else:
                result = {"error": "Unknown method"}
            
            print(json.dumps({"id": request.get("id"), "result": result}), flush=True)
            
        except Exception as e:
            print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    asyncio.run(main())
