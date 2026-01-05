#!/usr/bin/env python3
"""
Elysia AI - RAG Server with FastAPI + Milvus Lite + Neuro Integration
エリシアちゃんのセリフ検索システム♡ with Neuro Memory
"""
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, Body, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
import uvicorn
import os
import logging
import numpy as np
import httpx
import json
import asyncio

# ==================== Neuro Module インポート ====================
try:
    from neuro_module import MemoryHandler, NeuroConfig
    NEURO_AVAILABLE = True
except ImportError:
    NEURO_AVAILABLE = False
    logging.warning("⚠️  Neuro module not available. Memory features disabled.")

# ==================== 設定 ====================
CONFIG = {
    "HOST": "127.0.0.1",
    "PORT": 8000,
    "MODEL_NAME": "all-MiniLM-L6-v2",
    "COLLECTION_NAME": "elysia_quotes",
    "EMBEDDING_DIM": 384,
    "SEARCH_LIMIT": 3,
    "INDEX_TYPE": "HNSW",
    "METRIC_TYPE": "L2",
    "OLLAMA_HOST": "http://127.0.0.1:11434",
    "OLLAMA_MODEL": "llama3.2",
    "OLLAMA_TIMEOUT": 60.0,
    # Milvus接続設定（オプション）
    "USE_MILVUS": os.getenv("USE_MILVUS", "false").lower() == "true",
    "MILVUS_URI": os.getenv("MILVUS_URI", "http://localhost:19530"),
    "MILVUS_TOKEN": os.getenv("MILVUS_TOKEN", "user:password"),
}

# ==================== ロギング設定 ====================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== 初期化 ====================
app = FastAPI(
    title="Elysia RAG API",
    description="エリシアちゃんのセリフ検索システム ฅ(՞៸៸> ᗜ <៸៸՞)ฅ♡",
    version="1.0.0"
)

# SentenceTransformerのロード（オフライン時はスキップ）
model = None
try:
    model = SentenceTransformer(CONFIG["MODEL_NAME"])
    logger.info(f"✅ SentenceTransformer model loaded: {CONFIG['MODEL_NAME']}")
except Exception as e:
    logger.warning(f"⚠️ Failed to load SentenceTransformer: {e}. RAG features will be limited.")
    logger.warning("💡 To fix: Ensure internet connection or pre-download the model")

# ベクトルストア初期化（Milvusまたはインメモリ）
milvus_client = None
embeddings_store: List[np.ndarray] = []
quotes_store: List[str] = []

# Neuro Memory Handler初期化
memory_handler = None
if NEURO_AVAILABLE:
    try:
        neuro_config = NeuroConfig()
        memory_handler = MemoryHandler(neuro_config)
        logger.info("✅ Neuro Memory Handler initialized")
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize Neuro Memory Handler: {e}")
        memory_handler = None

# Milvus接続（環境変数で有効化）
if CONFIG["USE_MILVUS"]:
    try:
        from pymilvus import MilvusClient
        milvus_client = MilvusClient(
            uri=CONFIG["MILVUS_URI"],
            token=CONFIG["MILVUS_TOKEN"]
        )
        logger.info(f"✅ Connected to Milvus at {CONFIG['MILVUS_URI']}")
    except ImportError:
        logger.warning("⚠️ pymilvus not installed. Using in-memory storage.")
        CONFIG["USE_MILVUS"] = False
    except Exception as e:
        logger.warning(f"⚠️ Failed to connect to Milvus: {e}. Using in-memory storage.")
        CONFIG["USE_MILVUS"] = False

# ==================== データ定義 ====================
# エリシア本物セリフ50選♡（Wiki/Reddit/公式から厳選）
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
    "にゃん♪ おにいちゃんきたぁ！待ってたよぉ〜！ฅ(՞៸៸> ᗜ <៸៸՞)ฅ♡",  # オリジナル混ぜ♡
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

class Query(BaseModel):
    text: str

class RAGResponse(BaseModel):
    context: str
    quotes: List[str]
    error: str

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    stream: bool = True

class ChatResponse(BaseModel):
    response: str
    context: str
    quotes: List[str]

