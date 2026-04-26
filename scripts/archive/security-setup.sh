#!/bin/bash

# Elysia AI - Production Security Setup Script
# 本番環境用のセキュリティ設定を自動化

set -e

echo "=========================================="
echo "🔐 Elysia AI Security Setup"
echo "=========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# 1. Database Credentials
# ============================================
echo -e "\n${YELLOW}[1/9]${NC} Generating Database Credentials..."

# PostgreSQL パスワード生成
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

echo -e "${GREEN}✓ Database Password (32 chars):${NC}"
echo "$DB_PASSWORD"
echo -e "${GREEN}✓ Redis Password (32 chars):${NC}"
echo "$REDIS_PASSWORD"

# ============================================
# 2. Firewall Configuration (UFW)
# ============================================
echo -e "\n${YELLOW}[2/9]${NC} Configuring Firewall (UFW)..."

if command -v ufw &> /dev/null; then
    # 既存ルールを表示
    echo "Current UFW status:"
    sudo ufw status verbose || true

    # 推奨ファイアウォール設定
    echo -e "\n${YELLOW}Recommended commands to run:${NC}"
    echo "sudo ufw enable"
    echo "sudo ufw default deny incoming"
    echo "sudo ufw default allow outgoing"
    echo "sudo ufw allow 22/tcp"      # SSH
    echo "sudo ufw allow 80/tcp"      # HTTP
    echo "sudo ufw allow 443/tcp"     # HTTPS
    echo "sudo ufw allow 3000/tcp"    # Elysia (内部のみ推奨)"
    echo "sudo ufw allow 5432/tcp"    # PostgreSQL (内部のみ推奨)"
    echo "sudo ufw allow 6379/tcp"    # Redis (内部のみ推奨)"
else
    echo -e "${RED}⚠ UFW not found. Install with: sudo apt install ufw${NC}"
fi

# ============================================
# 3. SSH Security
# ============================================
echo -e "\n${YELLOW}[3/9]${NC} SSH Security Configuration..."

echo -e "${YELLOW}Recommended SSH settings (/etc/ssh/sshd_config):${NC}"
cat << 'EOF'
# パスワード認証を無効化（鍵認証のみ）
PasswordAuthentication no
PubkeyAuthentication yes

# ルートログインを禁止
PermitRootLogin no

# 非標準ポート（推奨：2222など）
# Port 2222

# X11フォワーディングを無効化
X11Forwarding no

# TCP Keep Alive
TCPKeepAlive yes
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

echo -e "\n${YELLOW}After applying changes, restart SSH:${NC}"
echo "sudo systemctl restart sshd"

# ============================================
# 4. SSL Certificate Setup
# ============================================
echo -e "\n${YELLOW}[4/9]${NC} SSL Certificate Setup (Let's Encrypt)..."

echo -e "${YELLOW}Commands to run:${NC}"
cat << 'EOF'
# Certbot インストール
sudo apt install certbot python3-certbot-nginx

# SSL証明書取得
sudo certbot --nginx -d yourdomain.com

# 自動更新設定確認
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# 更新テスト
sudo certbot renew --dry-run
EOF

# ============================================
# 5. Automatic Updates
# ============================================
echo -e "\n${YELLOW}[5/9]${NC} Automatic Security Updates..."

echo -e "${YELLOW}Setup unattended-upgrades:${NC}"
cat << 'EOF'
# インストール
sudo apt install unattended-upgrades apt-listchanges

# 自動更新有効化
sudo dpkg-reconfigure -plow unattended-upgrades

# 設定ファイル
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades

# 再起動の自動スケジュール（夜中3:30 AM）
# Unattended-Upgrade::Automatic-Reboot-Time "03:30";
EOF

# ============================================
# 6. Backup Strategy
# ============================================
echo -e "\n${YELLOW}[6/9]${NC} Automatic Backup Setup..."

BACKUP_SCRIPT="/opt/backup-elysia.sh"

echo "Creating backup script at ${BACKUP_SCRIPT}..."

sudo tee "$BACKUP_SCRIPT" > /dev/null << 'BACKUP_EOF'
#!/bin/bash

# Elysia AI Backup Script
BACKUP_DIR="/backup/elysia-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Database backup
echo "Backing up PostgreSQL database..."
PGPASSWORD=your_db_password pg_dump -h localhost -U elysia_user elysia_ai | gzip > "$BACKUP_DIR/db_backup.sql.gz"

