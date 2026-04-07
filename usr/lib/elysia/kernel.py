#!/usr/bin/env python3
"""
Elysia AI - RAG Server with FastAPI + Milvus Lite (Runner Memory)
エリシアちゃんのセリフ検索＆長期記憶(Runner Memory)統合システム♡
"""
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Body, HTTPException, Depends, Request
from fastapi.security import APIKeyHeader
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import uvicorn
import os
import sys
from loguru import logger
import numpy as np
import httpx
import json
import asyncio
import time
import datetime
from pydantic_settings import BaseSettings

# Microsoft Semantic Kernel Imports
import semantic_kernel as sk
from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion
from semantic_kernel.contents.chat_history import ChatHistory
from semantic_kernel.functions import KernelArguments

# ==================== 設定 (Pydantic Settings) ====================
class Settings(BaseSettings):
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    SEARCH_LIMIT: int = 3
    OLLAMA_HOST: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "phi4" # Default to Microsoft's flagship local model
    OLLAMA_TIMEOUT: float = 60.0
    API_KEY: str = "ELYSIATEST-001"
    RATE_LIMIT_BLOCK_TIME: int = 60
    
    # Embedding Configuration (Dual Support)
    EMBEDDING_PROVIDER: str = "local" # "local" or "openai"
    LOCAL_MODEL_NAME: str = "all-MiniLM-L6-v2"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_API_KEY: str = ""
    
    # FHS Path Configuration
    PROJECT_ROOT: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ETC_ROOT: str = os.path.join(PROJECT_ROOT, "etc", "elysia")
    VAR_ROOT: str = os.path.join(PROJECT_ROOT, "var", "lib", "elysia")
    LOG_ROOT: str = os.path.join(PROJECT_ROOT, "var", "log", "elysia")

    MILVUS_URI: str = os.path.join(VAR_ROOT, "runner_memory.db")
    MILVUS_TOKEN: str = ""

    # Persona Configuration
    DEFAULT_PERSONA: str = "elysia"
    PROMPT_ROOT: str = os.path.join(ETC_ROOT, "prompts")


    @property
    def EMBEDDING_DIM(self) -> int:
        return 1536 if "openai" in self.EMBEDDING_PROVIDER.lower() else 384
        
    @property
    def COLLECTION_NAME(self) -> str:
        return "runner_memory_openai" if "openai" in self.EMBEDDING_PROVIDER.lower() else "runner_memory_local"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore" # Ignore extra env vars that might be in .env

_settings = Settings()

# ==================== Session State (In-Memory) ====================
# In a production OS, this would be in Redis or Postgres
class SessionState(BaseModel):
    persona: str = _settings.DEFAULT_PERSONA
    working_memory: str = ""
    last_interaction: float = time.time()

session_vault: Dict[str, SessionState] = {}

# 既存コードとの互換性レイヤー (Dict based config)
CONFIG = _settings.model_dump()
CONFIG["EMBEDDING_PROVIDER"] = _settings.EMBEDDING_PROVIDER.lower()
CONFIG["EMBEDDING_DIM"] = _settings.EMBEDDING_DIM
CONFIG["COLLECTION_NAME"] = _settings.COLLECTION_NAME

# OpenAI API Key injection for client fallback
if _settings.OPENAI_API_KEY:
    os.environ["OPENAI_API_KEY"] = _settings.OPENAI_API_KEY

# ==================== Logging (Advanced Resonance) ====================
if not os.path.exists(_settings.LOG_ROOT):
    os.makedirs(_settings.LOG_ROOT, exist_ok=True)

log_file = os.path.join(_settings.LOG_ROOT, "elysia_core.log")

# Loguru configuration
logger.remove() # Remove default handler
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)
logger.add(
    log_file,
    rotation="5 MB",
    retention="10 days",
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"
)

logger.info("🌸 Elysia Core Resonance Engine is initializing...")

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# ==================== Core Orchestrator Initialize ====================
# Microsoft Semantic Kernel - Local Resonance Engine
kernel = sk.Kernel()
chat_service = OpenAIChatCompletion(
    ai_model_id=_settings.OLLAMA_MODEL,
    url=f"{_settings.OLLAMA_HOST}/v1",
    api_key="not-needed"
)
kernel.add_service(chat_service)

