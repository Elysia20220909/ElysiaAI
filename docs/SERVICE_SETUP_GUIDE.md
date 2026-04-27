# 🚀 サービス起動ガイチE
こ�Eガイドでは、Elysia AIの全機�Eを有効化するため�E3つのサービスの起動方法を説明します、E
---

## 📋 忁E��なサービス

| サービス    | ポ�EチE| 機�E                     | 忁E��度       |
| ----------- | ------ | ------------------------ | ------------ |
| **Redis**   | 6379   | レート制限、キャチE��ング | オプショナル |
| **Ollama**  | 11434  | LLM推論エンジン          | 推奨         |
| **FastAPI** | 8000   | RAG (検索拡張生�E)       | オプショナル |

**注愁E*: これら�EサービスがなくてめElysiaサーバ�Eは動作しますが、一部機�Eが制限されます、E
---

## 🔧 インスト�Eルと起動方況E
### 方況E: 自動起動スクリプト (推奨)

```powershell
# 全サービスを一括起勁E.\scripts\start-all-services.ps1 -All

# また�E個別に起勁E.\scripts\start-all-services.ps1 -Redis
.\scripts\start-all-services.ps1 -Ollama
.\scripts\start-all-services.ps1 -FastAPI
```

### 方況E: Docker Compose (要Docker)

```powershell
# Dockerがインスト�EルされてぁE��場吁Edocker compose -f config/docker/docker-compose.yml up -d

# 特定�Eサービスのみ起勁Edocker compose -f config/docker/docker-compose.yml up -d redis ollama fastapi
```

### 方況E: 手動起勁E
---

## 1�E�⃣ Redis - レート制限とキャチE��ング

### インスト�Eル

**Windows (WSL2推奨)**:

```powershell
# WSL2を使用
wsl sudo apt-get update
wsl sudo apt-get install redis-server
```

