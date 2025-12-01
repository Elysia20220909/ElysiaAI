# Elysia AI (RAG + Ollama + Milvus + VOICEVOX♡)

Elysia(Bun) で動くAIチャット。FastAPI + Milvus Lite によるRAG、Ollama(LLM)を統合。**VOICEVOX対応**でエリシアちゃんが本物の声で喋る♡

## ✨ 新機能（v2.0）

- 🎤 **VOICEVOX統合**: 四国めたん（井上麻里奈風）で100%エリシアちゃん声♡
- 💕 **感情表現**: 喜び/照れ/普通で自動ピッチ変化
- 👤 **ユーザー名呼び**: 「おにいちゃん」じゃなくて名前で甘える♡
- 📋 **ボイスログ保存**: 喋った内容を全部記録（最大100件）
- 🛡️ **完全セキュリティ**: XSS/SQLi/DoS/プロンプトインジェクション対策

## 機能

- **RAG**: FastAPI + Milvus Lite（`all-MiniLM-L6-v2`、50セリフ学習済み）
- **LLM**: Ollama（`llama3.2`）ストリーミング応答
- **ボイス**: Web Speech API + VOICEVOX（四国めたん）
- **セキュリティ**: JWT認証、入力バリデーション、XSS保護、レート制限、CORS、セキュリティヘッダー (CSP/X-Frame-Options/X-Content-Type-Options)
- **UI**: Elysia + Alpine.js、Glassmorphism デザイン
- **追加**: `network_simulation/`（AbyssGrid: Blackwall Simulation）
- **自己学習**: Feedback/Knowledge API（JSONL保存, JWT保護）

## クイックスタート

```powershell
# 1) 依存を取得（Node/JS）
bun install

# 2) 環境変数を設定（初回のみ）
cp .env.example .env
# .env を編集して JWT_SECRET と AUTH_PASSWORD を強固な値に変更してください
# 例: JWT_SECRET と JWT_REFRESH_SECRET を生成
#     openssl rand -hex 32 (Git Bash) → 2つ生成して別々に設定
#     PowerShell → [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 })) → 2回実行

# 3) Python環境
./scripts/setup-python.ps1

# 4) Redis起動（Docker推奨）
docker run -d --name elysia-redis -p 6379:6379 redis
# ※ Redis未起動でも動作可能（インメモリレート制限にフォールバック）

# 5) サーバー起動（別ターミナルで順に）
./scripts/start-fastapi.ps1      # RAG / 127.0.0.1:8000
./scripts/start-network-sim.ps1  # NetworkSim API / 127.0.0.1:8001

# 5) Elysiaを起動
bun run src/index.ts             # http://localhost:3000
```

**重要**: `.env` の `JWT_SECRET` と `AUTH_PASSWORD` は必ず変更してください。デフォルト値のまま本番環境にデプロイすると重大なセキュリティリスクがあります。

Linux/macOS/WSL の場合は `.sh` スクリプトを使用してください。

## ビルドと配布

```powershell
bun run build
bun run pack:zip
```

生成した `dist.zip` をリリースに添付できます。

## API概要（認証 + 自己学習）

- `POST /auth/token`: `{ username, password }` → `{ accessToken, refreshToken }`
- `POST /auth/refresh`: `{ refreshToken }` → `{ accessToken }`
- `POST /auth/logout`: `{ refreshToken }` → `{ ok }`
- `POST /elysia-love`: チャット（SSEストリーム）
- `POST /feedback`: JWT必須。`{ query, answer, rating('up'|'down'), reason? }` を `data/feedback.jsonl` に追記
- `POST /knowledge/upsert`: JWT必須。`{ summary, sourceUrl?, tags?, confidence(0..1) }` を `data/knowledge.jsonl` に追記
- `GET /knowledge/review?n=20`: JWT必須。最新N件のナレッジを返す

### 動作確認例（PowerShell）

```powershell
# 認証
$resp = curl.exe -s -X POST http://localhost:3000/auth/token -H "Content-Type: application/json" -d "{\"username\":\"$Env:AUTH_USERNAME\",\"password\":\"$Env:AUTH_PASSWORD\"}"
$accessToken = (ConvertFrom-Json $resp).accessToken
$refreshToken = (ConvertFrom-Json $resp).refreshToken

# Feedback
curl.exe -s -X POST http://localhost:3000/feedback -H "Authorization: Bearer $accessToken" -H "Content-Type: application/json" -d "{\"query\":\"テスト\",\"answer\":\"OK\",\"rating\":\"up\"}"

# Knowledge
curl.exe -s -X POST http://localhost:3000/knowledge/upsert -H "Authorization: Bearer $accessToken" -H "Content-Type: application/json" -d "{\"summary\":\"自己学習テスト\",\"sourceUrl\":\"https://example.com\",\"tags\":[\"docs\"],\"confidence\":0.9}"

# Review
curl.exe -s http://localhost:3000/knowledge/review?n=5 -H "Authorization: Bearer $accessToken"
```

## Redis（任意）

```powershell
docker run -d --name elysia-redis -p 6379:6379 redis:7
$Env:REDIS_ENABLED = "true"
$Env:REDIS_URL = "redis://localhost:6379"
bun run src/index.ts
```

## 運用メモ

- 本番はTLS終端+WAF推奨
- JWTシークレットは十分な長さの乱数にする
- リフレッシュトークンはRedisで検証/失効
- JSONL保管のローテーション: `data/*.jsonl` が肥大化する場合、サイズ閾値でローテーション（例: 50MB超で `*.jsonl.1` へ移動）をタスク化

## 補助スクリプト（Windows）

## 補助スクリプト（Linux/macOS/WSL）

- `./scripts/start-server.sh`: Elysiaサーバー起動
- `./scripts/start-fastapi.sh`: FastAPI RAG起動
- `./scripts/start-network-sim.sh`: Network Simulation API起動
- `./scripts/dev.sh`: FastAPI → Elysia（+任意でNetworkSim）を一括起動。Ctrl+Cで一括停止。

```bash
# 例: デフォルトで起動
./scripts/dev.sh
```

<!-- 末尾の紹介ブロックを削除（MD033/MD025対策） -->
