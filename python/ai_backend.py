#!/usr/bin/env python3
# ai_backend.py (ElysiaのPythonエンドポイントで呼ぶ)
import sys
import json
from pymilvus import MilvusClient
import openai
import os

# OpenAI APIキー設定（環境変数から）
openai.api_key = os.getenv("OPENAI_API_KEY", "")

# LiteでローカルDB作成
db_path = os.path.join(os.path.dirname(__file__), "elysia_chan.db")
client = MilvusClient(db_path)

def init_collection():
    """コレクション初期化"""
    try:
        # 既存コレクションチェック
        if client.has_collection("chat_history"):
            return
        
        # コレクション作成（768次元ベクター用、OpenAIのtext-embedding-ada-002準拠）
        client.create_collection(
            collection_name="chat_history",
            dimension=768,
            primary_field="id",  # 自動ID
            vector_field="embedding"  # ベクター列
        )
        
        # 初期データ挿入（エリシアちゃんの過去返事例）
        data = [
            {"text": "にゃん♪ 今日もおにいちゃんに会えてうれしすぎて心臓バクバクだよぉ〜♡"},
            {"text": "だいすき♡ もっと甘えちゃうねっ！ ฅ(՞៸៸> ᗜ <៸៸՞)ฅ"},
            {"text": "えへへ〜♡ おにいちゃんといると幸せすぎて溶けちゃいそう…"},
            {"text": "もっとギュッてして♡ エリシアちゃん、おにいちゃんのこと大好きだから！"}
        ]
        
        embeddings = [
            openai.embeddings.create(input=d["text"], model="text-embedding-ada-002").data[0].embedding
            for d in data
        ]
        
        client.insert(
            "chat_history",
            data=[
                {"id": i, "text": d["text"], "embedding": emb}
                for i, (d, emb) in enumerate(zip(data, embeddings))
            ]
        )
    except Exception as e:
        print(json.dumps({"error": f"Collection init failed: {str(e)}"}), file=sys.stderr)

def search_similar(query: str, limit: int = 1):
    """類似返事検索"""
    try:
        # クエリをエンベッド
        query_emb = openai.embeddings.create(
            input=query,
            model="text-embedding-ada-002"
        ).data[0].embedding
        
        # 検索（ユーザー入力の類似返事探し）
        results = client.search(
            collection_name="chat_history",
            data=[query_emb],
            limit=limit,  # トップN
            output_fields=["text"]
        )
        
        if results and len(results) > 0 and len(results[0]) > 0:
            return results[0][0].entity.get("text")
        return None
    except Exception as e:
        print(json.dumps({"error": f"Search failed: {str(e)}"}), file=sys.stderr)
        return None

def add_response(text: str):
    """新しい返事をDBに追加"""
    try:
        # エンベッド生成
        embedding = openai.embeddings.create(
            input=text,
            model="text-embedding-ada-002"
        ).data[0].embedding
        
        # 最大IDを取得して新しいIDを生成
        # Note: 簡易実装。本番環境ではUUIDなど使用推奨
        import time
        new_id = int(time.time() * 1000)
        
        client.insert(
            "chat_history",
            data=[{"id": new_id, "text": text, "embedding": embedding}]
        )
        return True
    except Exception as e:
        print(json.dumps({"error": f"Insert failed: {str(e)}"}), file=sys.stderr)
        return False

def main():
    """CLIエントリーポイント"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python ai_backend.py <command> [args]"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    # コレクション初期化
    init_collection()
    
    if command == "search":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Usage: python ai_backend.py search <query>"}))
            sys.exit(1)
        
        query = sys.argv[2]
        result = search_similar(query)
        if result:
            print(json.dumps({"result": result}))
        else:
            print(json.dumps({"result": None}))
    
    elif command == "add":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Usage: python ai_backend.py add <text>"}))
            sys.exit(1)
        
        text = sys.argv[2]
        success = add_response(text)
        print(json.dumps({"success": success}))
    
    else:
        print(json.dumps({"error": f"Unknown command: {command}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
