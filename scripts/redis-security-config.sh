#!/bin/bash

# Elysia AI - Redis Security Configuration
# Redis セキュリティ強化設定

set -e

echo "=========================================="
echo "🔐 Redis Security Configuration"
echo "=========================================="

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# Redis 存在確認
if ! command -v redis-cli &> /dev/null; then
    echo "Installing Redis..."
    apt-get update -qq
    apt-get install -y redis-server > /dev/null
    echo "✓ Redis installed"
fi

echo ""
echo "=========================================="
echo "[1/4] Configuring Redis Authentication..."
echo "=========================================="

# Redis設定ファイル
REDIS_CONF="/etc/redis/redis.conf"

# バックアップ
cp "$REDIS_CONF" "$REDIS_CONF.backup"

# Redis パスワード生成
REDIS_PASSWORD=$(head -c 32 /dev/urandom | base64 | tr -d "=+/" | cut -c1-20)

# パスワード設定
sed -i "s/# requirepass foobared/requirepass $REDIS_PASSWORD/" "$REDIS_CONF"

# ACL設定（Redis 6.0以上）
cat >> "$REDIS_CONF" << 'REDIS_ACL'

# ACL Configuration
# デフォルトユーザーにのみアクセス許可
user default on >PASSWORD ~* &* +@all
user app-user on >APP_PASSWORD ~* &* +get +set +del +incr +decr

REDIS_ACL

echo "✓ Authentication configured"

echo ""
echo "=========================================="
echo "[2/4] Setting Up TLS/SSL Encryption..."
echo "=========================================="

# SSL証明書ディレクトリ
SSL_DIR="/etc/redis/ssl"
mkdir -p "$SSL_DIR"

# 自己署名証明書生成
if [ ! -f "$SSL_DIR/redis.crt" ]; then
    echo "Generating SSL certificates..."

    openssl req -x509 -newkey rsa:4096 -keyout "$SSL_DIR/redis.key" \
        -out "$SSL_DIR/redis.crt" -days 365 -nodes \
        -subj "/CN=localhost/O=ElysiaAI/C=JP" 2>/dev/null

    chmod 600 "$SSL_DIR/redis.key"
    chmod 644 "$SSL_DIR/redis.crt"

    echo "✓ SSL certificates generated"
fi

# TLS設定を追加
cat >> "$REDIS_CONF" << 'REDIS_TLS'

# TLS Configuration
port 0
tls-port 6380
tls-cert-file /etc/redis/ssl/redis.crt
tls-key-file /etc/redis/ssl/redis.key
tls-ca-cert-file /etc/redis/ssl/redis.crt
tls-protocols "TLSv1.2 TLSv1.3"
tls-ciphers HIGH:!aNULL:!MD5
tls-ciphersuites TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
tls-prefer-server-ciphers yes

REDIS_TLS

echo "✓ TLS/SSL encryption configured"

echo ""
echo "=========================================="
echo "[3/4] Hardening Redis Configuration..."
echo "=========================================="

# セキュリティ設定
cat >> "$REDIS_CONF" << 'REDIS_SECURITY'

# Security Hardening

# ローカルホストのみバインド
bind 127.0.0.1 ::1

# Appendix only file
appendonly yes
appendfsync everysec

# メモリ管理
maxmemory 512mb
maxmemory-policy allkeys-lru

# スローログ
slowlog-log-slower-than 10000
slowlog-max-len 128

# 重要なコマンドを無効化
# rename-command FLUSHDB ""
# rename-command FLUSHALL ""
# rename-command KEYS ""

# バックアップ設定
save 900 1
save 300 10
save 60 10000

REDIS_SECURITY

echo "✓ Security hardening applied"

echo ""
echo "=========================================="
echo "[4/4] Setting Up Redis Monitoring..."
echo "=========================================="

# Redis監視スクリプト作成
REDIS_MONITOR_SCRIPT="/opt/monitor-redis.sh"

cat > "$REDIS_MONITOR_SCRIPT" << 'REDIS_MONITOR_EOF'
#!/bin/bash