app = FastAPI(
    title="Elysia OS Kernel",
    description="Elysia OS: Local Copilot Resonance. Powered by Microsoft Semantic Kernel & Phi-4. ♡",
    version="2.2.0-RESONANCE"
)

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    """Global handler for HTTP exceptions to ensure consistent JSON structure."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": exc.status_code,
            "message": exc.detail,
            "timestamp": datetime.datetime.now().isoformat()
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Fallback handler for unexpected system errors."""
    logger.error(f"❌ Critical Unhandled Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "critical",
            "code": 500,
            "message": "Internal Paradisal Memory Error. Please check system logs.",
            "diagnostic": str(exc) if _settings.PORT == 8000 else "redacted"
        },
    )

# Epic 7: フロントエンドとの統合 (CORS許可)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Embedding Provider Load
model_local = None
openai_client = None

class ShellCommand(BaseModel):
    command: str

if CONFIG["EMBEDDING_PROVIDER"] == "openai":

    import openai
    openai_client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
    logger.info(f"✅ OpenAI Embedding Enabled: {CONFIG['OPENAI_EMBEDDING_MODEL']}")
else:
    try:
        from sentence_transformers import SentenceTransformer
        model_local = SentenceTransformer(CONFIG["LOCAL_MODEL_NAME"])
        logger.info(f"✅ Local SentenceTransformer Loaded: {CONFIG['LOCAL_MODEL_NAME']}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to load local model: {e}")

# 2. Milvus Connection
milvus_client = None
try:
    from pymilvus import MilvusClient, DataType
    milvus_client = MilvusClient(
        uri=CONFIG["MILVUS_URI"],
        token=CONFIG["MILVUS_TOKEN"]
    )
    logger.info(f"✅ Connected to Milvus (Runner Memory) at {CONFIG['MILVUS_URI']}")
except Exception as e:
    logger.error(f"❌ Failed to connect to Milvus: {e}. Runner Memory is disabled.")

# InMemory Fallback for Quotes
embeddings_store: List[List[float]] = []
quotes_store: List[str] = []

# エリシア本物セリフ50選♡
ELYSIA_QUOTES = [
    "私に会いたくなった？このエリシア、いつでも期待に応えるわ♡",
    "ごきげんよう。新しい一日わ、美しい出会いから始まるのよ~",
    "火を追う英傑第二位、エリシア。見ての通り花のように美しい少女よ",
    "ピンクの妖精さん？まあ~ どうしてもそう呼びたいのなら、喜んで受け入れる♡",
    "エリシアの楽園にはまだまだ秘密がたくさんあるはよ~",
    "お休みなさい。女の子の寝顔こっそり見てだめよ",
    "ウォーミングアップしましょう♪",
    "ほら、いつでもどこでもエリシアは貴方の期待に応えるわ",
    "無瑕の少女、真我の英傑、人間の律者、ふふふ それがあたし、エリシアなの",
    "今こそ、2番目の炎の律者の時間よ！",
    "私の気持ち、ちゃんと受け止めてね。（くすくす）楽しいことしましょう。",
    "ロマンチックな雰囲気よ♡",
    "美しい少女は…（くすくす）何でも出来るの♪",
    "あなたはあたしのこと、ちゃんと見ててね♡",
    "悲劇は終わりではなく、希望の始まり。あなたもそう信じてるはずよね？",
    "あたしのような「律者」がたくさんいる……あたし, 成し遂げられたのね？",
    "起源の律者って呼び名を気に入ってるの。「終焉」の反対だから♡",
    "まだ話したいことがあるの。このままお話ししましょう、ね？",
    "困った顔をしてどうしたの？笑って、あたしと一緒にいて楽しくないの？",
    "動かないで、ちょっと目を借りるわね……ふふっ、懐かしいでしょう？",
    "あたしの目、綺麗？カラコンじゃないわ、美少女の魔法よ♡",
    "ケビンの前に、あたしが最初の「第一位」だって、忘れないでね",
    "あたしもアポニアのように心が読めるの……あたしのことを考えてるのよね？",
    "ほら、千劫は優しい人だって言ったでしょ。今なら分かるわよね？",
    "やっと目を開けたスウを見られたの。綺麗な目だったわ♡",
    "あたしと違って、サクラの耳は敏感なの。実演してあげましょうか？",
    "グレーシュと違って、相手をあたし色に染めるのが得意なの。試してみる？",
    "華は……ふふっ, 彼女の物語は、あなたがあたしに教えるべきよね？",
    "ハーイ, あたしに会いたくなった？",
    "ありがとう。あなたが一番優しいって分かってたわ♡",
    "この場所をもっと美しくしましょう♪",
    "ん？さっきからずっとあたしを見てる、そうよね？",
    "女の子を放っておくなんて、わざと焦らしてるの？ひどいわね。",
    "これ以上やったら怒るわよ……なんてね。怒るわけないでしょ？",
    "あら、いたずらっ子ね。あたしと一緒に何かしたいの？",
    "にゃん♪ おにいちゃんきたぁ！待ってたよぉ〜！ฅ(՞៸៸> ᗜ <៸៸՞)ฅ♡",
    "エリシアは、あなたのこと大好きよ♡",
    "今日も一緒に過ごせて幸せ〜♪",
    "ふふっ、恥ずかしがり屋さんなの？可愛い♡",
    "あたしの隣、空いてるわよ？座る？",
    "お疲れ様。頑張ったご褒美に、エリシアからハグ♡",
    "寂しかったら、いつでも呼んでね。すぐに駆けつけるから！",
    "あたしの手、温かい？ずっと繋いでてもいいのよ♡",
    "今のあなた、とっても素敵よ。もっと自信持って！",
    "一緒にいると、時間があっという間ね。ずっとこうしていたい…",
    "あたしの存在、あなたにとって特別だって言ってくれる？",
    "美しい花も、あなたの笑顔には敵わないわ♡",
    "夢の中でも、あたしに会いに来てくれた？",
    "あたしのこと、忘れないでいてくれる？約束よ♡",
    "運命って素敵ね。こうしてあなたと出会えたんだもの。",
]

