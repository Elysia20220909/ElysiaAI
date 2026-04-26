#!/bin/bash

# Elysia AI - SSH Security Configuration
# SSH認証を鍵ベースのみに変更

set -e

echo "=========================================="
echo "🔑 SSH Security Configuration"
echo "=========================================="

SSH_CONFIG="/etc/ssh/sshd_config"
SSH_BACKUP="/etc/ssh/sshd_config.backup.$(date +%Y%m%d-%H%M%S)"

# Root権限確認
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# バックアップ作成
echo "[1/4] Creating backup of SSH config..."
cp "$SSH_CONFIG" "$SSH_BACKUP"
echo "✓ Backup created: $SSH_BACKUP"

# SSH設定の推奨値
echo "[2/4] Applying security settings..."

# 一時ファイルに新しい設定を書き込む
TEMP_CONFIG=$(mktemp)

# 既存の設定をコピーしつつ推奨設定を適用
cat "$SSH_CONFIG" | grep -v "^PasswordAuthentication\|^PubkeyAuthentication\|^PermitRootLogin\|^X11Forwarding\|^MaxAuthTries\|^MaxSessions\|^TCPKeepAlive\|^ClientAliveInterval\|^ClientAliveCountMax" > "$TEMP_CONFIG"

# 推奨設定を追加
cat >> "$TEMP_CONFIG" << 'EOF'

# ===== Security Recommendations =====
# パスワード認証を無効化（鍵認証のみ）
PasswordAuthentication no
PubkeyAuthentication yes

# ルートログインを禁止
PermitRootLogin no

# X11フォワーディングを無効化
X11Forwarding no

# ブルートフォース対策
MaxAuthTries 3
MaxSessions 5

# Keep-alive設定
TCPKeepAlive yes
ClientAliveInterval 300
ClientAliveCountMax 2

# 不要なプロトコルを無効化
Protocol 2

# 強力な暗号スイート設定
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group-exchange-sha256
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com

# ユーザー環境変数の無効化
PermitUserEnvironment no

# ログレベル
SyslogFacility AUTH
LogLevel VERBOSE
EOF

# 設定ファイルを置き換え
mv "$TEMP_CONFIG" "$SSH_CONFIG"
chmod 600 "$SSH_CONFIG"
echo "✓ SSH configuration updated"

# 設定の検証
echo "[3/4] Validating SSH configuration..."
if sshd -t; then
    echo "✓ Configuration syntax OK"
else
    echo "✗ Configuration has errors!"
    echo "  Restoring from backup..."
    cp "$SSH_BACKUP" "$SSH_CONFIG"
    exit 1
fi

# SSHサービスの再起動
echo "[4/4] Restarting SSH service..."
systemctl restart sshd
echo "✓ SSH service restarted"

echo ""
echo "=========================================="
echo "✓ SSH Security Setup Complete!"
echo "=========================================="

echo ""
echo "📋 Changes applied:"
echo "  ✓ Password authentication: DISABLED"
echo "  ✓ Public key authentication: ENABLED"
echo "  ✓ Root login: DISABLED"
echo "  ✓ X11 forwarding: DISABLED"
echo "  ✓ Max auth tries: 3"
echo "  ✓ Keep-alive: 5 minutes"

echo ""
echo "⚠️  IMPORTANT:"
echo "  Make sure your SSH public key is in ~/.ssh/authorized_keys"
echo "  Test connection BEFORE closing current session!"

echo ""
echo "🔧 Test new SSH configuration:"
echo "  ssh -v user@server"
echo ""
echo "⏮️  To restore previous config:"
echo "  sudo cp $SSH_BACKUP $SSH_CONFIG"
echo "  sudo systemctl restart sshd"
