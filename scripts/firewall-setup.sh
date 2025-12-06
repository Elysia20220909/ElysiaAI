#!/bin/bash

# Elysia AI - Firewall Configuration Script
# UFWを使用したファイアウォール設定を自動化

set -e

echo "=========================================="
echo "🔥 Firewall Configuration (UFW)"
echo "=========================================="

# Root権限確認
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# UFW確認
if ! command -v ufw &> /dev/null; then
    echo "Installing UFW..."
    apt update
    apt install -y ufw
fi

echo ""
echo "Current UFW status:"
ufw status verbose || true

echo ""
echo "=========================================="
echo "Setting up firewall rules..."
echo "=========================================="

# デフォルトルール
echo "[1/5] Setting default policies..."
ufw default deny incoming
ufw default allow outgoing
echo "✓ Default policies set"

# SSH (重要！最初に許可)
echo "[2/5] Allowing SSH..."
ufw allow 22/tcp comment 'SSH'
echo "✓ SSH allowed"

# HTTP/HTTPS
echo "[3/5] Allowing HTTP/HTTPS..."
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
echo "✓ HTTP/HTTPS allowed"

# Elysia Application (内部のみ推奨)
echo "[4/5] Configuring Elysia port..."
echo "Choose for port 3000:"
echo "  1) Allow from anywhere (開発環境のみ推奨)"
echo "  2) Allow from localhost only (推奨)"
echo "  3) Skip"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        ufw allow 3000/tcp comment 'Elysia AI'
        echo "✓ Port 3000 allowed from anywhere"
        ;;
    2)
        # ローカルホストからのみ許可（Nginxプロキシ経由）
        echo "✓ Port 3000 restricted to localhost (recommended)"
        echo "  Note: Access through Nginx on port 80/443"
        ;;
    3)
        echo "⊘ Port 3000 skipped"
        ;;
    *)
        echo "Invalid choice"
        ;;
esac

# UFW有効化
echo "[5/5] Enabling UFW..."
echo ""
echo "⚠️  WARNING: Ensure SSH is allowed before enabling UFW!"
echo "   Proceed? (yes/no)"
read -p "Confirm: " confirm

if [ "$confirm" = "yes" ]; then
    ufw --force enable
    echo "✓ UFW enabled"

    echo ""
    echo "=========================================="
    echo "✓ Firewall setup complete!"
    echo "=========================================="
    echo ""
    ufw status verbose
else
    echo "⊘ UFW activation cancelled"
fi

echo ""
echo "📋 Firewall rules summary:"
echo "  • Incoming: Denied by default"
echo "  • Outgoing: Allowed by default"
echo "  • SSH (22): Allowed"
echo "  • HTTP (80): Allowed"
echo "  • HTTPS (443): Allowed"
echo "  • Elysia (3000): [Custom]"

echo ""
echo "🔧 Useful commands:"
echo "  View rules: sudo ufw status verbose"
echo "  Add rule: sudo ufw allow <port>"
echo "  Delete rule: sudo ufw delete allow <port>"
echo "  Disable UFW: sudo ufw disable"