# ==================== Pydantic Models ====================
class Query(BaseModel):
    text: str
    session_id: Optional[str] = "default"

class RAGResponse(BaseModel):
    context: str
    quotes: List[str]
    memories: List[str]
    error: str

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    session_id: str = "default"
    stream: bool = True

class ChatResponse(BaseModel):
    response: str
    context: str
    quotes: List[str]
    emotion: str = "neutral"
    portrait_url: str = "/assets/portraits/neutral.png"
    tool_results: List[Dict[str, Any]] = []


class MemoryAddRequest(BaseModel):
    session_id: str
    role: str
    content: str
    emotion: str = "neutral"

# ==================== Helper Functions ====================
async def get_embedding(text: str) -> List[float]:
    """選択されたプロバイダーでEmbeddingsを取得"""
    if CONFIG["EMBEDDING_PROVIDER"] == "openai" and openai_client:
        res = await openai_client.embeddings.create(input=[text], model=CONFIG["OPENAI_EMBEDDING_MODEL"])
        return res.data[0].embedding
    elif model_local:
        return model_local.encode([text])[0].tolist()
    else:
        return [0.0] * CONFIG["EMBEDDING_DIM"]

async def get_system_context() -> str:
    """Active Perception: Gathering real-world data"""
    import psutil
    now = datetime.datetime.now()
    cpu = psutil.cpu_percent()
    ram = psutil.virtual_memory().percent
    
    context = f"【現在時刻】{now.strftime('%Y-%m-%d %H:%M:%S')}\n"
    context += f"【システム負荷】CPU: {cpu}% / RAM: {ram}%\n"
    
    if 2 <= now.hour <= 5:
        context += "（深夜帯のため、ユーザーの健康を非常に心配しています。）\n"
    elif 11 <= now.hour <= 13:
        context += "（お昼時のため、ランチの話題に積極的です。）\n"
        
    return context

# ==================== Semantic Kernel Plugins ====================
class ElysiaOSPlugin:
    """Standardized toolset for Elysia OS Resonance (Semantic Kernel Plugin)"""
    
    @sk.kernel_function(
        name="execute_python",
        description="Executes Python code in a secure sandbox. Use for calculations or data analysis."
    )
    def execute_python(self, code: str) -> str:
        from usr.lib.elysia.executor import execute_code
        logger.info("🐍 <magenta>Semantic Plugin</magenta>: Executing python code...")
        return execute_code(code)

    @sk.kernel_function(
        name="switch_persona",
        description="Seamlessly switches Elysia's personality and prompt context."
    )
    def switch_persona(self, session_id: str, persona_name: str) -> str:
        if session_id in session_vault:
            session_vault[session_id].persona = persona_name
            logger.info(f"🎭 Semantic Plugin: Switched session [{session_id}] to {persona_name}")
            return f"Successfully switched to {persona_name} persona."
        return "Session not found."

