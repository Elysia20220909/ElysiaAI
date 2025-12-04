# Elysia AI デプロイメントガイド

## 目次
1. [システム要件](#システム要件)
2. [環境変数設定](#環境変数設定)
3. [データベースセットアップ](#データベースセットアップ)
4. [Redisセットアップ](#redisセットアップ)
5. [アプリケーションデプロイ](#アプリケーションデプロイ)
6. [Dockerデプロイ](#dockerデプロイ)
7. [監視と運用](#監視と運用)
8. [トラブルシューティング](#トラブルシューティング)

---

## システム要件

### 最小要件
- **CPU**: 2コア
- **RAM**: 4GB
- **ストレージ**: 20GB
- **OS**: Ubuntu 20.04+ / Windows Server 2019+ / macOS 11+

### 推奨要件
- **CPU**: 4コア以上
- **RAM**: 8GB以上
- **ストレージ**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

### 依存ソフトウェア
- **Bun**: 1.0.0+ (ランタイム)
- **PostgreSQL**: 14+ (データベース)
- **Redis**: 7.0+ (キャッシュ/セッション)
- **Node.js**: 18+ (オプション - 開発環境)
- **Docker**: 24.0+ (コンテナ利用時)
- **Nginx**: 1.20+ (リバースプロキシ)

---

## 環境変数設定

### 必須環境変数

```bash
# サーバー設定
PORT=3000
NODE_ENV=production

# JWT認証
JWT_SECRET=your-production-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-production-refresh-secret-minimum-32-characters

# データベース
DATABASE_URL=postgresql://user:password@localhost:5432/elysia_ai
DB_HOST=localhost
DB_PORT=5432
DB_NAME=elysia_ai
DB_USER=elysia_user
DB_PASSWORD=secure_password_here

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=redis_password_here

# AI/RAG API
RAG_API_URL=http://localhost:8000
MODEL_NAME=llama3.2

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# レート制限
RATE_LIMIT_RPM=60

# 認証情報
AUTH_USERNAME=admin
AUTH_PASSWORD=secure_admin_password
```

### オプション環境変数

```bash
# メール通知
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Webhook
WEBHOOK_SECRET=webhook-secret-key

# ファイルアップロード
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads

# ログ設定
LOG_LEVEL=info
LOG_DIR=./logs

# バックアップ
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30

# 監視
HEALTH_CHECK_INTERVAL=60000  # 60秒
```

### .env ファイル作成

```bash
# 本番環境用 .env ファイル
cp .env.example .env
nano .env  # または vim .env
```

### 環境変数検証

```bash
# 起動前に環境変数を検証
bun run src/lib/env-validator.ts
```

---

## データベースセットアップ

### PostgreSQL インストール (Ubuntu)

```bash
# PostgreSQL 14 インストール
sudo apt update
sudo apt install postgresql-14 postgresql-contrib

# サービス開始
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### データベース作成

```bash
# PostgreSQL ユーザー作成
sudo -u postgres psql
postgres=# CREATE USER elysia_user WITH PASSWORD 'secure_password_here';
postgres=# CREATE DATABASE elysia_ai OWNER elysia_user;
postgres=# GRANT ALL PRIVILEGES ON DATABASE elysia_ai TO elysia_user;
postgres=# \q
```

### スキーマ初期化

```bash
# マイグレーション実行
psql -U elysia_user -d elysia_ai -f sql/schema.sql
```

### テーブル一覧

```sql
-- フィードバック
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    rating INTEGER,
    category TEXT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ナレッジベース
CREATE TABLE knowledge (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    content TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- ユーザー
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- セッション
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    data JSONB
);

-- APIキー
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    key_hash TEXT UNIQUE NOT NULL,
    name TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 監査ログ
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_id TEXT,
    action TEXT,
    resource TEXT,
    resource_id TEXT,
    status_code INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB
);
```

### インデックス作成

```bash
# パフォーマンス最適化のためインデックスを作成
bun run scripts/create-indexes.ts
```

または手動で:

```sql
-- Feedback indexes
CREATE INDEX idx_feedback_rating ON feedback(rating);
CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);

-- Knowledge indexes
CREATE INDEX idx_knowledge_user ON knowledge(user_id);
CREATE INDEX idx_knowledge_tags ON knowledge USING GIN(tags);
CREATE INDEX idx_knowledge_created ON knowledge(created_at DESC);

-- Audit logs indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_composite ON audit_logs(user_id, action, timestamp DESC);
```

### バックアップ設定

```bash
# 日次バックアップスクリプト
#!/bin/bash
BACKUP_DIR=/var/backups/elysia
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
pg_dump -U elysia_user elysia_ai | gzip > $BACKUP_DIR/elysia_ai_$DATE.sql.gz

# 30日以上前のバックアップを削除
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

cron設定:
```bash
crontab -e
# 毎日午前3時にバックアップ
0 3 * * * /path/to/backup-script.sh
```

---

## Redisセットアップ

### Redis インストール (Ubuntu)

```bash
# Redis 7.0 インストール
sudo apt install redis-server

# 設定ファイル編集
sudo nano /etc/redis/redis.conf
```

### Redis設定

```conf
# /etc/redis/redis.conf

# パスワード設定
requirepass your_redis_password_here

# 永続化設定
appendonly yes
appendfsync everysec

# メモリ制限
maxmemory 2gb
maxmemory-policy allkeys-lru

# ネットワーク
bind 127.0.0.1
port 6379

# セキュリティ
protected-mode yes
```

### Redis起動

```bash
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# 接続テスト
redis-cli -a your_redis_password_here ping
# => PONG
```

### Redisクラスタ (オプション)

本番環境では高可用性のためRedisクラスタを推奨:

```bash
# Redis Sentinel または Redis Cluster
# 詳細は Redis 公式ドキュメント参照
```

---

## アプリケーションデプロイ

### 1. ソースコード取得

```bash
git clone https://github.com/yourusername/elysia-ai.git
cd elysia-ai
```

### 2. 依存関係インストール

```bash
# Bun インストール
curl -fsSL https://bun.sh/install | bash

# パッケージインストール
bun install
```

### 3. ビルド

```bash
# 本番用ビルド
bun run build

# 出力確認
ls -la dist/
```

### 4. 環境変数設定

```bash
cp .env.example .env.production
nano .env.production
# 上記の環境変数を設定
```

### 5. データベース初期化

```bash
# スキーマ作成
psql -U elysia_user -d elysia_ai -f sql/schema.sql

# インデックス作成
bun run scripts/create-indexes.ts
```

### 6. アプリケーション起動

```bash
# フォアグラウンド実行
NODE_ENV=production bun run src/index.ts

# バックグラウンド実行 (PM2使用)
npm install -g pm2
pm2 start src/index.ts --interpreter bun --name elysia-ai
pm2 save
pm2 startup
```

### PM2 設定ファイル

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'elysia-ai',
    script: 'src/index.ts',
    interpreter: 'bun',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

起動:
```bash
pm2 start ecosystem.config.js
```

---

## Dockerデプロイ

### 1. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://elysia_user:password@postgres:5432/elysia_ai
      REDIS_URL: redis://:redis_password@redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: elysia_user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: elysia_ai
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 2. Nginx設定

```nginx
# nginx.conf
upstream elysia_backend {
    server app:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # HTTP to HTTPS redirect
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://elysia_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://elysia_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

### 3. デプロイ実行

```bash
# ビルド&起動
docker-compose up -d

# ログ確認
docker-compose logs -f app

# 停止
docker-compose down

# 再起動
docker-compose restart app
```

---

## 監視と運用

### ヘルスチェック

```bash
# アプリケーションヘルスチェック
curl http://localhost:3000/health

# データベース接続確認
curl http://localhost:3000/health/db

# Redis接続確認
curl http://localhost:3000/health/redis
```

### メトリクス収集

```bash
# Prometheusメトリクス
curl http://localhost:3000/metrics
```

### ログ管理

```bash
# ログローテーション設定
# /etc/logrotate.d/elysia-ai
/var/log/elysia-ai/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 監視ツール推奨

- **PM2**: プロセス監視
- **Prometheus + Grafana**: メトリクス可視化
- **ELK Stack**: ログ集約・分析
- **Uptime Kuma**: アップタイム監視

---

## トラブルシューティング

### アプリケーションが起動しない

```bash
# ログ確認
pm2 logs elysia-ai

# 環境変数確認
pm2 env 0

# ポート使用状況確認
sudo netstat -tulpn | grep 3000
```

### データベース接続エラー

```bash
# PostgreSQL起動確認
sudo systemctl status postgresql

# 接続テスト
psql -U elysia_user -d elysia_ai -h localhost

# 認証設定確認
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

### Redis接続エラー

```bash
# Redis起動確認
sudo systemctl status redis-server

# 接続テスト
redis-cli -a your_password ping

# ログ確認
sudo tail -f /var/log/redis/redis-server.log
```

### WebSocket接続失敗

1. Nginx設定を確認
2. ファイアウォール設定を確認
3. プロキシタイムアウト設定を確認

### パフォーマンス問題

```bash
# クエリ統計確認
curl http://localhost:3000/admin/query-stats

# 遅いクエリ確認
curl http://localhost:3000/admin/slow-queries

# Redis統計確認
redis-cli INFO stats
```

---

## セキュリティチェックリスト

- [ ] JWT_SECRET を強力なものに変更
- [ ] データベースパスワードを強力なものに変更
- [ ] Redisパスワードを設定
- [ ] HTTPS を有効化 (Let's Encrypt推奨)
- [ ] ファイアウォールを設定 (UFW, iptables)
- [ ] SSH鍵認証を使用
- [ ] 不要なポートを閉じる
- [ ] セキュリティアップデートを定期的に実行
- [ ] 監査ログを定期的にレビュー
- [ ] バックアップを定期的にテスト

---

## 本番環境チェックリスト

- [ ] 環境変数をすべて設定
- [ ] データベースを初期化
- [ ] Redisを設定
- [ ] インデックスを作成
- [ ] Nginx/リバースプロキシを設定
- [ ] SSL証明書をインストール
- [ ] ファイアウォールを設定
- [ ] PM2/Dockerで起動
- [ ] ヘルスチェックを確認
- [ ] ログローテーションを設定
- [ ] バックアップを設定
- [ ] 監視ツールを設定
- [ ] ドキュメントを更新

---

## サポート

問題が発生した場合:
1. ログを確認 (`/logs` または `pm2 logs`)
2. ヘルスチェックを実行
3. GitHub Issuesで報告
4. Discordコミュニティで質問

---

**デプロイメント完了!** 🎉