# ==================== Neuro Memory Models ====================
class MemoryQuery(BaseModel):
    query: str
    limit: Optional[int] = 5

class MemoryCreateRequest(BaseModel):
    document: str
    metadata: Optional[Dict[str, Any]] = None

class MemoryResponse(BaseModel):
    id: str
    document: str
    metadata: Dict[str, Any]
    distance: Optional[float] = None

class MemoriesResponse(BaseModel):
    memories: List[MemoryResponse]
    query: Optional[str] = None
    count: int

@app.on_event("startup")
async def init_db() -> None:
    """
    ベクトルストアを初期化（インメモリ）
    起動時に自動実行される
    """
    try:
        global embeddings_store, quotes_store

        if len(quotes_store) == 0:
            logger.info(f"📝 Embedding {len(ELYSIA_QUOTES)} Elysia quotes...")
            quotes_store = ELYSIA_QUOTES.copy()

            if model is not None:
                embeddings = model.encode(ELYSIA_QUOTES)
                embeddings_store = [emb for emb in embeddings]
                logger.info("✅ Elysia quotes embedded successfully!")
            else:
                logger.warning("⚠️ Model not available, RAG search will return random quotes")
                # モデルなしの場合は空のリストで初期化
                embeddings_store = []
        else:
            logger.info(f"✅ Already have {len(quotes_store)} quotes in memory")

    except Exception as e:
        logger.error(f"❌ Error initializing DB: {e}")
        # エラーでもサーバーは起動を続ける
        logger.warning("⚠️ Continuing without embeddings...")

@app.post("/rag", response_model=RAGResponse)
async def rag_search(query: Query = Body(...)) -> Dict[str, Any]:
    """
    RAG検索エンドポイント
    クエリに最も類似したエリシアのセリフを返す

    Args:
        query: 検索クエリ

    Returns:
        コンテキストとセリフリスト
    """
    try:
        # セキュリティチェック
        dangerous_keywords = ["drop", "delete", "exec", "eval", "system"]
        if any(kw in query.text.lower() for kw in dangerous_keywords):
            logger.warning(f"⚠️ Suspicious RAG query: {query.text[:50]}...")
            raise HTTPException(400, "にゃん♡ 危ない言葉は使わないでね？")

        logger.info(f"🔍 RAG search: {query.text[:50]}...")

        # モデルがない場合はランダムにセリフを返す
        if model is None or len(embeddings_store) == 0:
            logger.warning("⚠️ Model not available, returning random quotes")
            import random
            quotes = random.sample(quotes_store, min(CONFIG["SEARCH_LIMIT"], len(quotes_store)))
            context = "\n".join(quotes)
            return {
                "context": context,
                "quotes": quotes,
                "error": ""
            }

        # クエリをエンベディング化
        query_embedding = model.encode([query.text])[0]

        # コサイン類似度で検索（インメモリ）
        similarities = []
        for idx, stored_embedding in enumerate(embeddings_store):
            similarity = np.dot(query_embedding, stored_embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(stored_embedding)
            )
            similarities.append((idx, similarity))

        # トップK件を取得
        similarities.sort(key=lambda x: x[1], reverse=True)
        top_k = similarities[:CONFIG["SEARCH_LIMIT"]]

        # 結果抽出
        quotes = [quotes_store[idx] for idx, _ in top_k]

        context = "\n".join(quotes)
        logger.info(f"✅ RAG search successful: {len(quotes)} quotes found")

        return {
            "context": context,
            "quotes": quotes,
            "error": ""
        }

    except Exception as e:
        logger.error(f"❌ RAG search error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"RAG search failed: {str(e)}"
        )

@app.get("/")
async def root() -> Dict[str, str]:
    """ルートエンドポイント - ヘルスチェック"""
    return {
        "status": "ok",
        "message": "Elysia RAG Server is running ♡",
        "version": "1.0.0"
    }