# Application files backup
echo "Backing up application files..."
tar -czf "$BACKUP_DIR/app_backup.tar.gz" /opt/elysia-ai --exclude=node_modules --exclude=.git

# Upload directory backup
echo "Backing up uploads..."
tar -czf "$BACKUP_DIR/uploads_backup.tar.gz" /opt/elysia-ai/uploads

echo "✓ Backup completed: $BACKUP_DIR"

# 古いバックアップ削除（30日以上前）
find /backup -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true
BACKUP_EOF

sudo chmod +x "$BACKUP_SCRIPT"

echo -e "${GREEN}✓ Backup script created at ${BACKUP_SCRIPT}${NC}"

# Cron job設定
echo -e "${YELLOW}Adding to crontab (daily at 2 AM):${NC}"
echo "0 2 * * * /opt/backup-elysia.sh"

# ============================================
# 7. Log Monitoring
# ============================================
echo -e "\n${YELLOW}[7/9]${NC} Log Monitoring Setup..."

echo -e "${YELLOW}Install logwatch for daily log reports:${NC}"
cat << 'EOF'
# インストール
sudo apt install logwatch

# 設定
sudo nano /etc/logwatch/conf/logwatch.conf

# 推奨設定:
# Output = mail
# Format = html
# MailTo = admin@yourdomain.com
# Detail = High

# テスト実行
sudo logwatch --output mail --format html --detail high
EOF

# ============================================
# 8. Fail2Ban Setup
# ============================================
echo -e "\n${YELLOW}[8/9]${NC} Intrusion Detection (Fail2Ban)..."

if command -v fail2ban-server &> /dev/null; then
    echo -e "${GREEN}✓ Fail2Ban is already installed${NC}"
else
    echo -e "${YELLOW}Install Fail2Ban:${NC}"
    echo "sudo apt install fail2ban"
fi

echo -e "${YELLOW}Setup SSH Brute Force Protection:${NC}"
cat << 'EOF'
# 設定ファイル作成
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# [sshd] セクションを修正:
# enabled = true
# port = ssh
# filter = sshd
# maxretry = 5
# findtime = 3600
# bantime = 3600

# Fail2Ban再起動
sudo systemctl restart fail2ban

# ステータス確認
sudo fail2ban-client status
sudo fail2ban-client status sshd
EOF

# ============================================
# 9. Security Audit
# ============================================
echo -e "\n${YELLOW}[9/9]${NC} Security Audit Tools..."

echo -e "${YELLOW}Install and run security audit tools:${NC}"
cat << 'EOF'
# Lynis (セキュリティ監査)
sudo apt install lynis
sudo lynis audit system

# aide (ファイル整合性監視)
sudo apt install aide
sudo aideinit
sudo aide --check

# ossec (ホストベースのIDS)
# https://www.ossec.net/
EOF

# ============================================
# Summary
# ============================================
echo -e "\n${GREEN}=========================================="
echo "✓ Security Setup Complete"
echo "==========================================${NC}"

echo -e "\n${YELLOW}📋 Checklist Summary:${NC}"
cat << 'EOF'
Database Credentials:
  ✓ PostgreSQL password: [GENERATED]
  ✓ Redis password: [GENERATED]

Network Security:
  □ Configure UFW firewall
  □ Set up SSH key-only authentication
  □ Configure fail2ban

SSL/TLS:
  □ Install Let's Encrypt certificate
  □ Enable auto-renewal

System Hardening:
  □ Enable automatic updates
  □ Configure log monitoring
  □ Set up daily backups
  □ Install audit tools

Verification:
  □ Test firewall rules
  □ Verify backups are working
  □ Check certificate renewal
  □ Monitor logs regularly
EOF

echo -e "\n${YELLOW}📖 Next Steps:${NC}"
echo "1. Review and apply firewall rules"
echo "2. Configure SSH security"
echo "3. Set up SSL certificates"
echo "4. Enable automatic updates"
echo "5. Configure backup retention"
echo "6. Set up log monitoring"
echo "7. Install intrusion detection"
echo "8. Run security audit"

echo -e "\n${YELLOW}📚 Documentation:${NC}"
echo "Security Guide: docs/SECURITY.md"
echo "Deployment Guide: PRODUCTION_SETUP_GUIDE.md"
echo "Troubleshooting: docs/TROUBLESHOOTING.md"
