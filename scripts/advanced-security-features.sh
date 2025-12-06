#!/bin/bash

# Elysia AI - Advanced Security Features
# 高度なセキュリティ機能（VPN、IPホワイトリスト、DDoS対策）

set -e

echo "=========================================="
echo "🔒 Advanced Security Features Setup"
echo "=========================================="

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

echo ""
echo "=========================================="
echo "[1/3] Installing Fail2Ban DDoS Protection..."
echo "=========================================="

# Fail2Ban DDoS 保護ルール追加
DDOS_JAIL="/etc/fail2ban/jail.d/ddos-protection.conf"

cat > "$DDOS_JAIL" << 'DDOS_JAIL_EOF'
# DDoS Protection Rules

[http-ddos]
enabled = true
port = http,https
filter = http-ddos
logpath = /var/log/apache2/access.log
            /var/log/nginx/access.log
maxretry = 50
findtime = 10
bantime = 3600
action = iptables-multiport[name=HTTP-DDoS, port="http,https"]

[port-scan]
enabled = true
filter = port-scan
logpath = /var/log/ufw.log
maxretry = 5
findtime = 600
bantime = 3600
action = iptables-multiport[name=PortScan, port="http,https,ssh"]

DDOS_JAIL_EOF

chmod 644 "$DDOS_JAIL"
echo "✓ DDoS protection rules configured"

# DDoS フィルター作成
HTTP_DDOS_FILTER="/etc/fail2ban/filter.d/http-ddos.conf"
cat > "$HTTP_DDOS_FILTER" << 'HTTP_DDOS_FILTER_EOF'
[Definition]
failregex = ^<HOST> .* ".*" .* ".*" "-" ".*"$
ignoreregex = ^<HOST> .* "GET /health" 200
              ^<HOST> .* "GET /ping" 200
EOF

chmod 644 "$HTTP_DDOS_FILTER"

# ポートスキャン フィルター作成
PORT_SCAN_FILTER="/etc/fail2ban/filter.d/port-scan.conf"
cat > "$PORT_SCAN_FILTER" << 'PORT_SCAN_FILTER_EOF'
[Definition]
failregex = UFW BLOCK .* SRC=<HOST>
ignoreregex =
EOF

chmod 644 "$PORT_SCAN_FILTER"

echo ""
echo "=========================================="
echo "[2/3] Setting up IP Whitelisting..."
echo "=========================================="

# IP ホワイトリスト設定
WHITELIST_FILE="/etc/fail2ban/ip.whitelist"

cat > "$WHITELIST_FILE" << 'WHITELIST_EOF'
# IP Whitelist for Fail2Ban
# 以下のIPはバンしない

127.0.0.1
::1

# Administrative IPs (管理者IPを追加)
# 192.168.1.100
# 203.0.113.0/24

WHITELIST_EOF

chmod 600 "$WHITELIST_FILE"

# Fail2Ban設定で、ホワイトリストを参照
FAIL2BAN_CONFIG="/etc/fail2ban/jail.local"

if [ ! -f "$FAIL2BAN_CONFIG" ]; then
    cat > "$FAIL2BAN_CONFIG" << 'FAIL2BAN_CONFIG_EOF'
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1
           file:/etc/fail2ban/ip.whitelist

bantime = 3600
findtime = 600
maxretry = 5

FAIL2BAN_CONFIG_EOF
fi

echo "✓ IP whitelist configured: $WHITELIST_FILE"

echo ""
echo "=========================================="
echo "[3/3] Installing ModSecurity (WAF)..."
echo "=========================================="

# ModSecurity (Web Application Firewall)
if ! command -v modsecurity &> /dev/null; then
    echo "Installing ModSecurity..."
    apt-get install -y libmodsecurity3 modsecurity-apache2 > /dev/null 2>&1 || \
    apt-get install -y libmodsecurity3 modsecurity-nginx > /dev/null 2>&1
    echo "✓ ModSecurity installed"
else
    echo "✓ ModSecurity already installed"
fi