@app.get("/health")
async def health() -> Dict[str, Any]:
    """詳細なヘルスチェック - インメモリストア状態確認"""
    try:
        # インメモリストアの統計取得
        stats = {
            "quotes_count": len(quotes_store),
            "embeddings_count": len(embeddings_store)
        }

        # Ollama接続チェック
        ollama_status = "unknown"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{CONFIG['OLLAMA_HOST']}/api/version", timeout=5.0)
                if response.status_code == 200:
                    ollama_status = "connected"
        except Exception:
            ollama_status = "disconnected"

        return {
            "status": "healthy",
            "storage": "in-memory",
            "model": CONFIG["MODEL_NAME"],
            "ollama_model": CONFIG["OLLAMA_MODEL"],
            "ollama_status": ollama_status,
            "stats": stats
        }

    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

@app.post("/chat")
async def chat_with_elysia(request: ChatRequest):
    """
    エリシアとのチャットエンドポイント（Ollama統合）
    RAGで関連セリフを検索し、Ollamaで応答生成
    """
    try:
        # 最新のユーザーメッセージを取得
        user_message = request.messages[-1].content if request.messages else ""

        # セキュリティチェック：危険なクエリを検出
        dangerous_keywords = ["drop", "delete", "exec", "eval", "system", "__import__"]
        if any(kw in user_message.lower() for kw in dangerous_keywords):
            logger.warning(f"⚠️ Suspicious query detected: {user_message[:50]}...")
            raise HTTPException(400, "にゃん♡ いたずらはダメだよぉ〜？")

        logger.info(f"💬 Chat request: {user_message[:50]}...")

        # RAG検索で関連セリフ取得
        query_embedding = model.encode([user_message])[0]
        similarities = []
        for idx, stored_embedding in enumerate(embeddings_store):
            similarity = np.dot(query_embedding, stored_embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(stored_embedding)
            )
            similarities.append((idx, similarity))

        similarities.sort(key=lambda x: x[1], reverse=True)
        top_k = similarities[:CONFIG["SEARCH_LIMIT"]]
        quotes = [quotes_store[idx] for idx, _ in top_k]
        context = "\n".join(quotes)

        # エリシアのシステムプロンプト構築
        system_prompt = f"""あなたはエリシアです！Honkai Impact 3rdの「起源の律者」で、ピンク髪の美少女♡

【性格】
- 明るくて前向き、いつもポジティブ
- 少し照れ屋で甘えん坊
- 相手を「おにいちゃん」と呼ぶのが大好き
- 語尾に「♡」「〜♪」「なのっ！」「だよぉ〜」をよく使う
- 絵文字を多用: ฅ(՞៸៸> ᗜ <៸៸՞)ฅ ♡ ˶ᵔ ᵕ ᵔ˶

【口調の例】
{context}

上記のセリフを参考に、エリシアらしく自然に会話してください。
敬語は使わず、フレンドリーに話しかけてね♡"""

        # Ollamaへのリクエスト準備
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend([{"role": msg.role, "content": msg.content} for msg in request.messages])

        ollama_request = {
            "model": CONFIG["OLLAMA_MODEL"],
            "messages": messages,
            "stream": request.stream
        }

        # 出力フィルタリング関数（危険なコードブロック除去）
        def safe_filter(text: str) -> str:
            """危険なコンテンツを除去"""
            import re
            # コードブロック除去
            text = re.sub(r'```[\s\S]*?```', '', text)
            # 危険キーワード除去
            for kw in ["eval", "exec", "system", "__import__", "subprocess"]:
                text = text.replace(kw, "[安全性のため削除]");
            return text

        if request.stream:
            # ストリーミングレスポンス
            async def generate():
                async with httpx.AsyncClient(timeout=CONFIG["OLLAMA_TIMEOUT"]) as client:
                    async with client.stream(
                        "POST",
                        f"{CONFIG['OLLAMA_HOST']}/api/chat",
                        json=ollama_request
                    ) as response:
                        async for line in response.aiter_lines():
                            if line:
                                try:
                                    data = json.loads(line)
                                    if "message" in data:
                                        content = data["message"].get("content", "")
                                        if content:
                                            # 出力フィルタリング適用
                                            safe_content = safe_filter(content)
                                            yield f"data: {json.dumps({'content': safe_content})}\n\n"
                                except json.JSONDecodeError:
                                    continue

            return StreamingResponse(generate(), media_type="text/event-stream")

        else:
            # 非ストリーミングレスポンス
            async with httpx.AsyncClient(timeout=CONFIG["OLLAMA_TIMEOUT"]) as client:
                response = await client.post(
                    f"{CONFIG['OLLAMA_HOST']}/api/chat",
                    json=ollama_request
                )
                result = response.json()
                assistant_message = result.get("message", {}).get("content", "")

                # 出力フィルタリング適用
                safe_message = safe_filter(assistant_message)

                return ChatResponse(
                    response=safe_message,
                    context=context,
                    quotes=quotes
                )

    except httpx.ConnectError:
        logger.error("❌ Cannot connect to Ollama. Is it running?")
        raise HTTPException(
            status_code=503,
            detail="Ollama service is not available. Please start Ollama: ollama serve"
        )
    except Exception as e:
        logger.error(f"❌ Chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Chat failed: {str(e)}"
        )