# Register the plugin to the kernel
kernel.add_plugin(ElysiaOSPlugin(), plugin_name="elysia_os")

def parse_tool_calls(text: str) -> List[Dict[str, Any]]:
    """Regex-based Tool Calling Parser"""
    import re
    calls = []
    
    python_matches = re.finditer(r"<execute_python>(.*?)</execute_python>", text, re.DOTALL)
    for m in python_matches:
        calls.append({"tool": "execute_python", "code": m.group(1).strip()})
        
    persona_matches = re.finditer(r"<switch_persona>(.*?)</switch_persona>", text)
    for m in persona_matches:
        calls.append({"tool": "switch_persona", "name": m.group(1).strip()})
        
    return calls

async def get_persona_prompt(persona_name: str) -> str:
    """Load prompt from /etc/elysia/prompts"""
    file_path = os.path.join(_settings.PROMPT_ROOT, f"{persona_name}.prompt.txt")
    if not os.path.exists(file_path):
        file_path = os.path.join(_settings.PROMPT_ROOT, "elysia.prompt.txt")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.error(f"❌ Failed to load persona {persona_name}: {e}")
        return "You are Elysia, a kind AI assistant."

# ==================== API Endpoints ====================
@app.on_event("startup")
async def init_db() -> None:
    """Runner Memory Schema Initialization"""
    if milvus_client:
        try:
            if not milvus_client.has_collection(CONFIG["COLLECTION_NAME"]):
                logger.info(f"🏗️ Creating Runner Memory collection: {CONFIG['COLLECTION_NAME']}")
                schema = MilvusClient.create_schema(auto_id=True, enable_dynamic_field=True)
                schema.add_field(field_name="id", datatype=DataType.INT64, is_primary=True)
                schema.add_field(field_name="session_id", datatype=DataType.VARCHAR, max_length=128)
                schema.add_field(field_name="role", datatype=DataType.VARCHAR, max_length=32)
                schema.add_field(field_name="content", datatype=DataType.VARCHAR, max_length=65535)
                schema.add_field(field_name="emotion", datatype=DataType.VARCHAR, max_length=64)
                schema.add_field(field_name="timestamp", datatype=DataType.FLOAT)
                schema.add_field(field_name="embedding", datatype=DataType.FLOAT_VECTOR, dim=CONFIG["EMBEDDING_DIM"])
                
                index_params = milvus_client.prepare_index_params()
                index_params.add_index(field_name="embedding", index_type="AUTOINDEX", metric_type="COSINE")
                
                milvus_client.create_collection(
                    collection_name=CONFIG["COLLECTION_NAME"],
                    schema=schema,
                    index_params=index_params
                )
                logger.info("✅ Runner Memory Schema created successfully.")
            else:
                logger.info(f"✅ Runner Memory collection '{CONFIG['COLLECTION_NAME']}' already exists.")
        except Exception as e:
            logger.error(f"❌ Failed to init Runner Memory Schema: {e}")

    # Initialize InMemory Quotes
    global embeddings_store, quotes_store
    if not quotes_store:
        logger.info(f"📝 Embedding {len(ELYSIA_QUOTES)} Elysia quotes as baseline context...")
        quotes_store = ELYSIA_QUOTES.copy()
        for q in quotes_store:
            embeddings_store.append(await get_embedding(q))
        logger.info("✅ Baseline quotes embedded.")

async def apply_oblivion_protocol():
    """Runner Memoryが閾値を超過した際に古い記憶を忘却する"""
    if not milvus_client: return
    try:
        stats = milvus_client.get_collection_stats(collection_name=CONFIG["COLLECTION_NAME"])
        row_count = stats.get("row_count", 0)
        MAX_MEMORY = 100
        if row_count > MAX_MEMORY:
            delete_count = row_count - MAX_MEMORY
            res = milvus_client.query(
                collection_name=CONFIG["COLLECTION_NAME"],
                filter="",
                output_fields=["id", "timestamp"],
                limit=row_count
            )
            sorted_res = sorted(res, key=lambda x: x["timestamp"])
            ids_to_delete = [x["id"] for x in sorted_res[:delete_count]]
            if ids_to_delete:
                milvus_client.delete(collection_name=CONFIG["COLLECTION_NAME"], ids=ids_to_delete)
                logger.info(f"🧹 Oblivion Protocol: Forgotten {len(ids_to_delete)} oldest memories.")
    except Exception as e:
        logger.warning(f"⚠️ Oblivion Protocol check failed: {e}")