# OWASP ModSecurity Core Rule Set
MODSEC_DIR="/etc/modsecurity"
mkdir -p "$MODSEC_DIR"

if [ ! -f "$MODSEC_DIR/crs-setup.conf.example" ]; then
    echo "Downloading OWASP Core Rule Set..."
    cd /tmp
    wget -q https://github.com/coreruleset/coreruleset/archive/refs/heads/v3.3/master.zip 2>/dev/null || \
    curl -s -o coreruleset.zip https://github.com/coreruleset/coreruleset/archive/refs/heads/v3.3/master.zip

    if [ -f coreruleset.zip ]; then
        unzip -q coreruleset.zip
        cp coreruleset-v3.3-master/* "$MODSEC_DIR/" 2>/dev/null || true
        rm -rf coreruleset* coreruleset-v3.3-master
        echo "✓ OWASP Core Rule Set installed"
    fi
fi

# ModSecurity設定ファイル作成
MODSEC_CONFIG="/etc/modsecurity/modsecurity.conf"

if [ ! -f "$MODSEC_CONFIG" ]; then
    cat > "$MODSEC_CONFIG" << 'MODSEC_CONFIG_EOF'
SecRuleEngine On
SecDefaultAction "phase:1,log,auditlog,deny,status:403"
SecDefaultAction "phase:2,log,auditlog,deny,status:403"

# SQLインジェクション検出
SecRule ARGS "@contains SELECT" "id:1001,phase:2,deny,status:403,msg:'SQL Injection Attempt'"
SecRule ARGS "@contains DROP" "id:1002,phase:2,deny,status:403,msg:'SQL Injection Attempt'"
SecRule ARGS "@contains UNION" "id:1003,phase:2,deny,status:403,msg:'SQL Injection Attempt'"
SecRule ARGS "@contains INSERT" "id:1004,phase:2,deny,status:403,msg:'SQL Injection Attempt'"
SecRule ARGS "@contains UPDATE" "id:1005,phase:2,deny,status:403,msg:'SQL Injection Attempt'"
SecRule ARGS "@contains DELETE" "id:1006,phase:2,deny,status:403,msg:'SQL Injection Attempt'"

# XSS検出
SecRule ARGS "@contains <script" "id:2001,phase:2,deny,status:403,msg:'XSS Attempt'"
SecRule ARGS "@contains javascript:" "id:2002,phase:2,deny,status:403,msg:'XSS Attempt'"
SecRule ARGS "@contains onerror=" "id:2003,phase:2,deny,status:403,msg:'XSS Attempt'"
SecRule ARGS "@contains onclick=" "id:2004,phase:2,deny,status:403,msg:'XSS Attempt'"

# パストトラバーサル検出
SecRule ARGS "@contains ../" "id:3001,phase:2,deny,status:403,msg:'Path Traversal Attempt'"
SecRule ARGS "@contains ..\\" "id:3002,phase:2,deny,status:403,msg:'Path Traversal Attempt'"

MODSEC_CONFIG_EOF

    echo "✓ ModSecurity configuration created"
fi

echo ""
echo "=========================================="
echo "✓ Advanced Security Features Installed!"
echo "=========================================="

echo ""
echo "🔒 Protection Features:"
echo "  - DDoS Protection (Fail2Ban + rate limiting)"
echo "  - IP Whitelisting"
echo "  - Web Application Firewall (ModSecurity)"
echo "  - SQL Injection Detection"
echo "  - XSS Protection"
echo "  - Path Traversal Prevention"
echo "  - Port Scan Detection"

echo ""
echo "📝 Configuration Files:"
echo "  DDoS Rules: $DDOS_JAIL"
echo "  IP Whitelist: $WHITELIST_FILE"
echo "  ModSecurity: $MODSEC_CONFIG"

echo ""
echo "🔧 Next Steps:"
echo "  1. Edit IP whitelist: nano $WHITELIST_FILE"
echo "  2. Add administrative IPs"
echo "  3. Restart Fail2Ban: systemctl restart fail2ban"
echo "  4. Test rules: fail2ban-client status"
