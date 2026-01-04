# Neuro Integration Guide for Elysia AI

Elysia AI に Neuro モジュール統合を完了しました。このガイドでは、統合の詳細と使用方法を説明します。

## 📋 統合概要

### アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│           Elysia AI (Express Server)                 │
│              Port: 3000                              │
├─────────────────────────────────────────────────────┤
│ • Chat/RAG Routes                                   │
│ • Neuro Memory API Bridge (/api/neuro/*)            │
│ • Health Checks                                      │
└──────────────────────┬──────────────────────────────┘
                       │ (HTTP/JSON)
                       ▼
┌─────────────────────────────────────────────────────┐
│     FastAPI Server (Python Backend)                 │
│              Port: 8000                              │
├─────────────────────────────────────────────────────┤
│ • RAG Search (/rag)                                 │
│ • Chat with Ollama (/chat)                          │
│ • Neuro Memory APIs (/neuro/memory/*)               │
│ • ChromaDB Vector Store (Memory)                    │
│ • Milvus Integration (Optional)                     │
└─────────────────────────────────────────────────────┘
```

## 🚀 クイックスタート

### 1. Python 依存関係をインストール

```bash
cd python
pip install -r requirements.txt
```

**新しく追加された依存関係:**

- `chromadb>=0.5.0` - ベクトルメモリデータベース
- Optional: `realtimestt`, `realtimetts` - 音声入出力

### 2. FastAPI サーバーを起動

```bash
python fastapi_server.py
# またはターミナルから
python -m uvicorn fastapi_server:app --reload --host 127.0.0.1 --port 8000
```

### 3. Elysia AI サーバーを起動

```bash
bun run dev
# または
npm run dev
```

### 4. API をテスト

```bash
# Neuro メモリ健全性チェック
curl http://localhost:3000/api/neuro/health

# メモリを作成
curl -X POST http://localhost:3000/api/neuro/memory/create \
  -H "Content-Type: application/json" \
  -d '{
    "document": "エリシアは優しく美しい少女です",
    "metadata": {"type": "long-term", "category": "personality"}
  }'

# メモリを検索
curl -X POST http://localhost:3000/api/neuro/memory/query \
  -H "Content-Type: application/json" \
  -d '{"query": "エリシアについて", "limit": 5}'
```

## 📚 API エンドポイント

### Memory Management

| メソッド | エンドポイント             | 説明                                 |
| -------- | -------------------------- | ------------------------------------ |
| POST     | `/api/neuro/memory/query`  | セマンティック検索でメモリを検索     |
| POST     | `/api/neuro/memory/create` | 新しいメモリエントリを作成           |
| DELETE   | `/api/neuro/memory/:id`    | ID でメモリを削除                    |
| GET      | `/api/neuro/memory/all`    | すべてのメモリを取得                 |
| POST     | `/api/neuro/memory/clear`  | メモリをタイプ別にクリア             |
| POST     | `/api/neuro/memory/export` | メモリを JSON ファイルにエクスポート |
| POST     | `/api/neuro/memory/import` | JSON ファイルからメモリをインポート  |
| GET      | `/api/neuro/health`        | Neuro バックエンド健全性チェック     |

### Request/Response 例

#### Memory Query

```json
// Request
{
  "query": "エリシアについて",
  "limit": 5
}

// Response
{
  "memories": [
    {
      "id": "mem-123",
      "document": "エリシアは優しい少女です",
      "metadata": { "type": "long-term" },
      "distance": 0.15
    }
  ],
  "query": "エリシアについて",
  "count": 1
}
```

#### Create Memory

```json
// Request
{
  "document": "新しいメモリテキスト",
  "metadata": {
    "type": "short-term",
    "source": "chat_history"
  }
}

// Response
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "created"
}
```

## 🔧 設定

### 環境変数

[.env.example](.env.example) を参照して、以下を設定してください：

```bash
# FastAPI Configuration
DATABASE_CONFIG={"RAG_API_URL":"http://127.0.0.1:8000"}

# Neuro Configuration
NEURO_MEMORY_DB_PATH=./data/neuro_memories
NEURO_AUTO_GENERATE_MEMORY=true
NEURO_ENABLE_VOICE=false  # 音声機能は将来の実装

# Ollama Configuration
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2

# Optional: Milvus Configuration
USE_MILVUS=false
MILVUS_URI=http://localhost:19530
MILVUS_TOKEN=user:password
```

## 💾 ファイル構造

### Python 側 (Backend)

```
python/
├── fastapi_server.py          # メインFastAPIアプリ（Neuro API追加）
├── requirements.txt            # 依存関係（chromadb追加）
├── neuro_module/              # Neuroモジュール（新規）
│   ├── __init__.py
│   ├── config.py              # Neuro設定
│   ├── memory_handler.py      # ChromaDB統合メモリ管理
│   └── audio_processor.py     # 将来：STT/TTS処理
└── data/
    └── neuro_memories/        # ChromaDB永続化ディレクトリ
```

### TypeScript 側 (Frontend)

```
src/
├── index.ts                   # メインExpressサーバー（Neuro API橋接追加）
├── routes/
│   ├── neuro.ts               # Neuroルート（新規、未使用）
│   └── database-routes.ts     # 既存DBルート
└── lib/
    └── multi-model-ensemble.ts
```

## 🔄 データフロー例

### チャット + メモリ検索

```
User Input
    ↓
Elysia (/api/chat)
    ↓
FastAPI (/chat)
    ├─→ Neuro Memory Query (/neuro/memory/query)
    │   └─→ ChromaDB Vector Search
    └─→ Ollama LLM
        └─→ Response with Memory Context
```

## 🛠 トラブルシューティング

### FastAPI に接続できない

```bash
# FastAPI が起動しているか確認
curl http://127.0.0.1:8000/docs

# ポートが使用されているか確認（Windows）
netstat -ano | findstr :8000
```

### ChromaDB エラー

```bash
# メモリデータベースをリセット
rm -rf data/neuro_memories/

# または Neuro 設定で MEMORY_DB_PATH を変更
```

### メモリが見つからない

- `/api/neuro/memory/all` で既存メモリを確認
- クエリの類似度が低すぎる可能性 → `limit` を増やす

## 🚧 将来の拡張

### Planned Features

1. **Audio Integration**

   - RealtimeSTT (STT)
   - RealtimeTTS (TTS)
   - VtubeStudio 連携

2. **Memory Auto-Generation**

   - チャット履歴から自動メモリ生成
   - Reflection Q&A ペア化

3. **Multi-Modal Support**

   - 画像理解 (MiniCPM-V など)
   - スクリーンショット処理

4. **Twitch Integration**

   - Twitch チャット統合
   - リアルタイム配信対応

5. **Vector Storage Options**
   - Milvus との共用化
   - Pinecone / Weaviate サポート

## 📖 参考資料

- [Neuro Repository](https://github.com/kimjammer/Neuro)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Elysia AI Docs](./docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## 📝 License

このプロジェクトは MIT ライセンスの下で公開されています。

---

**Last Updated**: 2026 年 1 月 4 日  
**Integration Version**: 1.0.0