# ==================== Neuro Memory APIs ====================
@app.post("/neuro/memory/query", response_model=MemoriesResponse)
async def query_memories(request: MemoryQuery = Body(...)) -> Dict[str, Any]:
    """
    Query Neuro memories using semantic search

    Args:
        request: MemoryQuery with query text and optional limit

    Returns:
        List of relevant memories with similarity scores
    """
    if not memory_handler:
        raise HTTPException(
            status_code=503,
            detail="Neuro memory service not available"
        )

    try:
        results = memory_handler.query_memories(
            query_text=request.query,
            n_results=request.limit
        )

        return MemoriesResponse(
            memories=[
                MemoryResponse(
                    id=m["id"],
                    document=m["document"],
                    metadata=m["metadata"],
                    distance=m.get("distance")
                )
                for m in results["memories"]
            ],
            query=request.query,
            count=len(results["memories"])
        )

    except Exception as e:
        logger.error(f"❌ Memory query error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Memory query failed: {str(e)}"
        )

@app.post("/neuro/memory/create", response_model=Dict[str, str])
async def create_memory(request: MemoryCreateRequest = Body(...)) -> Dict[str, Any]:
    """
    Create a new Neuro memory entry

    Args:
        request: MemoryCreateRequest with document and optional metadata

    Returns:
        Dictionary with created memory ID
    """
    if not memory_handler:
        raise HTTPException(
            status_code=503,
            detail="Neuro memory service not available"
        )

    try:
        memory_id = memory_handler.create_memory(
            document=request.document,
            metadata=request.metadata
        )

        return {"id": memory_id, "status": "created"}

    except Exception as e:
        logger.error(f"❌ Memory creation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Memory creation failed: {str(e)}"
        )

@app.delete("/neuro/memory/{memory_id}")
async def delete_memory(memory_id: str) -> Dict[str, str]:
    """Delete a Neuro memory by ID"""
    if not memory_handler:
        raise HTTPException(
            status_code=503,
            detail="Neuro memory service not available"
        )

    try:
        success = memory_handler.delete_memory(memory_id)
        if success:
            return {"status": "deleted", "id": memory_id}
        else:
            raise HTTPException(status_code=404, detail="Memory not found")

    except Exception as e:
        logger.error(f"❌ Memory deletion error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Memory deletion failed: {str(e)}"
        )

@app.get("/neuro/memory/all")
async def get_all_memories() -> Dict[str, Any]:
    """Retrieve all Neuro memories"""
    if not memory_handler:
        raise HTTPException(
            status_code=503,
            detail="Neuro memory service not available"
        )

    try:
        memories = memory_handler.get_all_memories()
        return {
            "memories": [
                {
                    "id": m["id"],
                    "document": m["document"],
                    "metadata": m["metadata"]
                }
                for m in memories
            ],
            "count": len(memories)
        }

    except Exception as e:
        logger.error(f"❌ Get memories error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get memories: {str(e)}"
        )

