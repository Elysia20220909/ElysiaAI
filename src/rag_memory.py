import os
from datetime import datetime
import chromadb
from chromadb.config import Settings
import google.generativeai as genai

DB_PATH = os.getenv("ELYSIA_VECTOR_DB", "/app/data/vector")

class GeminiEmbeddingFunction(chromadb.EmbeddingFunction):
    """
    ChromaDB内部でGeminiのtext-embeddingモデルを利用するためのカスタム関数。
    """
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        
    def __call__(self, input: list[str]) -> list[list[float]]:
        # text-embedding-004 または models/embedding-001 を利用
        embeddings = []
        for text in input:
            try:
                res = genai.embed_content(model="models/embedding-001", content=text)
                embeddings.append(res['embedding'])
            except Exception as e:
                # エラー時はゼロ埋め等フォールバックするか例外を投げる
                print(f"[VectorVault] Embedding failed: {e}")
                embeddings.append([0.0]*768)
        return embeddings

class VectorVault:
    """
    ElysiaAIの長期記憶（RAG）を管理するクラス。
    """
    def __init__(self, api_key: str):
        self.api_key = api_key
        # ローカル永続化クライアント
        self.client = chromadb.PersistentClient(path=DB_PATH)
        self.embedding_fn = GeminiEmbeddingFunction(api_key=api_key)
        
        # 'elysia_memories' コレクションを作成または取得
        self.collection = self.client.get_or_create_collection(
            name="elysia_memories",
            embedding_function=self.embedding_fn
        )

    def store_memory(self, user_input: str, sys_response: str):
        """
        会話のチャンクをベクトル化して保存します。
        """
        if not self.api_key:
            return
            
        timestamp = datetime.now().isoformat()
        doc_id = f"mem_{timestamp.replace(':', '').replace('.', '')}"
        
        # 意味のある塊として結合
        chunk = f"Chloe: {user_input}\nElysiaAI: {sys_response}"
        
        self.collection.add(
            documents=[chunk],
            metadatas=[{"timestamp": timestamp, "role": "dialogue"}],
            ids=[doc_id]
        )

    def retrieve_similar(self, query: str, n_results: int = 3) -> list[str]:
        """
        現在の入力に関連する過去の会話を検索します。
        """
        if not self.api_key or self.collection.count() == 0:
            return []
            
        results = self.collection.query(
            query_texts=[query],
            n_results=min(n_results, self.collection.count())
        )
        
        if results and results['documents'] and results['documents'][0]:
            return results['documents'][0]
        return []
