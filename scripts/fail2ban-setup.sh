#!/bin/bash

# Elysia AI - Fail2Ban Security Setup
# 不正アクセス検出と自動ブロック設定

set -e

echo "=========================================="
echo "🚨 Fail2Ban Intrusion Detection Setup"
echo "=========================================="

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

echo ""
echo "=========================================="
echo "[1/4] Installing Fail2Ban..."
echo "=========================================="

# Fail2Banのインストール確認
if command -v fail2ban-client &> /dev/null; then
    echo "✓ Fail2Ban already installed"
    FAIL2BAN_VERSION=$(fail2ban-client --version)
    echo "  Version: $FAIL2BAN_VERSION"
else
    echo "Installing Fail2Ban..."
    apt-get update -qq
    apt-get install -y fail2ban fail2ban-systemd > /dev/null
    echo "✓ Fail2Ban installed"
fi

echo ""
echo "=========================================="
echo "[2/4] Creating Fail2Ban configuration..."
echo "=========================================="

# Fail2Banの設定ディレクトリ
FAIL2BAN_DIR="/etc/fail2ban/jail.d"
mkdir -p "$FAIL2BAN_DIR"

# Elysia AI用のフィルター定義を作成
FILTER_FILE="/etc/fail2ban/filter.d/elysia-api.conf"

cat > "$FILTER_FILE" << 'FILTER_EOF'
# Elysia AI API Security Filter
# 認証失敗、SQLインジェクション、不正なアクセスを検出

[Definition]
failregex = ^<HOST> .* "POST.*" 401
            ^<HOST> .* "GET.*" 403
            ^<HOST> .* ".*" 400 .*
            ^<HOST> .* authentication failed
            ^<HOST> .* unauthorized access
            ^<HOST> .* sql.*inject
            ^<HOST> .* cross.*site
            ^<HOST> .* command.*inject
            ^<HOST> .* path.*traversal
ignoreregex = ^<HOST> .* "GET /health" 200
              ^<HOST> .* "GET /ping" 200

EOF

chmod 644 "$FILTER_FILE"
echo "✓ API filter created: $FILTER_FILE"

# SSH用のフィルター (既存を確認)
if [ ! -f "/etc/fail2ban/filter.d/sshd.conf" ]; then
    echo "✓ SSH filter already exists"
fi

# Elysia AI用のJail設定を作成
JAIL_FILE="$FAIL2BAN_DIR/elysia-api.conf"

cat > "$JAIL_FILE" << 'JAIL_EOF'
# Elysia AI API Jail Configuration
# ブルートフォース攻撃と不正アクセスを検出・ブロック