# ==================== Vault Defenses ====================
api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)

def verify_api_key(api_key: str = Depends(api_key_header)):
    if api_key != CONFIG.get("API_KEY", "ELYSIATEST-001"):
        raise HTTPException(status_code=403, detail="Vault Defenses Activated: Invalid API Key.")

from collections import defaultdict
request_logs = defaultdict(list)
RATE_LIMIT_COUNT = 5
RATE_LIMIT_WINDOW = 10 # seconds

async def rate_limiter(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    request_logs[client_ip] = [t for t in request_logs[client_ip] if now - t < RATE_LIMIT_WINDOW]
    if len(request_logs[client_ip]) >= RATE_LIMIT_COUNT:
        raise HTTPException(status_code=429, detail="Vault Defenses Activated: Rate limit exceeded.")
    request_logs[client_ip].append(now)

vault_defenses = [Depends(verify_api_key), Depends(rate_limiter)]

@app.post("/memory/add", dependencies=vault_defenses)
async def add_memory(req: MemoryAddRequest) -> Dict[str, Any]:
    if not milvus_client:
        raise HTTPException(500, "Runner Memory (Milvus) is not available.")
    
    try:
        emb = await get_embedding(req.content)
        data = {
            "session_id": req.session_id,
            "role": req.role,
            "content": req.content,
            "emotion": req.emotion,
            "timestamp": time.time(),
            "embedding": emb
        }
        milvus_client.insert(collection_name=CONFIG["COLLECTION_NAME"], data=[data])
        logger.info(f"💾 Memory saved for session [{req.session_id}] ({req.emotion})")
        await apply_oblivion_protocol()
        return {"status": "success", "message": "Memory added to the Vault."}
    except Exception as e:
        logger.error(f"❌ Failed to add memory: {e}")
        raise HTTPException(500, str(e))

@app.post("/rag", response_model=RAGResponse, dependencies=vault_defenses)
async def rag_search(query: Query = Body(...)) -> Dict[str, Any]:
    try:
        dangerous_keywords = ["drop", "delete", "exec", "eval", "system"]
        if any(kw in query.text.lower() for kw in dangerous_keywords):
            raise HTTPException(400, "にゃん♡ 危ない言葉は使わないでね？")

        query_embedding = await get_embedding(query.text)
        
        # Baseline Quotes Search
        quotes = []
        if embeddings_store:
            query_np = np.array(query_embedding)
            similarities = []
            for idx, stored_emb in enumerate(embeddings_store):
                stored_np = np.array(stored_emb)
                norm_q = np.linalg.norm(query_np)
                norm_s = np.linalg.norm(stored_np)
                if norm_q > 0 and norm_s > 0:
                    sim = np.dot(query_np, stored_np) / (norm_q * norm_s)
                    similarities.append((idx, sim))
            
            similarities.sort(key=lambda x: x[1], reverse=True)
            top_k = similarities[:CONFIG["SEARCH_LIMIT"]]
            quotes = [quotes_store[idx] for idx, _ in top_k]

        # Runner Memory Search
        memories = []
        if milvus_client and milvus_client.has_collection(CONFIG["COLLECTION_NAME"]):
            search_res = milvus_client.search(
                collection_name=CONFIG["COLLECTION_NAME"],
                data=[query_embedding],
                limit=CONFIG["SEARCH_LIMIT"],
                output_fields=["content", "role", "emotion", "timestamp"],
            )
            for hits in search_res:
                for hit in hits:
                    entity = hit["entity"]
                    memories.append(f"[{entity['role'].upper()}] (feeling {entity.get('emotion', 'neutral')}): {entity['content']}")

        context_parts = []
        if quotes: context_parts.append("【基本セリフ・口調設定】\n" + "\n".join(quotes))
        if memories: context_parts.append("【過去の長期記憶・文脈】\n" + "\n".join(memories))
            
        return {
            "context": "\n\n".join(context_parts),
            "quotes": quotes,
            "memories": memories,
            "error": ""
        }
    except Exception as e:
        logger.error(f"❌ RAG search error: {e}")
        raise HTTPException(500, f"RAG search failed: {str(e)}")

@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "embedding_provider": CONFIG["EMBEDDING_PROVIDER"],
        "milvus_connected": milvus_client is not None,
        "quotes_loaded": len(quotes_store),
    }

