#!/bin/bash

# Elysia AI - SSL Certificate Setup (Let's Encrypt)
# Certbotを使用したSSL証明書の自動取得と更新

set -e

echo "=========================================="
echo "🔒 SSL Certificate Setup (Let's Encrypt)"
echo "=========================================="

# Root権限確認
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# ドメイン入力
read -p "Enter your domain (e.g., example.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain cannot be empty"
    exit 1
fi

echo ""
echo "Domain: $DOMAIN"
read -p "Add www subdomain? (y/n) [y]: " ADD_WWW
ADD_WWW=${ADD_WWW:-y}

# ドメイン配列を作成
DOMAINS=(-d "$DOMAIN")
if [ "$ADD_WWW" = "y" ]; then
    DOMAINS+=(-d "www.$DOMAIN")
fi

echo ""
echo "=========================================="
echo "[1/4] Installing Certbot..."
echo "=========================================="

if command -v certbot &> /dev/null; then
    echo "✓ Certbot is already installed"
    VERSION=$(certbot --version)
    echo "  Version: $VERSION"
else
    echo "Installing certbot and nginx plugin..."
    apt update
    apt install -y certbot python3-certbot-nginx
    echo "✓ Certbot installed"
fi

echo ""
echo "=========================================="
echo "[2/4] Obtaining SSL Certificate..."
echo "=========================================="

echo "Requesting certificate for: ${DOMAINS[@]}"

# Certbotで証明書取得
if certbot certonly --nginx ${DOMAINS[@]} --non-interactive --agree-tos -m admin@"$DOMAIN"; then
    echo "✓ SSL certificate obtained successfully"
else
    echo "❌ Failed to obtain certificate"
    exit 1
fi

echo ""
echo "=========================================="
echo "[3/4] Setting up Auto-Renewal..."
echo "=========================================="

# Certbot自動更新タイマーの有効化
systemctl enable certbot.timer
systemctl start certbot.timer

echo "✓ Certbot timer enabled"

# 自動更新テスト
echo ""
echo "Testing certificate renewal..."
if certbot renew --dry-run; then
    echo "✓ Renewal test successful"
else
    echo "⚠️  Renewal test had issues (check logs)"
fi

echo ""
echo "=========================================="
echo "[4/4] Nginx Configuration..."
echo "=========================================="

echo ""
echo "Update your Nginx configuration:"
cat << 'EOF'

server {
    listen 80;
    server_name example.com www.example.com;

    # HTTP to HTTPS redirect
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    # SSL Certificate Paths
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Proxy to Elysia
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
}
EOF

echo ""
echo "After updating nginx config:"
echo "  1. sudo nginx -t   # Test config"
echo "  2. sudo systemctl reload nginx"

echo ""
echo "=========================================="
echo "✓ SSL Setup Complete!"
echo "=========================================="

echo ""
echo "📋 Certificate Information:"
certbot certificates

echo ""
echo "🔄 Auto-Renewal Schedule:"
echo "  Status: $(systemctl is-enabled certbot.timer)"
echo "  Renewal check: Daily at midnight and noon"

echo ""
echo "🔧 Useful Commands:"
echo "  View certificates: sudo certbot certificates"
echo "  Renew manually: sudo certbot renew"
echo "  Check renewal timer: sudo systemctl status certbot.timer"
echo "  View renewal log: sudo journalctl -u certbot.timer"

echo ""
echo "📅 Certificate expires in:"
EXPIRY=$(certbot certificates | grep "expiry_date" | head -1 | awk '{print $3, $4}')
echo "  $EXPIRY"