**Windows (ネイチE��チE**:

1. [Redis for Windows](https://github.com/microsoftarchive/redis/releases) からダウンローチE2. `redis-server.exe` を実衁E
**macOS/Linux**:

```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server

# CentOS/RHEL
sudo yum install redis
```

### 起勁E
```powershell
# Windows (WSL2)
wsl sudo service redis-server start

# Windows (ネイチE��チE
redis-server

# macOS/Linux
redis-server
# また�Eバックグラウンド実衁Eredis-server --daemonize yes
```

### 動作確誁E
```powershell
# 接続テスチEredis-cli ping
# 期征E��れる出劁E PONG

# また�E
curl http://localhost:6379
```

### 環墁E��数設宁E(.env)

```env
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

### 有効化される機�E

✁E**レート制陁E*: ユーザーごとに60リクエスチE刁E 
✁E**セチE��ョン管琁E*: 高速なセチE��ョンストレージ  
✁E**キャチE��ング**: API応答�E高速化

---

## 2�E�⃣ Ollama - LLM推論エンジン

### インスト�Eル

**Windows/macOS/Linux**:

1. [Ollama公式サイチE(https://ollama.ai/download) からダウンローチE2. インスト�Eラーを実衁E
**コマンドライン (Linux)**:

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### モチE��のダウンローチE
```powershell
# 推奨モチE�� (7B - バランス垁E
ollama pull llama3.2

# 高性能モチE�� (70B - 高精度、要GPU)
ollama pull llama3.2:70b

# 軽量モチE�� (3B - 高速、低スペックPC向け)
ollama pull llama3.2:3b

# 日本語特化モチE��
ollama pull elyza:jp-llama2
```

### 起勁E
```powershell
# サービスとして起勁E(自動的に起動することが多い)
ollama serve

# バックグラウンド実衁EStart-Process ollama -ArgumentList "serve" -WindowStyle Hidden
```

### 動作確誁E
```powershell
# モチE��一覧表示
ollama list

# チE��ト実衁Eollama run llama3.2 "Hello, how are you?"

# APIチE��チEcurl http://localhost:11434/api/tags
```

### 環墁E��数設宁E(.env)

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### 有効化される機�E

✁E**AIチャチE��**: エリシアAIとの自然な会話  
✁E**コンチE��スト理解**: 会話履歴を老E�Eした応筁E 
✁E**ストリーミング**: リアルタイムな応答表示  
✁E**多言語対忁E*: 日本語�E英語�Eそ�E他言誁E
---

## 3�E�⃣ FastAPI - RAG (検索拡張生�E)

### 前提条件

Python 3.11以降がインスト�EルされてぁE��こと:

```powershell
python --version
# Python 3.11.0 以丁E```

### インスト�Eル

```powershell
# 依存関係�Eインスト�Eル
cd python
pip install -r requirements.txt

# また�E仮想環墁E��使用 (推奨)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 起勁E
```powershell
# スクリプトから起勁E(推奨)
.\scripts\start-fastapi.ps1

# また�E直接実衁Epython python/fastapi_server.py

# 開発モーチE(ホットリローチE
uvicorn fastapi_server:app --reload --host 0.0.0.0 --port 8000
```

### 動作確誁E
```powershell
# ヘルスチェチE��
curl http://localhost:8000/health

# API仕様確誁Estart http://localhost:8000/docs
```

### 環墁E��数設宁E(.env)

```env
FASTAPI_BASE_URL=http://localhost:8000
RAG_ENABLED=true
```

### 有効化される機�E

✁E**RAG検索**: 知識�Eースからの惁E��検索  
✁E**ベクトル検索**: セマンチE��チE��検索  
✁E**ドキュメント�E琁E*: PDF/チE��ストファイルの解极E 
✁E**知識管琁E*: 学習データの追加・更新

---

## 🔍 サービス状態�E確誁E
### PowerShellで確誁E
```powershell
# Redisプロセス確誁EGet-Process redis-server -ErrorAction SilentlyContinue

# Ollamaプロセス確誁EGet-Process ollama -ErrorAction SilentlyContinue

# FastAPIポ�Eト確誁EGet-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

# また�E一括確認スクリプト
.\scripts\check-services.ps1
```

### ブラウザで確誁E
- **Ollama**: http://localhost:11434/api/tags
- **FastAPI**: http://localhost:8000/docs
- **Redis**: `redis-cli ping` (CLIのみ)

---

## 🚀 Elysiaサーバ�Eの起勁E
全サービスが起動したら、Elysiaサーバ�Eを起動しまぁE

```powershell
# 開発モーチEbun run dev

# また�E
npm run dev
```

アクセス允E

- **メインアプリ**: http://localhost:3000
- **管琁E��面**: http://localhost:3000/admin-extended.html
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

## 🔧 トラブルシューチE��ング

### ポ�Eトが既に使用されてぁE��

```powershell
# ポ�Eト使用状況確誁Enetstat -ano | findstr "6379"    # Redis
netstat -ano | findstr "11434"   # Ollama
netstat -ano | findstr "8000"    # FastAPI

# プロセス終亁EStop-Process -Id <PID> -Force
```

### サービスが起動しなぁE
1. **ログ確誁E*:

   ```powershell
   # Elysiaログ
   Get-Content logs/app.log -Tail 50

   # FastAPIログ
   Get-Content logs/fastapi.log -Tail 50
   ```

2. **依存関係確誁E*:

   ```powershell
   # Python依存関俁E   pip list

   # Bunパッケージ
   bun install
   ```

3. **環墁E��数確誁E*:
   ```powershell
   Get-Content .env
   ```

### メモリ不足

Ollamaの使用メモリを削渁E

```powershell
# 軽量モチE��に変更
ollama pull llama3.2:3b

# .envを更新
OLLAMA_MODEL=llama3.2:3b
```

---

## 📊 推奨構�E

### 最小構�E (開発用)

```
✁EElysia Server のみ
❁ERedis (フォールバック機�Eで動佁E
❁EOllama (AI機�Eは無効)
❁EFastAPI (RAG機�Eは無効)
```

### 標準構�E (推奨)

```
✁EElysia Server
✁EOllama + llama3.2
❁ERedis (オプショナル)
❁EFastAPI (オプショナル)
```

### フル構�E (本番環墁E

```
✁EElysia Server
✁ERedis (レート制陁E
✁EOllama + llama3.2
✁EFastAPI (RAG機�E)
```

---

## 🎯 次のスチE��チE
1. ✁Eサービス起動確誁E2. ✁EElysiaサーバ�E起勁E(`bun run dev`)
3. ✁Eブラウザでアクセス (http://localhost:3000)
4. ✁EAIチャチE��チE��チE5. ✁E管琁E��面確誁E(http://localhost:3000/admin-extended.html)

---

**作�E日**: 2025-12-04  
**最終更新**: 2025-12-04