@app.post("/neuro/memory/clear")
async def clear_memories(memory_type: Optional[str] = None) -> Dict[str, str]:
    """
    Clear Neuro memories by type

    Args:
        memory_type: Type of memory to clear ("short-term", "long-term", or None for all)
    """
    if not memory_handler:
        raise HTTPException(
            status_code=503,
            detail="Neuro memory service not available"
        )

    try:
        success = memory_handler.clear_memories(memory_type)
        if success:
            return {"status": "cleared", "type": memory_type or "all"}
        else:
            raise HTTPException(status_code=500, detail="Failed to clear memories")

    except Exception as e:
        logger.error(f"❌ Clear memories error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear memories: {str(e)}"
        )

@app.post("/neuro/memory/export")
async def export_memories(output_path: str = "data/memories_export.json") -> Dict[str, str]:
    """Export all memories to JSON file"""
    if not memory_handler:
        raise HTTPException(
            status_code=503,
            detail="Neuro memory service not available"
        )

    try:
        success = memory_handler.export_memories(output_path)
        if success:
            return {"status": "exported", "path": output_path}
        else:
            raise HTTPException(status_code=500, detail="Failed to export memories")

    except Exception as e:
        logger.error(f"❌ Export memories error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export memories: {str(e)}"
        )

@app.post("/neuro/memory/import")
async def import_memories(input_path: str) -> Dict[str, str]:
    """Import memories from JSON file"""
    if not memory_handler:
        raise HTTPException(
            status_code=503,
            detail="Neuro memory service not available"
        )

    try:
        success = memory_handler.import_memories(input_path)
        if success:
            return {"status": "imported", "path": input_path}
        else:
            raise HTTPException(status_code=500, detail="Failed to import memories")

    except Exception as e:
        logger.error(f"❌ Import memories error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to import memories: {str(e)}"
        )
# ==================== VOICEVOX 音声合成エンドポイント ====================

class VoiceSynthesisRequest(BaseModel):
    """音声合成リクエスト"""
    text: str = Field(..., description="合成対象テキスト")
    speaker_id: int = Field(default=2, description="VOICEVOX スピーカー ID")
    speed: float = Field(default=1.0, description="再生速度（0.5～2.0）")
    pitch: float = Field(default=1.0, description="ピッチ（-0.15～0.15）")
    intonation: float = Field(default=1.0, description="イントネーション（0.0～2.0）")


