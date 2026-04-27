# Elysia AI 繝・・繝ｭ繧､繝｡繝ｳ繝医ぎ繧､繝・
## 逶ｮ谺｡

1. [繧ｷ繧ｹ繝・Β隕∽ｻｶ](#繧ｷ繧ｹ繝・Β隕∽ｻｶ)
2. [迺ｰ蠅・､画焚險ｭ螳咯(#迺ｰ蠅・､画焚險ｭ螳・
3. [繝・・繧ｿ繝吶・繧ｹ繧ｻ繝・ヨ繧｢繝・・](#繝・・繧ｿ繝吶・繧ｹ繧ｻ繝・ヨ繧｢繝・・)
4. [Redis繧ｻ繝・ヨ繧｢繝・・](#redis繧ｻ繝・ヨ繧｢繝・・)
5. [繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繝・・繝ｭ繧､](#繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繝・・繝ｭ繧､)
6. [Docker繝・・繝ｭ繧､](#docker繝・・繝ｭ繧､)
7. [逶｣隕悶→驕狗畑](#逶｣隕悶→驕狗畑)
8. [繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ](#繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ)

---

## 繧ｷ繧ｹ繝・Β隕∽ｻｶ

### 譛�蟆剰ｦ∽ｻｶ

- **CPU**: 2繧ｳ繧｢
- **RAM**: 4GB
- **繧ｹ繝医Ξ繝ｼ繧ｸ**: 20GB
- **OS**: Ubuntu 20.04+ / Windows Server 2019+ / macOS 11+

### 謗ｨ螂ｨ隕∽ｻｶ

- **CPU**: 4繧ｳ繧｢莉･荳・- **RAM**: 8GB莉･荳・- **繧ｹ繝医Ξ繝ｼ繧ｸ**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

### 萓晏ｭ倥た繝輔ヨ繧ｦ繧ｧ繧｢

- **Bun**: 1.0.0+ (繝ｩ繝ｳ繧ｿ繧､繝�)
- **PostgreSQL**: 14+ (繝・・繧ｿ繝吶・繧ｹ)
- **Redis**: 7.0+ (繧ｭ繝｣繝・す繝･/繧ｻ繝・す繝ｧ繝ｳ)
- **Node.js**: 18+ (繧ｪ繝励す繝ｧ繝ｳ - 髢狗匱迺ｰ蠅・
- **Docker**: 24.0+ (繧ｳ繝ｳ繝・リ蛻ｩ逕ｨ譎・
- **Nginx**: 1.20+ (繝ｪ繝舌・繧ｹ繝励Ο繧ｭ繧ｷ)

---

## 迺ｰ蠅・､画焚險ｭ螳・
### 蠢・�育腸蠅・､画焚

```bash
# 繧ｵ繝ｼ繝舌・險ｭ螳・PORT=3000
NODE_ENV=production

# JWT隱崎ｨｼ
JWT_SECRET=your-production-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-production-refresh-secret-minimum-32-characters

# 繝・・繧ｿ繝吶・繧ｹ
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

# 繝ｬ繝ｼ繝亥宛髯・RATE_LIMIT_RPM=60

# 隱崎ｨｼ諠・�ｱ
AUTH_USERNAME=admin
AUTH_PASSWORD=secure_admin_password
```

### 繧ｪ繝励す繝ｧ繝ｳ迺ｰ蠅・､画焚

```bash
# 繝｡繝ｼ繝ｫ騾夂衍
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Webhook
WEBHOOK_SECRET=webhook-secret-key

# 繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝・MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads

# 繝ｭ繧ｰ險ｭ螳・LOG_LEVEL=info
LOG_DIR=./logs

# 繝舌ャ繧ｯ繧｢繝・・
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30

# 逶｣隕・HEALTH_CHECK_INTERVAL=60000  # 60遘・```

### .env 繝輔ぃ繧､繝ｫ菴懈・

```bash
# 譛ｬ逡ｪ迺ｰ蠅・畑 .env 繝輔ぃ繧､繝ｫ
cp .env.example .env
nano .env  # 縺ｾ縺溘・ vim .env
```

### 迺ｰ蠅・､画焚讀懆ｨｼ

```bash
# 襍ｷ蜍募燕縺ｫ迺ｰ蠅・､画焚繧呈､懆ｨｼ
bun run src/lib/env-validator.ts
```

---

## 繝・・繧ｿ繝吶・繧ｹ繧ｻ繝・ヨ繧｢繝・・

### PostgreSQL 繧､繝ｳ繧ｹ繝医・繝ｫ (Ubuntu)

```bash
# PostgreSQL 14 繧､繝ｳ繧ｹ繝医・繝ｫ
sudo apt update
sudo apt install postgresql-14 postgresql-contrib

# 繧ｵ繝ｼ繝薙せ髢句ｧ・sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 繝・・繧ｿ繝吶・繧ｹ菴懈・

```bash
# PostgreSQL 繝ｦ繝ｼ繧ｶ繝ｼ菴懈・
sudo -u postgres psql
postgres=# CREATE USER elysia_user WITH PASSWORD 'secure_password_here';
postgres=# CREATE DATABASE elysia_ai OWNER elysia_user;
postgres=# GRANT ALL PRIVILEGES ON DATABASE elysia_ai TO elysia_user;
postgres=# \q
```

### 繧ｹ繧ｭ繝ｼ繝槫・譛溷喧

```bash
# 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ螳溯｡・psql -U elysia_user -d elysia_ai -f sql/schema.sql
```

### 繝・・繝悶Ν荳�隕ｧ

```sql
-- 繝輔ぅ繝ｼ繝峨ヰ繝・け
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    rating INTEGER,
    category TEXT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 繝翫Ξ繝・ず繝吶・繧ｹ
CREATE TABLE knowledge (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    content TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- 繝ｦ繝ｼ繧ｶ繝ｼ
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 繧ｻ繝・す繝ｧ繝ｳ
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    data JSONB
);

-- API繧ｭ繝ｼ
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    key_hash TEXT UNIQUE NOT NULL,
    name TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 逶｣譟ｻ繝ｭ繧ｰ
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

### 繧､繝ｳ繝・ャ繧ｯ繧ｹ菴懈・

```bash
# 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ譛�驕ｩ蛹悶・縺溘ａ繧､繝ｳ繝・ャ繧ｯ繧ｹ繧剃ｽ懈・
bun run scripts/create-indexes.ts
```

縺ｾ縺溘・謇句虚縺ｧ:

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

### 繝舌ャ繧ｯ繧｢繝・・險ｭ螳・
```bash
# 譌･谺｡繝舌ャ繧ｯ繧｢繝・・繧ｹ繧ｯ繝ｪ繝励ヨ
#!/bin/bash
BACKUP_DIR=/var/backups/elysia
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
pg_dump -U elysia_user elysia_ai | gzip > $BACKUP_DIR/elysia_ai_$DATE.sql.gz

# 30譌･莉･荳雁燕縺ｮ繝舌ャ繧ｯ繧｢繝・・繧貞炎髯､
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

cron險ｭ螳・

```bash
crontab -e
# 豈取律蜊亥燕3譎ゅ↓繝舌ャ繧ｯ繧｢繝・・
0 3 * * * /path/to/backup-script.sh
```

---

## Redis繧ｻ繝・ヨ繧｢繝・・

### Redis 繧､繝ｳ繧ｹ繝医・繝ｫ (Ubuntu)

```bash
# Redis 7.0 繧､繝ｳ繧ｹ繝医・繝ｫ
sudo apt install redis-server

# 險ｭ螳壹ヵ繧｡繧､繝ｫ邱ｨ髮・sudo nano /etc/redis/redis.conf
```

### Redis險ｭ螳・
```conf
# /etc/redis/redis.conf

# 繝代せ繝ｯ繝ｼ繝芽ｨｭ螳・requirepass your_redis_password_here

# 豌ｸ邯壼喧險ｭ螳・appendonly yes
appendfsync everysec

# 繝｡繝｢繝ｪ蛻ｶ髯・maxmemory 2gb
maxmemory-policy allkeys-lru

# 繝阪ャ繝医Ρ繝ｼ繧ｯ
bind 127.0.0.1
port 6379

# 繧ｻ繧ｭ繝･繝ｪ繝・ぅ
protected-mode yes
```

### Redis襍ｷ蜍・
```bash
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# 謗･邯壹ユ繧ｹ繝・redis-cli -a your_redis_password_here ping
# => PONG
```

### Redis繧ｯ繝ｩ繧ｹ繧ｿ (繧ｪ繝励す繝ｧ繝ｳ)

譛ｬ逡ｪ迺ｰ蠅・〒縺ｯ鬮伜庄逕ｨ諤ｧ縺ｮ縺溘ａRedis繧ｯ繝ｩ繧ｹ繧ｿ繧呈耳螂ｨ:

```bash
# Redis Sentinel 縺ｾ縺溘・ Redis Cluster
# 隧ｳ邏ｰ縺ｯ Redis 蜈ｬ蠑上ラ繧ｭ繝･繝｡繝ｳ繝亥盾辣ｧ
```

---

## 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繝・・繝ｭ繧､

### 1. 繧ｽ繝ｼ繧ｹ繧ｳ繝ｼ繝牙叙蠕・
```bash
git clone https://github.com/yourusername/elysia-ai.git
cd elysia-ai
```

### 2. 萓晏ｭ倬未菫ゅう繝ｳ繧ｹ繝医・繝ｫ

```bash
# Bun 繧､繝ｳ繧ｹ繝医・繝ｫ
curl -fsSL https://bun.sh/install | bash

# 繝代ャ繧ｱ繝ｼ繧ｸ繧､繝ｳ繧ｹ繝医・繝ｫ
bun install
```

### 3. 繝薙Ν繝・
```bash
# 譛ｬ逡ｪ逕ｨ繝薙Ν繝・bun run build

# 蜃ｺ蜉帷｢ｺ隱・ls -la dist/
```

### 4. 迺ｰ蠅・､画焚險ｭ螳・
```bash
cp .env.example .env.production
nano .env.production
# 荳願ｨ倥・迺ｰ蠅・､画焚繧定ｨｭ螳・```

### 5. 繝・・繧ｿ繝吶・繧ｹ蛻晄悄蛹・
```bash
# 繧ｹ繧ｭ繝ｼ繝樔ｽ懈・
psql -U elysia_user -d elysia_ai -f sql/schema.sql

# 繧､繝ｳ繝・ャ繧ｯ繧ｹ菴懈・
bun run scripts/create-indexes.ts
```

### 6. 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ襍ｷ蜍・
```bash
# 繝輔か繧｢繧ｰ繝ｩ繧ｦ繝ｳ繝牙ｮ溯｡・NODE_ENV=production bun run src/index.ts

# 繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝牙ｮ溯｡・(PM2菴ｿ逕ｨ)
npm install -g pm2
pm2 start src/index.ts --interpreter bun --name elysia-ai
pm2 save
pm2 startup
```

### PM2 險ｭ螳壹ヵ繧｡繧､繝ｫ

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

襍ｷ蜍・

```bash
pm2 start ecosystem.config.js
```

---

## Docker繝・・繝ｭ繧､

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

## 女・・Tauri 繝・せ繧ｯ繝医ャ繝励い繝励Μ縺ｮ繝薙Ν繝・
ElysiaAI 縺ｮ繝・せ繧ｯ繝医ャ繝励け繝ｩ繧､繧｢繝ｳ繝医ｒ繝薙Ν繝峨☆繧区焔鬆・〒縺吶�・
### 1. 貅門ｙ
- **Rust**: [蜈ｬ蠑上・ Rust 繧､繝ｳ繧ｹ繝医・繝ｫ謇矩�・(https://www.rust-lang.org/tools/install)縺ｫ蠕薙▲縺ｦ縺上□縺輔＞縲・- **WebView2**: Windows 縺ｮ蝣ｴ蜷医・ WebView2 繝ｩ繝ｳ繧ｿ繧､繝�縺悟ｿ・ｦ√〒縺吶�・
### 2. 繝薙Ν繝牙ｮ溯｡・```bash
# 繧ｯ繝ｩ繧､繧｢繝ｳ繝医・繝薙Ν繝・(src-tauri 荳九〒螳溯｡・
cd src-tauri
cargo build --release

# 縺ｾ縺溘・ Bun 繧剃ｽｿ逕ｨ
bun run build:desktop
```
繝薙Ν繝峨＆繧後◆繝舌う繝翫Μ縺ｯ `src-tauri/target/release/` 縺ｫ逕滓・縺輔ｌ縺ｾ縺吶�・
---

## 正 Docker Compose 縺ｫ繧医ｋ荳�諡ｬ襍ｷ蜍・
Docker Compose 繧剃ｽｿ逕ｨ縺励※縲√☆縺ｹ縺ｦ縺ｮ萓晏ｭ倥ヤ繝ｼ繝ｫ・・ilvus, VOICEVOX遲会ｼ峨ｒ蜷ｫ繧�繧ｹ繧ｿ繝・け繧剃ｸ�諡ｬ縺ｧ襍ｷ蜍輔☆繧区婿豕輔〒縺吶�・
```bash
# 繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝医〒螳溯｡・docker-compose up -d
```

`docker-compose.yml` 縺ｫ縺ｯ莉･荳九・繧ｵ繝ｼ繝薙せ縺悟性縺ｾ繧後※縺・∪縺呻ｼ・- **Elysia Server**: Bun/ElysiaJS 繝舌ャ繧ｯ繧ｨ繝ｳ繝・- **AI Kernel**: FastAPI/Python 繧ｫ繝ｼ繝阪Ν
- **Milvus**: 繝吶け繝医Ν繝・・繧ｿ繝吶・繧ｹ
- **Redis**: 繝ｬ繝ｼ繝亥宛髯舌・繧ｭ繝｣繝・す繝･
- **VOICEVOX**: 髻ｳ螢ｰ蜷域・繧ｨ繝ｳ繧ｸ繝ｳ・医が繝励す繝ｧ繝ｳ・・
---

## ｦ� Rust (Shield Agent) 縺ｮ繧ｳ繝ｳ繝代う繝ｫ

繧ｻ繧ｭ繝･繝ｪ繝・ぅ髦ｲ螢√→縺励※讖溯・縺吶ｋ Shield Agent 縺ｮ繝薙Ν繝画焔鬆・〒縺吶�・
```bash
cd packages/shield
cargo build --release
```
逕滓・縺輔ｌ縺溘ヰ繧､繝翫Μ繧・`bin/` 繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ驟咲ｽｮ縺吶ｋ縺薙→縺ｧ縲＾S縺瑚ｵｷ蜍墓凾縺ｫ閾ｪ蜍慕噪縺ｫ繝ｭ繝ｼ繝峨＠縺ｾ縺吶�・```

### 2. Nginx險ｭ螳・
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

### 3. 繝・・繝ｭ繧､螳溯｡・
```bash
# 繝薙Ν繝・襍ｷ蜍・docker-compose up -d

# 繝ｭ繧ｰ遒ｺ隱・docker-compose logs -f app

# 蛛懈ｭ｢
docker-compose down

# 蜀崎ｵｷ蜍・docker-compose restart app
```

---

## 逶｣隕悶→驕狗畑

### 繝倥Ν繧ｹ繝√ぉ繝・け

```bash
# 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繝倥Ν繧ｹ繝√ぉ繝・け
curl http://localhost:3000/health

# 繝・・繧ｿ繝吶・繧ｹ謗･邯夂｢ｺ隱・curl http://localhost:3000/health/db

# Redis謗･邯夂｢ｺ隱・curl http://localhost:3000/health/redis
```

### 繝｡繝医Μ繧ｯ繧ｹ蜿朱寔

```bash
# Prometheus繝｡繝医Μ繧ｯ繧ｹ
curl http://localhost:3000/metrics
```

### 繝ｭ繧ｰ邂｡逅・
```bash
# 繝ｭ繧ｰ繝ｭ繝ｼ繝・・繧ｷ繝ｧ繝ｳ險ｭ螳・# /etc/logrotate.d/elysia-ai
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

### 逶｣隕悶ヤ繝ｼ繝ｫ謗ｨ螂ｨ

- **PM2**: 繝励Ο繧ｻ繧ｹ逶｣隕・- **Prometheus + Grafana**: 繝｡繝医Μ繧ｯ繧ｹ蜿ｯ隕門喧
- **ELK Stack**: 繝ｭ繧ｰ髮・ｴ・・蛻・梵
- **Uptime Kuma**: 繧｢繝・・繧ｿ繧､繝�逶｣隕・
---

## 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺瑚ｵｷ蜍輔＠縺ｪ縺・
```bash
# 繝ｭ繧ｰ遒ｺ隱・pm2 logs elysia-ai

# 迺ｰ蠅・､画焚遒ｺ隱・pm2 env 0

# 繝昴・繝井ｽｿ逕ｨ迥ｶ豕∫｢ｺ隱・sudo netstat -tulpn | grep 3000
```

### 繝・・繧ｿ繝吶・繧ｹ謗･邯壹お繝ｩ繝ｼ

```bash
# PostgreSQL襍ｷ蜍慕｢ｺ隱・sudo systemctl status postgresql

# 謗･邯壹ユ繧ｹ繝・psql -U elysia_user -d elysia_ai -h localhost

# 隱崎ｨｼ險ｭ螳夂｢ｺ隱・sudo nano /etc/postgresql/14/main/pg_hba.conf
```

### Redis謗･邯壹お繝ｩ繝ｼ

```bash
# Redis襍ｷ蜍慕｢ｺ隱・sudo systemctl status redis-server

# 謗･邯壹ユ繧ｹ繝・redis-cli -a your_password ping

# 繝ｭ繧ｰ遒ｺ隱・sudo tail -f /var/log/redis/redis-server.log
```

### WebSocket謗･邯壼､ｱ謨・
1. Nginx險ｭ螳壹ｒ遒ｺ隱・2. 繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ險ｭ螳壹ｒ遒ｺ隱・3. 繝励Ο繧ｭ繧ｷ繧ｿ繧､繝�繧｢繧ｦ繝郁ｨｭ螳壹ｒ遒ｺ隱・
### 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ蝠城｡・
```bash
# 繧ｯ繧ｨ繝ｪ邨ｱ險育｢ｺ隱・curl http://localhost:3000/admin/query-stats

# 驕・＞繧ｯ繧ｨ繝ｪ遒ｺ隱・curl http://localhost:3000/admin/slow-queries

# Redis邨ｱ險育｢ｺ隱・redis-cli INFO stats
```

---

## 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝√ぉ繝・け繝ｪ繧ｹ繝・
- [ ] JWT_SECRET 繧貞ｼｷ蜉帙↑繧ゅ・縺ｫ螟画峩
- [ ] 繝・・繧ｿ繝吶・繧ｹ繝代せ繝ｯ繝ｼ繝峨ｒ蠑ｷ蜉帙↑繧ゅ・縺ｫ螟画峩
- [ ] Redis繝代せ繝ｯ繝ｼ繝峨ｒ險ｭ螳・- [ ] HTTPS 繧呈怏蜉ｹ蛹・(Let's Encrypt謗ｨ螂ｨ)
- [ ] 繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ繧定ｨｭ螳・(UFW, iptables)
- [ ] SSH骰ｵ隱崎ｨｼ繧剃ｽｿ逕ｨ
- [ ] 荳崎ｦ√↑繝昴・繝医ｒ髢峨§繧・- [ ] 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繧｢繝・・繝・・繝医ｒ螳壽悄逧・↓螳溯｡・- [ ] 逶｣譟ｻ繝ｭ繧ｰ繧貞ｮ壽悄逧・↓繝ｬ繝薙Η繝ｼ
- [ ] 繝舌ャ繧ｯ繧｢繝・・繧貞ｮ壽悄逧・↓繝・せ繝・
---

## 譛ｬ逡ｪ迺ｰ蠅・メ繧ｧ繝・け繝ｪ繧ｹ繝・
- [ ] 迺ｰ蠅・､画焚繧偵☆縺ｹ縺ｦ險ｭ螳・- [ ] 繝・・繧ｿ繝吶・繧ｹ繧貞・譛溷喧
- [ ] Redis繧定ｨｭ螳・- [ ] 繧､繝ｳ繝・ャ繧ｯ繧ｹ繧剃ｽ懈・
- [ ] Nginx/繝ｪ繝舌・繧ｹ繝励Ο繧ｭ繧ｷ繧定ｨｭ螳・- [ ] SSL險ｼ譏取嶌繧偵う繝ｳ繧ｹ繝医・繝ｫ
- [ ] 繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ繧定ｨｭ螳・- [ ] PM2/Docker縺ｧ襍ｷ蜍・- [ ] 繝倥Ν繧ｹ繝√ぉ繝・け繧堤｢ｺ隱・- [ ] 繝ｭ繧ｰ繝ｭ繝ｼ繝・・繧ｷ繝ｧ繝ｳ繧定ｨｭ螳・- [ ] 繝舌ャ繧ｯ繧｢繝・・繧定ｨｭ螳・- [ ] 逶｣隕悶ヤ繝ｼ繝ｫ繧定ｨｭ螳・- [ ] 繝峨く繝･繝｡繝ｳ繝医ｒ譖ｴ譁ｰ

---

## 繧ｵ繝昴・繝・
蝠城｡後′逋ｺ逕溘＠縺溷�ｴ蜷・

1. 繝ｭ繧ｰ繧堤｢ｺ隱・(`/logs` 縺ｾ縺溘・ `pm2 logs`)
2. 繝倥Ν繧ｹ繝√ぉ繝・け繧貞ｮ溯｡・3. GitHub Issues縺ｧ蝣ｱ蜻・4. Discord繧ｳ繝溘Η繝九ユ繧｣縺ｧ雉ｪ蝠・
---

**繝・・繝ｭ繧､繝｡繝ｳ繝亥ｮ御ｺ・** 脂
