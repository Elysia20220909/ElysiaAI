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

### Linux/macOS/WSL（推奨）

```bash
# 1) 依存を取得
bun install

# 2) 環境変数を設定（初回のみ）
cp .env.example .env
# .env を編集して JWT_SECRET と AUTH_PASSWORD を強固な値に変更してください
# 例: JWT_SECRET と JWT_REFRESH_SECRET を生成
openssl rand -hex 32  # これを2回実行して別々に設定

# 3) Python環境
./scripts/setup-python.sh

# 4) Redis起動（Docker推奨）
docker run -d --name elysia-redis -p 6379:6379 redis
# ※ Redis未起動でも動作可能（インメモリレート制限にフォールバック）

# 5) 開発環境起動（全サービス一括起動）
./scripts/dev.sh

# または個別起動
./scripts/start-fastapi.sh       # RAG / 127.0.0.1:8000
./scripts/start-network-sim.sh   # NetworkSim API / 127.0.0.1:8001
bun run src/index.ts             # http://localhost:3000
```

### Windows（PowerShell）

```powershell
# 1) 依存を取得
bun install

# 2) 環境変数を設定（初回のみ）
Copy-Item .env.example .env
# .env を編集して JWT_SECRET と AUTH_PASSWORD を強固な値に変更してください
# 例: JWT_SECRET と JWT_REFRESH_SECRET を生成
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))  # 2回実行

# 3) Python環境
./scripts/setup-python.ps1

# 4) Redis起動（Docker推奨）
docker run -d --name elysia-redis -p 6379:6379 redis

# 5) サーバー起動（別ターミナルで順に）
./scripts/start-fastapi.ps1      # RAG / 127.0.0.1:8000
./scripts/start-network-sim.ps1  # NetworkSim API / 127.0.0.1:8001
bun run src/index.ts             # http://localhost:3000
```

**重要**: `.env` の `JWT_SECRET` と `AUTH_PASSWORD` は必ず変更してください。デフォルト値のまま本番環境にデプロイすると重大なセキュリティリスクがあります。

**推奨**: Linux/macOS/WSL環境での実行を推奨します。Windows PowerShellは文字エンコーディングの問題が発生する場合があります。

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

### 動作確認例

**Linux/macOS/WSL:**

```bash
# 認証
RESP=$(curl -s -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"elysia","password":"your-password"}')
ACCESS_TOKEN=$(echo $RESP | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $RESP | jq -r '.refreshToken')

# Feedback
curl -s -X POST http://localhost:3000/feedback \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"テスト","answer":"OK","rating":"up"}'

# Knowledge
curl -s -X POST http://localhost:3000/knowledge/upsert \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"summary":"自己学習テスト","sourceUrl":"https://example.com","tags":["docs"],"confidence":0.9}'

# Review
curl -s "http://localhost:3000/knowledge/review?n=5" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Windows PowerShell:**

```powershell
# 認証
$resp = curl.exe -s -X POST http://localhost:3000/auth/token -H "Content-Type: application/json" -d "{\"username\":\"elysia\",\"password\":\"your-password\"}"
$accessToken = (ConvertFrom-Json $resp).accessToken

# Feedback
curl.exe -s -X POST http://localhost:3000/feedback -H "Authorization: Bearer $accessToken" -H "Content-Type: application/json" -d "{\"query\":\"テスト\",\"answer\":\"OK\",\"rating\":\"up\"}"

# Knowledge
curl.exe -s -X POST http://localhost:3000/knowledge/upsert -H "Authorization: Bearer $accessToken" -H "Content-Type: application/json" -d "{\"summary\":\"自己学習テスト\",\"sourceUrl\":\"https://example.com\",\"tags\":[\"docs\"],\"confidence\":0.9}"

# Review
curl.exe -s "http://localhost:3000/knowledge/review?n=5" -H "Authorization: Bearer $accessToken"
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

### JSONLローテーション

**Linux/macOS/WSL:**

```bash
# 既定: dataディレクトリ, 50MB超でローテート
./scripts/rotate-jsonl.sh

# ディレクトリや閾値を指定
./scripts/rotate-jsonl.sh data 100
```

**Windows PowerShell:**

```powershell
# 既定: dataディレクトリ, 50MB超でローテート
./scripts/rotate-jsonl.ps1

# ディレクトリや閾値を指定
./scripts/rotate-jsonl.ps1 -DataDir data -MaxSizeMB 100
```

### Nginx設定例（本番）

`deploy/nginx.conf.example` を参照。TLS/セキュリティヘッダ/CSP/SSE対応の設定を含みます。

### 自動ローテーション設定（任意）

**Linux cron:**

```bash
# 毎日午前3時に実行
crontab -e
# 以下を追加
0 3 * * * /path/to/elysia-ai/scripts/rotate-jsonl.sh
```

**Windows タスクスケジューラ:**

```powershell
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-File C:\path\to\elysia-ai\scripts\rotate-jsonl.ps1'
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName 'ElysiaJSONLRotation' -Description 'Rotate Elysia AI JSONL logs'
```

## 補助スクリプト

### Linux/macOS/WSL

- `./scripts/setup-python.sh`: Python環境セットアップ
- `./scripts/start-server.sh`: Elysiaサーバー起動
- `./scripts/start-fastapi.sh`: FastAPI RAG起動
- `./scripts/start-network-sim.sh`: Network Simulation API起動
- `./scripts/dev.sh`: 全サービス一括起動（Ctrl+Cで一括停止）
- `./scripts/rotate-jsonl.sh`: JSONLログローテーション

```bash
# 開発環境一括起動
./scripts/dev.sh

# ネットワークシミュレーション含む
./scripts/dev.sh --with-network
```

### Windows PowerShell

- `./scripts/setup-python.ps1`: Python環境セットアップ
- `./scripts/start-server.ps1`: Elysiaサーバー起動
- `./scripts/start-fastapi.ps1`: FastAPI RAG起動
- `./scripts/start-network-sim.ps1`: Network Simulation API起動
- `./scripts/rotate-jsonl.ps1`: JSONLログローテーション

<!-- 末尾の紹介ブロックを削除（MD033/MD025対策） -->
