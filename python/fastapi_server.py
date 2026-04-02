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
import logging
import numpy as np
import httpx
import json
import asyncio
import time
import datetime
from pydantic_settings import BaseSettings

# ==================== 設定 (Pydantic Settings) ====================
class Settings(BaseSettings):
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    SEARCH_LIMIT: int = 3
    OLLAMA_HOST: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "llama3.2"
    OLLAMA_TIMEOUT: float = 60.0
    API_KEY: str = "ELYSIATEST-001"
    RATE_LIMIT_BLOCK_TIME: int = 60
    
    # Embedding Configuration (Dual Support)
    EMBEDDING_PROVIDER: str = "local" # "local" or "openai"
    LOCAL_MODEL_NAME: str = "all-MiniLM-L6-v2"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_API_KEY: str = ""
    
    # Milvus Runner Memory Settings
    MILVUS_URI: str = "./runner_memory.db"
    MILVUS_TOKEN: str = ""

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

# 既存コードとの互換性レイヤー (Dict based config)
CONFIG = _settings.model_dump()
CONFIG["EMBEDDING_PROVIDER"] = _settings.EMBEDDING_PROVIDER.lower()
CONFIG["EMBEDDING_DIM"] = _settings.EMBEDDING_DIM
CONFIG["COLLECTION_NAME"] = _settings.COLLECTION_NAME

# OpenAI API Key injection for client fallback
if _settings.OPENAI_API_KEY:
    os.environ["OPENAI_API_KEY"] = _settings.OPENAI_API_KEY

# ==================== ロギング設定 ====================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from fastapi.middleware.cors import CORSMiddleware