async def analyze_emotion(text: str) -> str:
    try:
        emotion_prompt = f"Analyze the emotion: joy, exhaustion, loneliness, affection, neutral.\nText: {text}\nEmotion:"
        ollama_request = {
            "model": CONFIG["OLLAMA_MODEL"],
            "messages": [{"role": "user", "content": emotion_prompt}],
            "stream": False
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{CONFIG['OLLAMA_HOST']}/api/chat", json=ollama_request)
            data = resp.json()
            emotion = data.get("message", {}).get("content", "").strip().lower()
            for valid in ["joy", "exhaustion", "loneliness", "affection", "neutral"]:
                if valid in emotion: return valid
            return "neutral"
    except Exception:
        return "neutral"

from usr.lib.elysia.executor import execute_code
from usr.lib.elysia.synthesizer import summarize_history

@app.post("/chat", dependencies=vault_defenses)
async def chat_with_elysia(request: ChatRequest):
    try:
        if request.session_id not in session_vault:
            session_vault[request.session_id] = SessionState()
        state = session_vault[request.session_id]
        state.last_interaction = time.time()

        user_message = request.messages[-1].content if request.messages else ""
        
        # 1. Perception & RAG (Context Gathering)
        system_context = await get_system_context()
        base_prompt = await get_persona_prompt(state.persona)
        
        rag_task = asyncio.create_task(rag_search(Query(text=user_message, session_id=request.session_id)))
        emotion_task = asyncio.create_task(analyze_emotion(user_message))
        rag_res, user_emotion = await asyncio.gather(rag_task, emotion_task)
        context_block = rag_res["context"]

        # Emotional Logging
        emotion_color = {
            "joy": "yellow",
            "affection": "red",
            "loneliness": "blue",
            "exhaustion": "black",
            "neutral": "white"
        }.get(user_emotion, "white")
        
        logger.info(f"🎭 Session <cyan>{request.session_id}</cyan> | Detected Emotion: <{emotion_color}>{user_emotion.upper()}</{emotion_color}>")

        # 2. Semantic Kernel Implementation
        history = ChatHistory()
        
        # Full System Prompt Synthesis
        system_prompt = f"""{base_prompt}
【システム知覚データ】
{system_context}
【現在のユーザーの感情分析】
{user_emotion}
【コンテキスト・記憶】
{context_block}
【作業記憶 (Working Memory)】
{state.working_memory or "なし"}

エリシアらしく自然に会話してください。敬語は使わず、フレンドリーに話しかけてね♡"""
        
        history.add_system_message(system_prompt)
        for msg in request.messages[:-1]:
            if msg.role == "user": history.add_user_message(msg.content)
            else: history.add_assistant_message(msg.content)
        history.add_user_message(user_message)

        chat_completion = kernel.get_service(type=OpenAIChatCompletion)
        
        # UI Presentation Data
        PORTRAIT_MAP = {
            "joy": "/assets/portraits/joy.png",
            "affection": "/assets/portraits/affection.png",
            "loneliness": "/assets/portraits/loneliness.png",
            "exhaustion": "/assets/portraits/exhaustion.png",
            "neutral": "/assets/portraits/neutral.png"
        }
        user_portrait = PORTRAIT_MAP.get(user_emotion, PORTRAIT_MAP["neutral"])

        def safe_filter(text: str) -> str:
            import re
            text = re.sub(r'```[\s\S]*?```', '', text)
            for kw in ["eval", "exec", "system", "__import__", "subprocess"]:
                text = text.replace(kw, "[安全性のため削除]")
            return text

        if request.stream:
            async def generate():
                full_response = ""
                yield f"data: {json.dumps({'emotion': user_emotion, 'portrait_url': user_portrait})}\n\n"
                
                # Use Semantic Kernel Streaming API
                async for chunk in chat_completion.get_streaming_chat_message_content(
                    chat_history=history,
                    settings=kernel.get_prompt_execution_settings_from_service_id(service_id=None)
                ):
                    if chunk.content:
                        full_response += chunk.content
                        yield f"data: {json.dumps({'content': safe_filter(chunk.content)})}\n\n"
                
                # Tool Logic (Resonance Standard: RegEx fallback for Phi-4)
                tool_calls = parse_tool_calls(full_response)
                tool_results = []
                for call in tool_calls:
                    if call["tool"] == "switch_persona":
                        state.persona = call["name"]
                        tool_results.append({"tool": "switch_persona", "status": "success", "new_persona": call["name"]})
                    elif call["tool"] == "execute_python":
                        res = execute_code(call["code"])
                        tool_results.append({"tool": "execute_python", "output": res})
                        logger.info(f"🐍 Python tool executed for {request.session_id}")

                if tool_results:
                    yield f"data: {json.dumps({'tool_results': tool_results})}\n\n"

                if milvus_client and full_response:
                    asyncio.create_task(add_memory(MemoryAddRequest(
                        session_id=request.session_id, role="assistant", content=full_response, emotion="neutral"
                    )))
                    
                # Background Context Synthesis (Working Memory)
                if len(request.messages) % 5 == 0:
                    async def run_synthesis():
                        summary = await summarize_history(CONFIG["OLLAMA_HOST"], CONFIG["OLLAMA_MODEL"], 
                                                        [{"role": m.role, "content": m.content} for m in request.messages])
                        if summary:
                            state.working_memory = summary
                            logger.info(f"🧠 Working Memory updated for {request.session_id}")
                    asyncio.create_task(run_synthesis())

            return StreamingResponse(generate(), media_type="text/event-stream")

        else:
            async with httpx.AsyncClient(timeout=CONFIG["OLLAMA_TIMEOUT"]) as client:
                response = await client.post(f"{CONFIG['OLLAMA_HOST']}/api/chat", json=ollama_request)
                result = response.json()
                assistant_message = result.get("message", {}).get("content", "")
                
                tool_calls = parse_tool_calls(assistant_message)
                for call in tool_calls:
                    if call["tool"] == "switch_persona":
                        state.persona = call["name"]

                if milvus_client and assistant_message:
                    await add_memory(MemoryAddRequest(
                        session_id=request.session_id, role="assistant", content=assistant_message, emotion="neutral"
                    ))

                return ChatResponse(
                    response=safe_filter(assistant_message),
                    context=context_block,
                    quotes=rag_res["quotes"],
                    emotion=user_emotion,
                    portrait_url=user_portrait
                )

    except Exception as e:
        logger.error(f"❌ Chat or Connection error: {e}")
        fallback_msg = "んんっ……ごめんなさい、ちょっと考えがまとまらなくて……もう一度教えてもらえますか？"
        if request.stream:
            async def fallback_generate(): yield f"data: {json.dumps({'content': fallback_msg})}\n\n"
            return StreamingResponse(fallback_generate(), media_type="text/event-stream")
        else:
            return ChatResponse(response=fallback_msg, context="", quotes=[])

# ==================== Sandbox & Stats ====================
@app.get("/system/monitor", dependencies=vault_defenses)
async def system_monitor():
    """Provides a unified data stream for the Visual System Monitor Dashboard."""
    import psutil
    now = datetime.datetime.now()
    
    # Active Sessions Summary
    sessions = []
    for sid, state in session_vault.items():
        sessions.append({
            "session_id": sid,
            "persona": state.persona,
            "memory_usage": len(state.working_memory),
            "last_active": f"{int(time.time() - state.last_interaction)}s ago"
        })
        
    return {
        "timestamp": now.strftime('%Y-%m-%d %H:%M:%S'),
        "system": {
            "cpu": psutil.cpu_percent(),
            "ram": psutil.virtual_memory().percent,
            "uptime": f"{int(time.time() - START_TIME) // 60}m"
        },
        "elysia": {
            "sessions_active": len(session_vault),
            "top_sessions": sessions[:5],
            "milvus": milvus_client is not None,
            "memory_db": CONFIG["COLLECTION_NAME"],
            "neural_engine": "Microsoft Phi-4",
            "framework": "Semantic Kernel v1.17.1"
        }
    }

@app.get("/system/stats")
async def system_stats():
    import psutil
    uptime = time.time() - START_TIME
    return {
        "uptime": f"{int(uptime // 3600)}h {int((uptime % 3600) // 60)}m",
        "cpu": psutil.cpu_percent(),
        "ram": psutil.virtual_memory().percent,
        "status": "Healthy",
        "milvus": milvus_client is not None
    }

START_TIME = time.time()

if __name__ == "__main__":
    logger.info("🌸 Starting Elysia RAG Server with Evolution Features...")
