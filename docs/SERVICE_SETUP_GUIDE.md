# 🚀 サービス起動ガイド

このガイドでは、Elysia AIの全機能を有効化するための3つのサービスの起動方法を説明します。

---

## 📋 必要なサービス

| サービス    | ポート | 機能                     | 必須度       |
| ----------- | ------ | ------------------------ | ------------ |
| **Redis**   | 6379   | レート制限、キャッシング | オプショナル |
| **Ollama**  | 11434  | LLM推論エンジン          | 推奨         |
| **FastAPI** | 8000   | RAG (検索拡張生成)       | オプショナル |

**注意**: これらのサービスがなくてもElysiaサーバーは動作しますが、一部機能が制限されます。

---

## 🔧 インストールと起動方法

### 方法1: 自動起動スクリプト (推奨)

```powershell
# 全サービスを一括起動
.\scripts\start-all-services.ps1 -All

# または個別に起動
.\scripts\start-all-services.ps1 -Redis
.\scripts\start-all-services.ps1 -Ollama
.\scripts\start-all-services.ps1 -FastAPI
```

### 方法2: Docker Compose (要Docker)

```powershell
# Dockerがインストールされている場合
docker compose -f config/docker/docker-compose.yml up -d

# 特定のサービスのみ起動
docker compose -f config/docker/docker-compose.yml up -d redis ollama fastapi
```

### 方法3: 手動起動

---

## 1️⃣ Redis - レート制限とキャッシング

### インストール

**Windows (WSL2推奨)**:

```powershell
# WSL2を使用
wsl sudo apt-get update
wsl sudo apt-get install redis-server
```

**Windows (ネイティブ)**:

1. [Redis for Windows](https://github.com/microsoftarchive/redis/releases) からダウンロード
2. `redis-server.exe` を実行

**macOS/Linux**:

```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server

# CentOS/RHEL
sudo yum install redis
```

### 起動

```powershell
# Windows (WSL2)
wsl sudo service redis-server start

# Windows (ネイティブ)
redis-server

# macOS/Linux
redis-server
# またはバックグラウンド実行
redis-server --daemonize yes
```

### 動作確認

```powershell
# 接続テスト
redis-cli ping
# 期待される出力: PONG

# または
curl http://localhost:6379
```

### 環境変数設定 (.env)

```env
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

### 有効化される機能

✅ **レート制限**: ユーザーごとに60リクエスト/分  
✅ **セッション管理**: 高速なセッションストレージ  
✅ **キャッシング**: API応答の高速化

---

## 2️⃣ Ollama - LLM推論エンジン

### インストール

**Windows/macOS/Linux**:

1. [Ollama公式サイト](https://ollama.ai/download) からダウンロード
2. インストーラーを実行

**コマンドライン (Linux)**:

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### モデルのダウンロード

```powershell
# 推奨モデル (7B - バランス型)
ollama pull llama3.2

# 高性能モデル (70B - 高精度、要GPU)
ollama pull llama3.2:70b

# 軽量モデル (3B - 高速、低スペックPC向け)
ollama pull llama3.2:3b

# 日本語特化モデル
ollama pull elyza:jp-llama2
```

### 起動

```powershell
# サービスとして起動 (自動的に起動することが多い)
ollama serve

# バックグラウンド実行
Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
```

### 動作確認

```powershell
# モデル一覧表示
ollama list

# テスト実行
ollama run llama3.2 "Hello, how are you?"

# APIテスト
curl http://localhost:11434/api/tags
```

### 環境変数設定 (.env)

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### 有効化される機能

✅ **AIチャット**: エリシアAIとの自然な会話  
✅ **コンテキスト理解**: 会話履歴を考慮した応答  
✅ **ストリーミング**: リアルタイムな応答表示  
✅ **多言語対応**: 日本語・英語・その他言語

---

## 3️⃣ FastAPI - RAG (検索拡張生成)

### 前提条件

Python 3.11以降がインストールされていること:

```powershell
python --version
# Python 3.11.0 以上
```

### インストール

```powershell
# 依存関係のインストール
cd python
pip install -r requirements.txt

# または仮想環境を使用 (推奨)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 起動

```powershell
# スクリプトから起動 (推奨)
.\scripts\start-fastapi.ps1

# または直接実行
python python/fastapi_server.py

# 開発モード (ホットリロード)
uvicorn fastapi_server:app --reload --host 0.0.0.0 --port 8000
```

### 動作確認

```powershell
# ヘルスチェック
curl http://localhost:8000/health

# API仕様確認
start http://localhost:8000/docs
```

### 環境変数設定 (.env)

```env
FASTAPI_BASE_URL=http://localhost:8000
RAG_ENABLED=true
```

### 有効化される機能

✅ **RAG検索**: 知識ベースからの情報検索  
✅ **ベクトル検索**: セマンティック検索  
✅ **ドキュメント処理**: PDF/テキストファイルの解析  
✅ **知識管理**: 学習データの追加・更新

---

## 🔍 サービス状態の確認

### PowerShellで確認

```powershell
# Redisプロセス確認
Get-Process redis-server -ErrorAction SilentlyContinue

# Ollamaプロセス確認
Get-Process ollama -ErrorAction SilentlyContinue

# FastAPIポート確認
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

# または一括確認スクリプト
.\scripts\check-services.ps1
```

### ブラウザで確認

- **Ollama**: http://localhost:11434/api/tags
- **FastAPI**: http://localhost:8000/docs
- **Redis**: `redis-cli ping` (CLIのみ)

---

## 🚀 Elysiaサーバーの起動

全サービスが起動したら、Elysiaサーバーを起動します:

```powershell
# 開発モード
bun run dev

# または
npm run dev
```

アクセス先:

- **メインアプリ**: http://localhost:3000
- **管理画面**: http://localhost:3000/admin-extended.html
- **Swagger API**: http://localhost:3000/swagger

---

## 🛑 サービスの停止

### 個別停止

```powershell
# Redis
Stop-Process -Name redis-server -Force

# Ollama
Stop-Process -Name ollama -Force

# FastAPI
Stop-Process -Name python -Force | Where-Object { $_.CommandLine -like "*fastapi*" }
```

### Docker Composeで停止

```powershell
docker compose -f config/docker/docker-compose.yml down
```

---

## 🔧 トラブルシューティング

### ポートが既に使用されている

```powershell
# ポート使用状況確認
netstat -ano | findstr "6379"    # Redis
netstat -ano | findstr "11434"   # Ollama
netstat -ano | findstr "8000"    # FastAPI

# プロセス終了
Stop-Process -Id <PID> -Force
```

### サービスが起動しない

1. **ログ確認**:

   ```powershell
   # Elysiaログ
   Get-Content logs/app.log -Tail 50

   # FastAPIログ
   Get-Content logs/fastapi.log -Tail 50
   ```

2. **依存関係確認**:

   ```powershell
   # Python依存関係
   pip list

   # Bunパッケージ
   bun install
   ```

3. **環境変数確認**:
   ```powershell
   Get-Content .env
   ```

### メモリ不足

Ollamaの使用メモリを削減:

```powershell
# 軽量モデルに変更
ollama pull llama3.2:3b

# .envを更新
OLLAMA_MODEL=llama3.2:3b
```

---

## 📊 推奨構成

### 最小構成 (開発用)

```
✅ Elysia Server のみ
❌ Redis (フォールバック機能で動作)
❌ Ollama (AI機能は無効)
❌ FastAPI (RAG機能は無効)
```

### 標準構成 (推奨)

```
✅ Elysia Server
✅ Ollama + llama3.2
❌ Redis (オプショナル)
❌ FastAPI (オプショナル)
```

### フル構成 (本番環境)

```
✅ Elysia Server
✅ Redis (レート制限)
✅ Ollama + llama3.2
✅ FastAPI (RAG機能)
```

---

## 🎯 次のステップ

1. ✅ サービス起動確認
2. ✅ Elysiaサーバー起動 (`bun run dev`)
3. ✅ ブラウザでアクセス (http://localhost:3000)
4. ✅ AIチャットテスト
5. ✅ 管理画面確認 (http://localhost:3000/admin-extended.html)

---

**作成日**: 2025-12-04  
**最終更新**: 2025-12-04
