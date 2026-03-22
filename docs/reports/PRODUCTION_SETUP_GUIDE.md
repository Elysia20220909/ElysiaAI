# Elysia AI - 本番環境設定チェックリスト

## ✅ 完了済み設定

### 1. 基本設定

- [x] サーバーポート設定 (PORT=3000)
- [x] データベース設定 (SQLite: dev.db)
- [x] Redis接続設定 (TLS対応)
- [x] JWT認証設定済み

### 2. セキュリティ

- [x] Rate limiting設定 (60 RPM)
- [x] JWT_SECRET設定済み
- [x] Input sanitization実装
- [x] CORS設定済み
- [x] セキュリティヘッダー設定

### 3. 機能実装

- [x] 7モードLLM対応
- [x] Web検索統合 (Wikipedia、天気、ニュース)
- [x] OpenAI統合実装
- [x] カジュアルチャット機能
- [x] Health monitoring
- [x] Job queue (BullMQ)

## ⚠️ 本番環境で必要な設定

### 1. 環境変数 (.env.production)

```bash
# 本番環境フラグ
NODE_ENV=production

# セキュリティ強化
JWT_SECRET=<64文字以上のランダム文字列に変更>
JWT_REFRESH_SECRET=<64文字以上のランダム文字列に変更>

# データベース (本番用PostgreSQL推奨)
DATABASE_URL=postgresql://user:password@localhost:5432/elysia_ai

# Redis (本番用設定)
REDIS_URL=<本番RedisのURL>
REDIS_PASSWORD=<Redisパスワード>

# CORS (本番ドメインに変更)
ALLOWED_ORIGINS=https://yourdomain.com

# OpenAI (必要な場合)
OPENAI_API_KEY=<本番用APIキー>

# メール通知
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<メールアドレス>
SMTP_PASSWORD=<アプリパスワード>
```

### 2. Nginx リバースプロキシ設定

**推奨構成**: Nginx → Elysia (Port 3000)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # SSL設定 (Let's Encrypt推奨)
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Elysiaへプロキシ
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket対応
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 3. Systemd サービス設定

**ファイル**: `/etc/systemd/system/elysia-ai.service`

```ini
[Unit]
Description=Elysia AI Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=elysia
WorkingDirectory=/opt/elysia-ai
Environment="NODE_ENV=production"
EnvironmentFile=/opt/elysia-ai/.env.production
ExecStart=/usr/local/bin/bun run src/index.ts
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**コマンド**:

```bash
sudo systemctl daemon-reload
sudo systemctl enable elysia-ai
sudo systemctl start elysia-ai
sudo systemctl status elysia-ai
```

### 4. Docker Compose構成

**ファイル**: `docker-compose.production.yml`

```yaml
version: "3.8"

services:
  elysia-ai:
    build:
      context: .
      dockerfile: config/docker/Dockerfile.production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://postgres:password@db:5432/elysia_ai
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: always
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=elysia_ai
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password
    volumes:
      - redis_data:/data
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - elysia-ai
    restart: always

volumes:
  postgres_data:
  redis_data:
```

### 5. 監視・ログ

#### Prometheus メトリクス

- エンドポイント: `http://localhost:3000/metrics`
- 既に実装済み

#### ヘルスチェック

- `/ping` - シンプルチェック
- `/health` - 詳細チェック (Redis, Ollama, Database)

#### ログローテーション

既存の自動クリーンアップ機能:

- 最大ファイルサイズ: 500MB
- 保持期間: 30日

### 6. バックアップ戦略

#### データベース

```bash
# 毎日3:00 AMに自動実行（既存のcron設定）
# 手動バックアップ:
bunx prisma db pull
```

#### アップロードファイル

```bash
# 定期バックアップ
rsync -avz ./uploads/ /backup/uploads/$(date +%Y%m%d)/
```

## 📋 デプロイ手順

### ステップ1: サーバー準備

```bash
# 依存パッケージインストール
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx postgresql redis-server

# Bunインストール
curl -fsSL https://bun.sh/install | bash
```

### ステップ2: アプリケーション配置

```bash
# リポジトリクローン
git clone https://github.com/chloeamethyst/ElysiaAI.git /opt/elysia-ai
cd /opt/elysia-ai

# 依存パッケージインストール
bun install

# 本番用環境変数設定
cp .env.example .env.production
nano .env.production  # 本番用に編集
```

### ステップ3: データベースセットアップ

```bash
# Prisma設定
bunx prisma generate
bunx prisma db push --config config/internal/prisma.config.ts
```

### ステップ4: ビルドとテスト

```bash
# ビルド
bun run build

# テスト起動
NODE_ENV=production bun run src/index.ts
```

### ステップ5: サービス登録

```bash
# Systemdサービス登録
sudo cp elysia-ai.service /etc/systemd/system/
sudo systemctl enable elysia-ai
sudo systemctl start elysia-ai
```

### ステップ6: Nginx設定

```bash
# Nginx設定
sudo cp nginx.conf.example /etc/nginx/sites-available/elysia-ai
sudo ln -s /etc/nginx/sites-available/elysia-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### ステップ7: SSL証明書 (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 🔒 セキュリティチェックリスト

- [ ] JWT_SECRET を64文字以上のランダム文字列に変更
- [ ] データベースパスワードを強力なものに変更
- [ ] Redisにパスワード設定
- [ ] ファイアウォール設定 (UFW/iptables)
- [ ] SSH鍵認証のみ許可
- [ ] 定期的なセキュリティアップデート
- [ ] バックアップの定期実行確認
- [ ] ログ監視の設定
- [ ] SSL/TLS証明書の自動更新設定

## 📊 パフォーマンス最適化

### 推奨設定

1. **Redis**: キャッシュ戦略の最適化
2. **Database**: インデックス最適化、コネクションプーリング
3. **CDN**: 静的ファイルの配信
4. **Gzip圧縮**: Nginx設定
5. **PM2/Systemd**: プロセス管理

### 監視項目

- CPU使用率
- メモリ使用率
- ディスク容量
- API応答時間
- エラー率

## 📞 トラブルシューティング

### サーバーが起動しない

1. ログ確認: `sudo journalctl -u elysia-ai -f`
2. ポート競合確認: `sudo lsof -i :3000`
3. 環境変数確認: `.env.production`の内容

### データベース接続エラー

1. PostgreSQL稼働確認: `sudo systemctl status postgresql`
2. 接続情報確認: DATABASE_URL
3. ファイアウォール確認

### パフォーマンス問題

1. `/metrics` でメトリクス確認
2. `/health` で各サービス状態確認
3. ログファイルの容量確認

---

**作成日**: 2025年12月5日
**最終更新**: 2025年12月5日