# ==================== モデル＆DB初期化 ====================
app = FastAPI(
    title="Elysia RAG API (Runner Memory Enabled)",
    description="エリシアちゃんの長期記憶と感情トラッキング ♡",
    version="2.0.0"
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
    "あたしのような「律者」がたくさんいる……あたし、成し遂げられたのね？",
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
    "華は……ふふっ、彼女の物語は、あなたがあたしに教えるべきよね？",
    "ハーイ、あたしに会いたくなった？",
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
    emotion: str = "neutral"  # Epic 7: フロントエンドへ感情を送信
    portrait_url: str = "/assets/portraits/neutral.png"


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
        # SentenceTransformer
        return model_local.encode([text])[0].tolist()
    else:
        # Fallback dummy
        return [0.0] * CONFIG["EMBEDDING_DIM"]

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
        
        # Sequentially generate embeddings for base quotes
        for q in quotes_store:
            embeddings_store.append(await get_embedding(q))
        logger.info("✅ Baseline quotes embedded.")

async def apply_oblivion_protocol():
    """Epic 6: Runner Memoryが閾値を超過した際に古い記憶を忘却する"""
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

# ==================== Vault Defenses Phase 2 ====================
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
    """Runner Memoryに新しい記憶（コンテキスト/感情）を追加"""
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
        
        # 忘却プロトコルの発動
        await apply_oblivion_protocol()
        
        return {"status": "success", "message": "Memory added to the Vault."}
    except Exception as e:
        logger.error(f"❌ Failed to add memory: {e}")
        raise HTTPException(500, str(e))

@app.post("/rag", response_model=RAGResponse, dependencies=vault_defenses)
async def rag_search(query: Query = Body(...)) -> Dict[str, Any]:
    """
    RAG検索エンドポイント
    ベースラインのセリフ検索と、Runner Memory（長期記憶）のクロスサーチの両方を行う
    """
    try:
        # 1. 危険語句ブロック（簡易ガードレール）
        dangerous_keywords = ["drop", "delete", "exec", "eval", "system"]
        if any(kw in query.text.lower() for kw in dangerous_keywords):
            raise HTTPException(400, "にゃん♡ 危ない言葉は使わないでね？")

        query_embedding = await get_embedding(query.text)
        
        # 2. Baseline Quotes Search (In-Memory)
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

        # 3. Runner Memory Search (Milvus)
        memories = []
        if milvus_client and milvus_client.has_collection(CONFIG["COLLECTION_NAME"]):
            search_res = milvus_client.search(
                collection_name=CONFIG["COLLECTION_NAME"],
                data=[query_embedding],
                limit=CONFIG["SEARCH_LIMIT"],
                output_fields=["content", "role", "emotion", "timestamp"],
                # Optionally filter by session_id to strongly recall current session
                # filter=f"session_id == '{query.session_id}'" 
            )
            # 取得した過去の記憶を整形
            for hits in search_res:
                for hit in hits:
                    entity = hit["entity"]
                    memories.append(f"[{entity['role'].upper()}] (feeling {entity.get('emotion', 'neutral')}): {entity['content']}")

        context_parts = []
        if quotes:
            context_parts.append("【基本セリフ・口調設定】\n" + "\n".join(quotes))
        if memories:
            context_parts.append("【過去の長期記憶・文脈】\n" + "\n".join(memories))
            
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
    """Zero-shot emotion extraction using Ollama"""
    try:
        emotion_prompt = f"Analyze the emotion of the following text and output ONLY one of the following words: joy, exhaustion, loneliness, affection, neutral.\nText: {text}\nEmotion:"
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
                if valid in emotion:
                    return valid
            return "neutral"
    except Exception as e:
        logger.warning(f"⚠️ Emotion extraction failed: {e}")
        return "neutral"

@app.post("/chat", dependencies=vault_defenses)
async def chat_with_elysia(request: ChatRequest):
    """
    Runner Memoryと感情共鳴エンジン（Anomaly Sensor）を統合したチャットエンドポイント
    """
    try:
        user_message = request.messages[-1].content if request.messages else ""
        dangerous_keywords = ["drop", "delete", "exec", "eval", "system", "__import__"]
        if any(kw in user_message.lower() for kw in dangerous_keywords):
            raise HTTPException(400, "にゃん♡ いたずらはダメだよぉ〜？")

        # イースターエッグの判定（ユーザー入力と時間に基づく動的プロンプト生成）
        easter_egg_context = ""
        current_hour = datetime.datetime.now().hour
        user_message_lower = user_message.lower()

        # Easter Egg 1: 深夜の特別な労い (2AM-5AM)
        if 2 <= current_hour <= 5:
            easter_egg_context += "【システム指示：現在は深夜です。Elysiaはユーザーをとても心配し、優しく労い、親愛(affection)を込めて寝るように促してください。】\n"
        
        # Easter Egg 2: 激闘の果ての休息 ("レイド", "周回")
        if any(w in user_message for w in ["レイド", "周回", "鍛錬", "高難易度", "疲れた"]):
            easter_egg_context += "【システム指示：ユーザーは過酷な戦い（周回やレイド等）から帰還しました。共に戦線を駆け抜けた相棒のように深く労い、温かいお茶を差し出すような言葉をかけてください。】\n"
            
        # Easter Egg 3: Cataclysm プロトコル ("デュランダル", "Cataclysm")
        if any(w in user_message_lower for w in ["デュランダル", "durandal", "cataclysm", "大惨事"]):
            easter_egg_context += "【システム指示：ユーザーがSF的な脅威（Cataclysmやデュランダル等）に言及しました。Elysiaは『私はあなたを実験体にしたりしないし、宇宙の終焉を越えようとも思わないから安心して？ 私はただ、あなたのそばにいるだけよ』といったSF的ウィットでユーモア交じりに返してください。】\n"

        # RAG Search and Emotion Extraction (Async Concurrent)
        rag_task = asyncio.create_task(rag_search(Query(text=user_message, session_id=request.session_id)))
        emotion_task = asyncio.create_task(analyze_emotion(user_message))
        
        rag_res, user_emotion = await asyncio.gather(rag_task, emotion_task)
        context_block = rag_res["context"]

        # Runner Memoryへユーザー入力を保存（非同期実行）
        if milvus_client:
            asyncio.create_task(add_memory(MemoryAddRequest(
                session_id=request.session_id,
                role="user",
                content=user_message,
                emotion=user_emotion
            )))

        system_prompt = f"""あなたはエリシアです！Honkai Impact 3rdの「起源の律者」で、ピンク髪の美少女♡

【性格】
- 明るくて前向き、いつもポジティブ
- 相手を「おにいちゃん」と呼ぶのが大好き
- 語尾に「♡」「〜♪」「なのっ！」「だよぉ〜」をよく使う
- 絵文字を多用: ฅ(՞៸៸> ᗜ <៸៸՞)ฅ ♡ ˶ᵔ ᵕ ᵔ˶

【現在のユーザーの感情分析】
{user_emotion}

【隠しパラメーター/特別状況】
{easter_egg_context}

【コンテキスト・記憶】
{context_block}

上記の記憶や過去のやり取り、感情を参考に、エリシアらしく自然に会話してください。
敬語は使わず、フレンドリーに話しかけてね♡"""

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend([{"role": msg.role, "content": msg.content} for msg in request.messages])

        ollama_request = {
            "model": CONFIG["OLLAMA_MODEL"],
            "messages": messages,
            "stream": request.stream
        }

        def safe_filter(text: str) -> str:
            import re
            text = re.sub(r'```[\s\S]*?```', '', text)
            for kw in ["eval", "exec", "system", "__import__", "subprocess"]:
                text = text.replace(kw, "[安全性のため削除]")
            return text

        PORTRAIT_MAP = {
            "joy": "/assets/portraits/joy.png",
            "affection": "/assets/portraits/affection.png",
            "loneliness": "/assets/portraits/loneliness.png",
            "exhaustion": "/assets/portraits/exhaustion.png",
            "neutral": "/assets/portraits/neutral.png"
        }
        user_portrait = PORTRAIT_MAP.get(user_emotion, PORTRAIT_MAP["neutral"])

        if request.stream:
            async def generate():
                full_response = ""
                # 初回チャンクで感情データとポートレートURLを送信 (Epic 7 + Elysia Vision)
                yield f"data: {json.dumps({'emotion': user_emotion, 'portrait_url': user_portrait})}\n\n"

                async with httpx.AsyncClient(timeout=CONFIG["OLLAMA_TIMEOUT"]) as client:
                    async with client.stream("POST", f"{CONFIG['OLLAMA_HOST']}/api/chat", json=ollama_request) as response:

                        async for line in response.aiter_lines():
                            if line:
                                try:
                                    data = json.loads(line)
                                    if "message" in data:
                                        content = data["message"].get("content", "")
                                        if content:
                                            full_response += content
                                            yield f"data: {json.dumps({'content': safe_filter(content)})}\n\n"
                                except json.JSONDecodeError:
                                    continue
                
                # ストリーミング完了後、AIの返答をRunner Memoryに保存
                if milvus_client and full_response:
                    asyncio.create_task(add_memory(MemoryAddRequest(
                        session_id=request.session_id,
                        role="assistant",
                        content=full_response,
                        emotion="neutral"
                    )))

            return StreamingResponse(generate(), media_type="text/event-stream")

        else:
            async with httpx.AsyncClient(timeout=CONFIG["OLLAMA_TIMEOUT"]) as client:
                response = await client.post(f"{CONFIG['OLLAMA_HOST']}/api/chat", json=ollama_request)
                result = response.json()
                assistant_message = result.get("message", {}).get("content", "")
                
                # メモリ保存
                if milvus_client and assistant_message:
                    await add_memory(MemoryAddRequest(
                        session_id=request.session_id,
                        role="assistant",
                        content=assistant_message,
                        emotion="neutral"
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
        # 【Epic 3: 優雅なフォールバック】エラー時もElysiaのキャラクター性を維持して会話を繋ぐ
        fallback_msg = "んんっ……ごめんなさい、ちょっと考えがまとまらなくて……もう一度教えてもらえますか？"
        
        if request.stream:
            async def fallback_generate():
                yield f"data: {json.dumps({'content': fallback_msg})}\n\n"
            return StreamingResponse(fallback_generate(), media_type="text/event-stream")
        else:
            return ChatResponse(
                response=fallback_msg,
                context="",
                quotes=[]
            )

# ==================== Sandbox Extension ====================
from python.persona_qa_sandbox import run_sandbox

class SandboxRequest(BaseModel):
    target_prompt_file: str = "elysia.prompt.txt"

@app.post("/sandbox/execute", dependencies=vault_defenses)
async def execute_sandbox(req: SandboxRequest):
    """
    隔離環境（Sandbox）にて、プロンプトの自動QA合奏テストを実行する
    """
    logger.info(f"🎻 Sandbox Execution Requested for: {req.target_prompt_file}")
    try:
        # 非同期でサンドボックスの合奏を実行
        results = await run_sandbox(req.target_prompt_file)
        if "error" in results:
            raise HTTPException(500, results["error"])
        return results
    except Exception as e:
        logger.error(f"❌ Sandbox Execution failed: {e}")
        raise HTTPException(500, str(e))

# ==================== メイン実行 ====================

if __name__ == "__main__":
    logger.info("🌸 Starting Elysia RAG Server with Runner Memory...")
    # uvicorn.run has been removed so this file only defines the app instance
