# Linux/macOS/WSL Setup Guide

このガイドでは、Elysia AIをLinux/macOS/WSL環境でセットアップする手順を説明します。

## システム要件

- **OS**: Ubuntu 22.04+ / Debian 12+ / macOS 12+ / WSL2 (Ubuntu)
- **Bun**: 1.0+ ([インストール](https://bun.sh/install))
- **Python**: 3.10+
- **Node.js**: 不要（Bunが代替）
- **Redis**: 7+ (Docker推奨、なくても動作)
- **Git**: 最新版

## クイックスタート

### 1. リポジトリクローン

```bash
git clone https://github.com/yourusername/elysia-ai.git
cd elysia-ai
```

### 2. Bunインストール（未インストールの場合）

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # または source ~/.zshrc
```

### 3. 依存インストール

```bash
# JavaScript/TypeScript dependencies
bun install

# Python environment
./scripts/setup-python.sh
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. 環境変数設定

```bash
cp .env.example .env
nano .env  # またはお好みのエディタ
```

**最低限必要な設定:**

```bash
# JWT Secrets（必ず強固な値に変更！）
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# 認証情報
AUTH_USERNAME=elysia
AUTH_PASSWORD=$(openssl rand -base64 24)
```

### 5. Redis起動（Docker使用）

```bash
# Dockerがインストール済みの場合
docker run -d --name elysia-redis -p 6379:6379 redis:7-alpine

# Dockerがない場合はスキップ可能（インメモリレート制限にフォールバック）
```

### 6. サーバー起動

**開発環境（推奨）:**

```bash
# 全サービスを一括起動（FastAPI + Elysia）
./scripts/dev.sh

# Ctrl+C で全サービス停止
```

**個別起動:**

```bash
# ターミナル1: FastAPI RAG Server
./scripts/start-fastapi.sh

# ターミナル2: Elysia Server
bun run src/index.ts
```

### 7. ブラウザでアクセス

```bash
# ブラウザを開く
xdg-open http://localhost:3000  # Linux
open http://localhost:3000      # macOS
```

## WSL2特有の設定

### Windowsファイアウォール設定

WSL2からWindowsホストのブラウザでアクセスする場合:

```powershell
# PowerShellで実行（管理者権限）
New-NetFirewallRule -DisplayName "WSL Elysia AI" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000,8000
```

### WSL2 IP確認

```bash
# WSL2のIPアドレス確認
ip addr show eth0 | grep inet | awk '{print $2}' | cut -d/ -f1

# Windowsホスト名でアクセスする場合
# /etc/hosts に追加
echo "$(ip route | awk '/default/ {print $3}') windowshost" | sudo tee -a /etc/hosts
```

## macOS特有の設定

### Homebrewインストール（未インストールの場合）

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Redis（Homebrew経由）

```bash
brew install redis
brew services start redis
```

## スクリプト一覧

| スクリプト | 説明 |
|-----------|------|
| `./scripts/setup-python.sh` | Python環境セットアップ |
| `./scripts/start-server.sh` | Elysiaサーバー起動 |
| `./scripts/start-fastapi.sh` | FastAPI RAG起動 |
| `./scripts/start-network-sim.sh` | Network Simulation API起動 |
| `./scripts/dev.sh` | 全サービス一括起動 |
| `./scripts/rotate-jsonl.sh` | JSONLログローテーション |

## トラブルシューティング

### Bun実行時に "command not found"

```bash
# Bunのパスを確認
echo $PATH | grep -q "$HOME/.bun/bin" || echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Python venv作成失敗

```bash
# Ubuntu/Debian
sudo apt install python3-venv python3-pip

# macOS
brew install python@3.10
```

### ポート3000が使用中

```bash
# 使用中のプロセス確認
lsof -ti:3000

# プロセス終了
kill -9 $(lsof -ti:3000)

# または別ポート使用
PORT=3001 bun run src/index.ts
```

### Redis接続エラー

```bash
# Redis稼働確認
redis-cli ping  # PONG が返ればOK

# Dockerコンテナ確認
docker ps | grep redis

# コンテナ再起動
docker restart elysia-redis
```

### FastAPI起動失敗

```bash
# Python venv有効化確認
which python  # .venv/bin/python が表示されるか？

# 依存再インストール
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## パフォーマンスチューニング

### Bun最適化

```bash
# .env に追加
BUN_RUNTIME_TRANSPILER_CACHE_PATH=/tmp/bun-cache
BUN_FEATURE_FLAG_BUNDLER_WATCH=1
```

### Redis永続化（本番環境）

```bash
docker run -d \
  --name elysia-redis \
  --restart unless-stopped \
  -p 127.0.0.1:6379:6379 \
  -v redis-data:/data \
  redis:7-alpine redis-server --appendonly yes
```

### システムリソース制限

```bash
# Linuxのファイルディスクリプタ制限緩和
ulimit -n 65536

# 永続化: /etc/security/limits.conf に追加
* soft nofile 65536
* hard nofile 65536
```

## セキュリティ推奨事項

1. **JWT_SECRET/JWT_REFRESH_SECRETを絶対に変更**

   ```bash
   # 32バイト以上のランダム値
   openssl rand -hex 32
   ```

2. **AUTH_PASSWORDを強固に**

   ```bash
   # 24文字以上推奨
   openssl rand -base64 24
   ```

3. **Redisを外部公開しない**

   ```bash
   # 127.0.0.1のみバインド（Dockerの場合は -p 127.0.0.1:6379:6379）
   ```

4. **本番環境ではTLS必須**

   - Nginx + Let's Encrypt使用
   - `DEPLOYMENT.md` 参照

## SSHハードニング（推奨）

鍵認証へ切替え、パスワードログインを無効化します。

```bash
# サーバー（root）で実行
sudo bash ./scripts/ssh-setup.sh elysia

# クライアント（WSL/Linux/macOS）で鍵生成
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/elysia_ai -C "elysia-ai"
cat ~/.ssh/elysia_ai.pub  # 出力をサーバーのプロンプトへ貼り付け

# 接続テスト
ssh -i ~/.ssh/elysia_ai elysia@<server-ip>
```

`ssh-setup.sh` は次を設定します:

- `PermitRootLogin prohibit-password`
- `PasswordAuthentication no`
- `PubkeyAuthentication yes`
- `AllowUsers elysia`
- `MaxAuthTries 3`, `ClientAliveInterval 300`

追加対策（任意）:

- `fail2ban` の導入
- `Port 22` 変更と `ufw` で特定IPのみ許可
- `/etc/ssh/sshd_config` で `KbdInteractiveAuthentication no`

## 次のステップ

- **本番デプロイ**: `DEPLOYMENT.md` を参照
- **セキュリティ強化**: `SECURITY.md` を参照
- **API使用方法**: `README.md` のAPI概要セクション
- **音声機能**: `docs/VOICEVOX_SETUP.md` を参照

## サポート

問題が発生した場合:

1. エラーログ確認: `journalctl -u elysia-server -f`
2. Redis状態確認: `redis-cli ping`
3. ポート確認: `lsof -i:3000` / `lsof -i:8000`
4. GitHub Issues: 詳細を添えて報告

---

**推奨**: 本番環境・開発環境ともにLinux/macOS/WSLの使用を強く推奨します。Windows PowerShellは文字エンコーディングの問題が発生する場合があります。
