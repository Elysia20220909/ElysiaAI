#!/usr/bin/env python3
"""
Elysia AI - RAG Server with FastAPI + Milvus Lite
エリシアちゃんのセリフ検索システム♡
"""
from typing import Dict, List, Any
from fastapi import FastAPI, Body, HTTPException
from pydantic import BaseModel, Field
from pymilvus import MilvusClient
from sentence_transformers import SentenceTransformer
import uvicorn
import os
import logging

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

model = SentenceTransformer(CONFIG["MODEL_NAME"])
db_path = os.path.join(os.path.dirname(__file__), "elysia.db")
client = MilvusClient(db_path)

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

@app.on_event("startup")
async def init_db() -> None:
    """
    データベースとコレクションを初期化
    起動時に自動実行される
    """
    try:
        collection_name = CONFIG["COLLECTION_NAME"]
        
        # コレクション作成
        if not client.has_collection(collection_name):
            logger.info(f"Creating collection: {collection_name}")
            client.create_collection(
                collection_name=collection_name,
                dimension=CONFIG["EMBEDDING_DIM"],
                primary_field="id",
                vector_field="embedding"
            )
            
            # インデックス作成
            client.create_index(
                collection_name,
                field_name="embedding",
                index_params={
                    "index_type": CONFIG["INDEX_TYPE"],
                    "metric_type": CONFIG["METRIC_TYPE"],
                    "params": {"M": 16, "efConstruction": 200}
                }
            )
            logger.info("✅ Index created successfully")
        
        # 既存データ数チェック
        stats = client.query(collection_name, "", output_fields=["count(*)"])
        count = stats[0].get("count(*)", 0) if stats else 0
        
        # データ挿入
        if count == 0:
            logger.info(f"📝 Inserting {len(ELYSIA_QUOTES)} Elysia quotes...")
            embeddings = model.encode(ELYSIA_QUOTES)
            data = [
                {
                    "id": i,
                    "text": quote,
                    "embedding": embedding.tolist()
                }
                for i, (quote, embedding) in enumerate(zip(ELYSIA_QUOTES, embeddings))
            ]
            client.insert(collection_name, data)
            logger.info("✅ Elysia quotes inserted successfully!")
        else:
            logger.info(f"✅ Collection already has {count} quotes")
    
    except Exception as e:
        logger.error(f"❌ Error initializing DB: {e}")
        raise

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
        # クエリをエンベディング化
        query_embedding = model.encode([query.text])
        
        # Milvus検索
        results = client.search(
            collection_name=CONFIG["COLLECTION_NAME"],
            data=[query_embedding[0].tolist()],
            anns_field="embedding",
            limit=CONFIG["SEARCH_LIMIT"],
            output_fields=["text"]
        )
        
        # 結果抽出
        quotes = [
            hit.get("entity", {}).get("text", "")
            for hit in results[0]
        ]
        
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
    """詳細なヘルスチェック - DB接続状態確認"""
    try:
        collections = client.list_collections()
        
        # コレクション統計取得
        stats = None
        if CONFIG["COLLECTION_NAME"] in collections:
            query_result = client.query(
                CONFIG["COLLECTION_NAME"],
                "",
                output_fields=["count(*)"]
            )
            stats = {
                "count": query_result[0].get("count(*)", 0) if query_result else 0
            }
        
        return {
            "status": "healthy",
            "collections": collections,
            "model": CONFIG["MODEL_NAME"],
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

# ==================== メイン実行 ====================
if __name__ == "__main__":
    logger.info("🌸 Starting Elysia RAG Server...")
    logger.info(f"📍 API: http://{CONFIG['HOST']}:{CONFIG['PORT']}")
    logger.info(f"📚 Docs: http://{CONFIG['HOST']}:{CONFIG['PORT']}/docs")
    logger.info(f"🤖 Model: {CONFIG['MODEL_NAME']}")
    
    uvicorn.run(
        app,
        host=CONFIG["HOST"],
        port=CONFIG["PORT"],
        log_level="info"
    )