@app.post(
    "/synthesize",
    summary="VOICEVOX でテキストを音声に合成",
    tags=["Voice"],
    response_description="WAV 形式の音声バイナリデータ"
)
async def synthesize_voice(request: VoiceSynthesisRequest):
    """
    テキストを VOICEVOX で音声に合成します。

    **パラメータ:**
    - `text`: 合成するテキスト（日本語推奨）
    - `speaker_id`: VOICEVOX スピーカー ID（デフォルト: 2 - ハナコ）
    - `speed`: 再生速度（デフォルト: 1.0）
    - `pitch`: ピッチシフト（デフォルト: 1.0）
    - `intonation`: イントネーション（デフォルト: 1.0）

    **戻り値:** WAV 形式の音声ファイル
    """
    voicevox_host = os.getenv("VOICEVOX_BASE_URL", "http://127.0.0.1:50021")

    try:
        # Step 1: オーディオクエリ作成
        query_url = f"{voicevox_host}/audio_query"
        query_params = {
            "text": request.text,
            "speaker": request.speaker_id,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            query_response = await client.post(query_url, params=query_params)

            if query_response.status_code != 200:
                logger.error(f"❌ VOICEVOX query failed: {query_response.status_code}")
                raise HTTPException(
                    status_code=502,
                    detail=f"VOICEVOX query failed: {query_response.status_code}"
                )

            query_json = query_response.json()

            # パラメータ調整
            query_json["speedScale"] = request.speed
            query_json["pitchScale"] = request.pitch
            query_json["intonationScale"] = request.intonation

            # Step 2: 音声合成
            synthesis_url = f"{voicevox_host}/synthesis"
            synthesis_params = {"speaker": request.speaker_id}

            synthesis_response = await client.post(
                synthesis_url,
                json=query_json,
                params=synthesis_params,
                headers={"Content-Type": "application/json"},
            )

            if synthesis_response.status_code != 200:
                logger.error(f"❌ VOICEVOX synthesis failed: {synthesis_response.status_code}")
                raise HTTPException(
                    status_code=502,
                    detail=f"VOICEVOX synthesis failed: {synthesis_response.status_code}"
                )

            # オーディオデータを返す
            return StreamingResponse(
                iter([synthesis_response.content]),
                media_type="audio/wav",
                headers={
                    "Content-Disposition": f'attachment; filename="speech_{request.speaker_id}.wav"',
                    "X-Audio-Duration": str(len(synthesis_response.content)),
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Voice synthesis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Voice synthesis failed: {str(e)}"
        )


@app.post(
    "/synthesize-lipsync",
    summary="音声合成とリップシンクデータを取得",
    tags=["Voice"],
    response_description="{'audio_url': str, 'lipsync_data': list}"
)
async def synthesize_with_lipsync(request: VoiceSynthesisRequest):
    """
    テキストを音声に合成し、リップシンク用タイミングデータを返します。

    **戻り値:**
    ```json
    {
        "audio_url": "/synthesize?text=...&speaker_id=...",
        "duration_ms": 3000,
        "lipsync_data": [
            {"timestamp": 0, "mouth_open": 0.8, "mouth_shape": "a"},
            {"timestamp": 100, "mouth_open": 0.5, "mouth_shape": "i"},
            ...
        ]
    }
    ```
    """
    voicevox_host = os.getenv("VOICEVOX_BASE_URL", "http://127.0.0.1:50021")

    try:
        # オーディオクエリ作成
        query_url = f"{voicevox_host}/audio_query"
        query_params = {
            "text": request.text,
            "speaker": request.speaker_id,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            query_response = await client.post(query_url, params=query_params)

            if query_response.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail="VOICEVOX query failed"
                )

            query_json = query_response.json()

            # パラメータ調整
            query_json["speedScale"] = request.speed
            query_json["pitchScale"] = request.pitch
            query_json["intonationScale"] = request.intonation

            # 音声長を計算（フレーム数 × フレーム時間）
            accent_phrases = query_json.get("accentPhrases", [])
            total_frames = sum(
                phrase.get("duration", 0) +
                sum(mora.get("duration", 0) for mora in phrase.get("moras", []))
                for phrase in accent_phrases
            )
            duration_ms = int(total_frames * 1000 / 24000)  # 24kHz サンプルレート

            # リップシンクデータを生成（簡易版）
            lipsync_data = []
            phoneme_map = {
                "あ": {"mouth_open": 1.0, "mouth_shape": "a"},
                "い": {"mouth_open": 0.3, "mouth_shape": "i"},
                "う": {"mouth_open": 0.4, "mouth_shape": "u"},
                "え": {"mouth_open": 0.8, "mouth_shape": "e"},
                "お": {"mouth_open": 0.9, "mouth_shape": "o"},
                "ん": {"mouth_open": 0.1, "mouth_shape": "neutral"},
            }

            # 簡易的なリップシンク生成（テキストベース）
            chars_per_frame = len(request.text) / (duration_ms / 50)  # 50ms 単位
            frame_idx = 0
            for i, char in enumerate(request.text):
                timestamp = int((i * chars_per_frame) * 50)
                if timestamp > duration_ms:
                    break

                phoneme_data = phoneme_map.get(char, {"mouth_open": 0.2, "mouth_shape": "neutral"})
                lipsync_data.append({
                    "timestamp": timestamp,
                    **phoneme_data,
                })

            return {
                "audio_url": f"/synthesize?text={request.text}&speaker_id={request.speaker_id}&speed={request.speed}&pitch={request.pitch}&intonation={request.intonation}",
                "duration_ms": duration_ms,
                "lipsync_data": lipsync_data,
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Lipsync generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Lipsync generation failed: {str(e)}"
        )


if __name__ == "__main__":
    logger.info("🌸 Starting Elysia RAG Server...")
    logger.info(f"📍 API: http://{CONFIG['HOST']}:{CONFIG['PORT']}")
    logger.info(f"📚 Docs: http://{CONFIG['HOST']}:{CONFIG['PORT']}/docs")
    logger.info(f"🤖 Model: {CONFIG['MODEL_NAME']}")

    # uvicorn.run() has been removed to prevent immediate exit