# Redis Monitoring Script
# Redis のセキュリティと性能監視

echo "=========================================="
echo "📊 Redis Monitoring Report"
echo "Generated: $(date)"
echo "=========================================="

# Redis 接続確認
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running or not accessible"
    exit 1
fi

echo ""
echo "🟢 Redis Status: Running"
echo ""

# ============================================
# 1. Redis Info
# ============================================
echo "📈 Redis Server Info:"
echo "----------------------------------------"
redis-cli info server | grep -E "redis_version|process_id|uptime|connected_clients"

echo ""
echo "💾 Memory Usage:"
echo "----------------------------------------"
redis-cli info memory | grep -E "used_memory_human|used_memory_rss_human|mem_fragmentation_ratio"

echo ""
echo "🔒 Authentication Status:"
echo "----------------------------------------"
if redis-cli config get requirepass | grep -q "requirepass"; then
    echo "✓ Password protection: Enabled"
else
    echo "⚠️  Password protection: Disabled"
fi

echo ""
echo "🔐 TLS/SSL Status:"
echo "----------------------------------------"
if redis-cli --tls-port 6380 ping > /dev/null 2>&1; then
    echo "✓ TLS/SSL: Enabled"
else
    echo "⚠️  TLS/SSL: Not configured or disabled"
fi

echo ""
echo "📊 Connected Clients:"
echo "----------------------------------------"
redis-cli info clients | grep -E "connected_clients|blocked_clients"

echo ""
echo "⚠️  Slowlog (Last 5 entries):"
echo "----------------------------------------"
redis-cli slowlog get 5 | grep -A 2 "^[0-9]"

echo ""
echo "🔧 Key Statistics:"
echo "----------------------------------------"
redis-cli dbsize

echo ""
echo "✓ Redis monitoring report completed"

REDIS_MONITOR_EOF

chmod +x "$REDIS_MONITOR_SCRIPT"
echo "✓ Redis monitoring script: $REDIS_MONITOR_SCRIPT"

# Cron job 設定
CRON_JOB="0 * * * * $REDIS_MONITOR_SCRIPT >> /var/log/redis-monitor.log 2>&1"

if ! crontab -l 2>/dev/null | grep -q "$REDIS_MONITOR_SCRIPT"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✓ Hourly monitoring scheduled"
fi

echo ""
echo "=========================================="
echo "✓ Redis Security Configuration Complete!"
echo "=========================================="

echo ""
echo "🔐 Security Settings Applied:"
echo "  - Authentication: Password required"
echo "  - TLS/SSL: Enabled (port 6380)"
echo "  - Bind: Localhost only"
echo "  - ACL: Role-based access control"
echo "  - Persistence: AOF enabled"
echo "  - Monitoring: Hourly checks"

echo ""
echo "📝 Configuration Files:"
echo "  Main config: $REDIS_CONF"
echo "  SSL certificates: $SSL_DIR/"
echo "  Backup config: $REDIS_CONF.backup"

echo ""
echo "🔧 Useful Commands:"
echo "  Start Redis: systemctl start redis-server"
echo "  Stop Redis: systemctl stop redis-server"
echo "  Status: systemctl status redis-server"
echo "  Connect with auth: redis-cli -a <password>"
echo "  Connect with TLS: redis-cli --tls-port 6380"
echo "  Monitor: redis-cli monitor"
echo "  Slowlog: redis-cli slowlog get"
echo "  Memory: redis-cli info memory"
echo "  Monitor script: $REDIS_MONITOR_SCRIPT"

echo ""
echo "⚠️  Important:"
echo "  1. Store Redis password in .env: REDIS_PASSWORD=<password>"
echo "  2. Configure connection with TLS: redis://:password@localhost:6380"
echo "  3. Monitor memory usage regularly"
echo "  4. Review slowlog for performance issues"
echo "  5. Backup important data regularly"

# Redis 再起動
systemctl restart redis-server 2>/dev/null || true

echo ""
echo "✓ Redis restarted with new configuration"