[elysia-api]
enabled = true
port = http,https
filter = elysia-api
logpath = /var/log/elysia/*.log
maxretry = 5
findtime = 600
bantime = 3600
action = iptables-multiport[name=ElysiaAPI, port="http,https"]
         sendmail-whois[name=Elysia API, dest=root@localhost]

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
findtime = 600
bantime = 1800
action = iptables-multiport[name=SSH, port="ssh"]
         sendmail-whois[name=SSH, dest=root@localhost]

[sshd-ddos]
enabled = true
port = ssh
filter = sshd-ddos
logpath = /var/log/auth.log
maxretry = 10
findtime = 60
bantime = 600
action = iptables-multiport[name=SSH-DDoS, port="ssh"]

JAIL_EOF

chmod 644 "$JAIL_FILE"
echo "✓ Jail configuration created: $JAIL_FILE"

# SSH DDoS フィルター
SSH_DDOS_FILTER="/etc/fail2ban/filter.d/sshd-ddos.conf"
cat > "$SSH_DDOS_FILTER" << 'SSH_DDOS_FILTER_EOF'
[Definition]
failregex = ^<HOST> .* Invalid user .* from
            ^<HOST> .* Did not receive identification
            ^<HOST> .* Connection closed by authenticating user
ignoreregex =
EOF

chmod 644 "$SSH_DDOS_FILTER"
echo "✓ SSH DDoS filter created: $SSH_DDOS_FILTER"

echo ""
echo "=========================================="
echo "[3/4] Configuring Fail2Ban service..."
echo "=========================================="

# Fail2Banサービスを有効化・起動
systemctl enable fail2ban
systemctl restart fail2ban

echo "✓ Fail2Ban service enabled and restarted"

# 設定の確認
echo ""
echo "Verifying Fail2Ban status..."
if fail2ban-client status &>/dev/null; then
    echo "✓ Fail2Ban running"

    # ジェイルの状態確認
    echo ""
    echo "Active Jails:"
    fail2ban-client status 2>/dev/null || true
else
    echo "❌ Fail2Ban failed to start"
    exit 1
fi

echo ""
echo "=========================================="
echo "[4/4] Creating monitoring commands..."
echo "=========================================="

# Fail2Ban監視スクリプトを作成
MONITOR_SCRIPT="/opt/monitor-fail2ban.sh"

cat > "$MONITOR_SCRIPT" << 'MONITOR_SCRIPT_EOF'
#!/bin/bash

# Fail2Ban Monitoring Script
# 不正アクセス検出ログの監視

echo "=========================================="
echo "🚨 Fail2Ban Status Report"
echo "Generated: $(date)"
echo "=========================================="

echo ""
echo "📊 Fail2Ban Service Status:"
echo "----------------------------------------"

if systemctl is-active --quiet fail2ban; then
    echo "✓ Service: Running"
else
    echo "❌ Service: Stopped"
    exit 1
fi

echo ""
echo "🔒 Active Jails:"
echo "----------------------------------------"

fail2ban-client status

echo ""
echo "🚫 Banned IPs (Last 24h):"
echo "----------------------------------------"

for jail in $(fail2ban-client status | grep "Jail list:" | sed 's/.*Jail list:\t//; s/,//g'); do
    banned=$(fail2ban-client status "$jail" 2>/dev/null | grep "Banned IP list:" | sed 's/.*Banned IP list:\t//')
    if [ -n "$banned" ]; then
        echo ""
        echo "Jail: $jail"
        echo "Banned IPs: $banned"
    fi
done

echo ""
echo "📈 Recent Ban Events:"
echo "----------------------------------------"

grep "Ban\|Unban" /var/log/fail2ban.log 2>/dev/null | tail -10 || echo "No recent ban events"

echo ""
echo "⚙️  Configuration:"
echo "  Config: /etc/fail2ban/jail.d/elysia-api.conf"
echo "  Filters: /etc/fail2ban/filter.d/"
echo "  Logs: /var/log/fail2ban.log"

echo ""
echo "🔧 Useful Commands:"
echo "  View jail status: fail2ban-client status <jail_name>"
echo "  View banned IPs: fail2ban-client get <jail_name> banip"
echo "  Manual ban IP: fail2ban-client set <jail_name> banip add <IP>"
echo "  Unban IP: fail2ban-client set <jail_name> banip remove <IP>"
echo "  Reload config: systemctl reload fail2ban"
echo "  View logs: tail -f /var/log/fail2ban.log"

MONITOR_SCRIPT_EOF

chmod +x "$MONITOR_SCRIPT"
echo "✓ Monitoring script: $MONITOR_SCRIPT"

echo ""
echo "=========================================="
echo "Creating automatic unban cleanup..."
echo "=========================================="

# 24時間以上前のバンを自動解除するスクリプト
CLEANUP_SCRIPT="/opt/cleanup-fail2ban-bans.sh"

cat > "$CLEANUP_SCRIPT" << 'CLEANUP_SCRIPT_EOF'
#!/bin/bash

# Fail2Ban Ban Cleanup Script
# 期限切れのバンを自動解除

echo "Cleaning up expired bans..."

# Elysia API jail
for ip in $(fail2ban-client get elysia-api banip 2>/dev/null); do
    fail2ban-client set elysia-api banip remove "$ip"
    echo "✓ Unbanned: $ip"
done

# SSH jail
for ip in $(fail2ban-client get sshd banip 2>/dev/null); do
    fail2ban-client set sshd banip remove "$ip"
    echo "✓ Unbanned: $ip"
done

echo "✓ Ban cleanup completed"

CLEANUP_SCRIPT_EOF

chmod +x "$CLEANUP_SCRIPT"
echo "✓ Cleanup script: $CLEANUP_SCRIPT"

# クリーンアップのcron job (毎日実行)
CLEANUP_CRON="0 6 * * * $CLEANUP_SCRIPT >> /var/log/fail2ban-cleanup.log 2>&1"

if crontab -l 2>/dev/null | grep -q "$CLEANUP_SCRIPT"; then
    echo "✓ Cleanup cron job already exists"
else
    (crontab -l 2>/dev/null; echo "$CLEANUP_CRON") | crontab -
    echo "✓ Cleanup cron job added (Daily at 6:00 AM)"
fi

echo ""
echo "=========================================="
echo "✓ Fail2Ban Setup Complete!"
echo "=========================================="

echo ""
echo "🔒 Security Configuration:"
echo "  Elysia API:"
echo "    - Max retries: 5"
echo "    - Time window: 10 minutes"
echo "    - Ban duration: 1 hour"
echo ""
echo "  SSH:"
echo "    - Max retries: 3"
echo "    - Time window: 10 minutes"
echo "    - Ban duration: 30 minutes"
echo ""
echo "  SSH DDoS:"
echo "    - Max retries: 10"
echo "    - Time window: 1 minute"
echo "    - Ban duration: 10 minutes"

echo ""
echo "📁 Files Created:"
echo "  Filter: $FILTER_FILE"
echo "  Jail config: $JAIL_FILE"
echo "  SSH DDoS filter: $SSH_DDOS_FILTER"
echo "  Monitor script: $MONITOR_SCRIPT"
echo "  Cleanup script: $CLEANUP_SCRIPT"

echo ""
echo "🔧 Next Steps:"
echo "  1. Review configuration: nano $JAIL_FILE"
echo "  2. Check status: $MONITOR_SCRIPT"
echo "  3. Monitor logs: tail -f /var/log/fail2ban.log"
echo "  4. Test ban: fail2ban-client set elysia-api banip add 192.168.1.1"
echo "  5. Unban test: fail2ban-client set elysia-api banip remove 192.168.1.1"
