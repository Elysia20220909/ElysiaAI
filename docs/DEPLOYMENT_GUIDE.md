# Elysia AI チE�EロイメントガイチE
## 目次

1. [シスチE��要件](#シスチE��要件)
2. [環墁E��数設定](#環墁E��数設宁E
3. [チE�Eタベ�EスセチE��アチE�E](#チE�Eタベ�EスセチE��アチE�E)
4. [RedisセチE��アチE�E](#redisセチE��アチE�E)
5. [アプリケーションチE�Eロイ](#アプリケーションチE�Eロイ)
6. [DockerチE�Eロイ](#dockerチE�Eロイ)
7. [監視と運用](#監視と運用)
8. [トラブルシューチE��ング](#トラブルシューチE��ング)

---

## シスチE��要件

### 最小要件

- **CPU**: 2コア
- **RAM**: 4GB
- **ストレージ**: 20GB
- **OS**: Ubuntu 20.04+ / Windows Server 2019+ / macOS 11+

### 推奨要件

- **CPU**: 4コア以丁E- **RAM**: 8GB以丁E- **ストレージ**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

### 依存ソフトウェア

- **Bun**: 1.0.0+ (ランタイム)
- **PostgreSQL**: 14+ (チE�Eタベ�Eス)
- **Redis**: 7.0+ (キャチE��ュ/セチE��ョン)
- **Node.js**: 18+ (オプション - 開発環墁E
- **Docker**: 24.0+ (コンチE��利用晁E
- **Nginx**: 1.20+ (リバ�Eスプロキシ)

---

## 環墁E��数設宁E
### 忁E��環墁E��数

```bash
# サーバ�E設宁EPORT=3000
NODE_ENV=production

# JWT認証
JWT_SECRET=your-production-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-production-refresh-secret-minimum-32-characters

# チE�Eタベ�Eス
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

# レート制陁ERATE_LIMIT_RPM=60

# 認証惁E��
AUTH_USERNAME=admin
AUTH_PASSWORD=secure_admin_password
```

### オプション環墁E��数

```bash
# メール通知
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Webhook
WEBHOOK_SECRET=webhook-secret-key

# ファイルアチE�EローチEMAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads

# ログ設宁ELOG_LEVEL=info
LOG_DIR=./logs

# バックアチE�E
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30

# 監要EHEALTH_CHECK_INTERVAL=60000  # 60私E```

### .env ファイル作�E

```bash
# 本番環墁E�� .env ファイル
cp .env.example .env
nano .env  # また�E vim .env
```

### 環墁E��数検証

```bash
# 起動前に環墁E��数を検証
bun run src/lib/env-validator.ts
```

---

## チE�Eタベ�EスセチE��アチE�E

### PostgreSQL インスト�Eル (Ubuntu)

```bash
# PostgreSQL 14 インスト�Eル
sudo apt update
sudo apt install postgresql-14 postgresql-contrib

# サービス開姁Esudo systemctl start postgresql
sudo systemctl enable postgresql
```

### チE�Eタベ�Eス作�E

```bash
# PostgreSQL ユーザー作�E
sudo -u postgres psql
postgres=# CREATE USER elysia_user WITH PASSWORD 'secure_password_here';
postgres=# CREATE DATABASE elysia_ai OWNER elysia_user;
postgres=# GRANT ALL PRIVILEGES ON DATABASE elysia_ai TO elysia_user;
postgres=# \q
```

### スキーマ�E期化

```bash
# マイグレーション実衁Epsql -U elysia_user -d elysia_ai -f sql/schema.sql
```

### チE�Eブル一覧

```sql
-- フィードバチE��
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    rating INTEGER,
    category TEXT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ナレチE��ベ�Eス
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

-- セチE��ョン
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

### インチE��クス作�E

```bash
# パフォーマンス最適化�EためインチE��クスを作�E
bun run scripts/create-indexes.ts
```

また�E手動で:

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

### バックアチE�E設宁E
```bash
# 日次バックアチE�Eスクリプト
#!/bin/bash
BACKUP_DIR=/var/backups/elysia
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
pg_dump -U elysia_user elysia_ai | gzip > $BACKUP_DIR/elysia_ai_$DATE.sql.gz

# 30日以上前のバックアチE�Eを削除
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

cron設宁E

```bash
crontab -e
# 毎日午前3時にバックアチE�E
0 3 * * * /path/to/backup-script.sh
```

---

## RedisセチE��アチE�E

### Redis インスト�Eル (Ubuntu)

```bash
# Redis 7.0 インスト�Eル
sudo apt install redis-server

# 設定ファイル編雁Esudo nano /etc/redis/redis.conf
```

### Redis設宁E
```conf
# /etc/redis/redis.conf

# パスワード設宁Erequirepass your_redis_password_here

# 永続化設宁Eappendonly yes
appendfsync everysec

# メモリ制陁Emaxmemory 2gb
maxmemory-policy allkeys-lru

# ネットワーク
bind 127.0.0.1
port 6379

# セキュリチE��
protected-mode yes
```

### Redis起勁E
```bash
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# 接続テスチEredis-cli -a your_redis_password_here ping
# => PONG
```

### Redisクラスタ (オプション)

本番環墁E��は高可用性のためRedisクラスタを推奨:

```bash
# Redis Sentinel また�E Redis Cluster
# 詳細は Redis 公式ドキュメント参照
```

---

## アプリケーションチE�Eロイ

### 1. ソースコード取征E
```bash
git clone https://github.com/yourusername/elysia-ai.git
cd elysia-ai
```

### 2. 依存関係インスト�Eル

```bash
# Bun インスト�Eル
curl -fsSL https://bun.sh/install | bash

# パッケージインスト�Eル
bun install
```

### 3. ビルチE
```bash
# 本番用ビルチEbun run build

# 出力確誁Els -la dist/
```

### 4. 環墁E��数設宁E
```bash
cp .env.example .env.production
nano .env.production
# 上記�E環墁E��数を設宁E```

### 5. チE�Eタベ�Eス初期匁E
```bash
# スキーマ作�E
psql -U elysia_user -d elysia_ai -f sql/schema.sql

# インチE��クス作�E
bun run scripts/create-indexes.ts
```

### 6. アプリケーション起勁E
```bash
# フォアグラウンド実衁ENODE_ENV=production bun run src/index.ts

# バックグラウンド実衁E(PM2使用)
npm install -g pm2
pm2 start src/index.ts --interpreter bun --name elysia-ai
pm2 save
pm2 startup
```

### PM2 設定ファイル

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "elysia-ai",
      script: "src/index.ts",
      interpreter: "bun",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
    },
  ],
};
```

起勁E

```bash
pm2 start ecosystem.config.js
```

---

## DockerチE�Eロイ

### 1. Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

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

  redis_data:

---

## 🏗�E�ETauri チE��クトップアプリのビルチE
ElysiaAI のチE��クトップクライアントをビルドする手頁E��す、E
### 1. 準備
- **Rust**: [公式�E Rust インスト�Eル手頁E(https://www.rust-lang.org/tools/install)に従ってください、E- **WebView2**: Windows の場合�E WebView2 ランタイムが忁E��です、E
### 2. ビルド実衁E```bash
# クライアント�EビルチE(src-tauri 下で実衁E
cd src-tauri
cargo build --release

# また�E Bun を使用
bun run build:desktop
```
ビルドされたバイナリは `src-tauri/target/release/` に生�Eされます、E
---

## 🐳 Docker Compose による一括起勁E
Docker Compose を使用して、すべての依存ツール�E�Eilvus, VOICEVOX等）を含むスタチE��を一括で起動する方法です、E
```bash
# プロジェクトルートで実衁Edocker-compose up -d
```

`docker-compose.yml` には以下�Eサービスが含まれてぁE��す！E- **Elysia Server**: Bun/ElysiaJS バックエンチE- **AI Kernel**: FastAPI/Python カーネル
- **Milvus**: ベクトルチE�Eタベ�Eス
- **Redis**: レート制限�EキャチE��ュ
- **VOICEVOX**: 音声合�Eエンジン�E�オプション�E�E
---

## 🦀 Rust (Shield Agent) のコンパイル

セキュリチE��防壁として機�Eする Shield Agent のビルド手頁E��す、E
```bash
cd packages/shield
cargo build --release
```
生�EされたバイナリめE`bin/` チE��レクトリに配置することで、OSが起動時に自動的にロードします、E```

### 2. Nginx設宁E
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

### 3. チE�Eロイ実衁E
```bash
# ビルチE起勁Edocker-compose up -d

# ログ確誁Edocker-compose logs -f app

# 停止
docker-compose down

# 再起勁Edocker-compose restart app
```

---

## 監視と運用

### ヘルスチェチE��

```bash
# アプリケーションヘルスチェチE��
curl http://localhost:3000/health

# チE�Eタベ�Eス接続確誁Ecurl http://localhost:3000/health/db

# Redis接続確誁Ecurl http://localhost:3000/health/redis
```

### メトリクス収集

```bash
# Prometheusメトリクス
curl http://localhost:3000/metrics
```

### ログ管琁E
```bash
# ログローチE�Eション設宁E# /etc/logrotate.d/elysia-ai
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

- **PM2**: プロセス監要E- **Prometheus + Grafana**: メトリクス可視化
- **ELK Stack**: ログ雁E��E�E刁E��
- **Uptime Kuma**: アチE�Eタイム監要E
---

## トラブルシューチE��ング

### アプリケーションが起動しなぁE
```bash
# ログ確誁Epm2 logs elysia-ai

# 環墁E��数確誁Epm2 env 0

# ポ�Eト使用状況確誁Esudo netstat -tulpn | grep 3000
```

### チE�Eタベ�Eス接続エラー

```bash
# PostgreSQL起動確誁Esudo systemctl status postgresql

# 接続テスチEpsql -U elysia_user -d elysia_ai -h localhost

# 認証設定確誁Esudo nano /etc/postgresql/14/main/pg_hba.conf
```

### Redis接続エラー

```bash
# Redis起動確誁Esudo systemctl status redis-server

# 接続テスチEredis-cli -a your_password ping

# ログ確誁Esudo tail -f /var/log/redis/redis-server.log
```

### WebSocket接続失敁E
1. Nginx設定を確誁E2. ファイアウォール設定を確誁E3. プロキシタイムアウト設定を確誁E
### パフォーマンス問顁E
```bash
# クエリ統計確誁Ecurl http://localhost:3000/admin/query-stats

# 遁E��クエリ確誁Ecurl http://localhost:3000/admin/slow-queries

# Redis統計確誁Eredis-cli INFO stats
```

---

## セキュリチE��チェチE��リスチE
- [ ] JWT_SECRET を強力なも�Eに変更
- [ ] チE�Eタベ�Eスパスワードを強力なも�Eに変更
- [ ] Redisパスワードを設宁E- [ ] HTTPS を有効匁E(Let's Encrypt推奨)
- [ ] ファイアウォールを設宁E(UFW, iptables)
- [ ] SSH鍵認証を使用
- [ ] 不要なポ�Eトを閉じめE- [ ] セキュリチE��アチE�EチE�Eトを定期皁E��実衁E- [ ] 監査ログを定期皁E��レビュー
- [ ] バックアチE�Eを定期皁E��チE��チE
---

## 本番環墁E��ェチE��リスチE
- [ ] 環墁E��数をすべて設宁E- [ ] チE�Eタベ�Eスを�E期化
- [ ] Redisを設宁E- [ ] インチE��クスを作�E
- [ ] Nginx/リバ�Eスプロキシを設宁E- [ ] SSL証明書をインスト�Eル
- [ ] ファイアウォールを設宁E- [ ] PM2/Dockerで起勁E- [ ] ヘルスチェチE��を確誁E- [ ] ログローチE�Eションを設宁E- [ ] バックアチE�Eを設宁E- [ ] 監視ツールを設宁E- [ ] ドキュメントを更新

---

## サポ�EチE
問題が発生した場吁E

1. ログを確誁E(`/logs` また�E `pm2 logs`)
2. ヘルスチェチE��を実衁E3. GitHub Issuesで報呁E4. Discordコミュニティで質啁E
---

**チE�Eロイメント完亁E** 🎉
