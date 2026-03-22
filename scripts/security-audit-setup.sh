#!/bin/bash

# Elysia AI - Security Audit Setup
# セキュリティ監査ツールの設定（Lynis, aide, ossec）

set -e

echo "=========================================="
echo "🔍 Security Audit Tools Setup"
echo "=========================================="

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

echo ""
echo "=========================================="
echo "[1/5] Installing Lynis (Security Auditing)..."
echo "=========================================="

if command -v lynis &> /dev/null; then
    echo "✓ Lynis already installed"
    LYNIS_VERSION=$(lynis --version | head -1)
    echo "  Version: $LYNIS_VERSION"
else
    echo "Installing Lynis..."
    apt-get update -qq
    apt-get install -y lynis > /dev/null
    echo "✓ Lynis installed"
fi

echo ""
echo "=========================================="
echo "[2/5] Configuring AIDE (File Integrity)..."
echo "=========================================="

if command -v aide &> /dev/null; then
    echo "✓ AIDE already installed"
else
    echo "Installing AIDE..."
    apt-get install -y aide aide-common > /dev/null
    echo "✓ AIDE installed"
fi

# AIDE設定
AIDE_CONFIG="/etc/aide/aide.conf.d/99_elysia"

cat > "$AIDE_CONFIG" << 'AIDE_CONFIG_EOF'
# Elysia AI File Integrity Monitoring Configuration

# 監視対象ディレクトリ
/opt/elysia-ai R+b+sha512
/etc/elysia R+b+sha512
/var/log/elysia L+b+sha512

# 除外パターン
!/opt/elysia-ai/node_modules
!/opt/elysia-ai/.git
!/opt/elysia-ai/uploads
!/opt/elysia-ai/logs

AIDE_CONFIG_EOF

echo "✓ AIDE configuration created: $AIDE_CONFIG"

# AIDE初期化
echo ""
echo "Initializing AIDE database (this may take a few minutes)..."
aide --init --config-check > /dev/null 2>&1 &
AIDE_PID=$!

# バックグラウンド実行を表示
echo "✓ AIDE initialization started (PID: $AIDE_PID)"
echo "  This can take several minutes. You can monitor with: tail -f /var/log/aide/aide.log"

echo ""
echo "=========================================="
echo "[3/5] Creating Security Audit Scripts..."
echo "=========================================="

# Lynis監査スクリプト
LYNIS_SCRIPT="/opt/run-security-audit.sh"

cat > "$LYNIS_SCRIPT" << 'LYNIS_SCRIPT_EOF'
#!/bin/bash

# Lynis Security Audit Script
# システムセキュリティの包括的な監査

AUDIT_REPORT="/var/log/elysia/audit/lynis-report-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p "$(dirname "$AUDIT_REPORT")"

echo "=========================================="
echo "🔍 Starting Lynis Security Audit"
echo "=========================================="
echo ""
echo "Report: $AUDIT_REPORT"
echo "Timestamp: $(date)"
echo ""

# Lynis監査を実行
lynis audit system --quiet --quiet-option 2 --log-file "$AUDIT_REPORT" 2>&1

echo ""
echo "=========================================="
echo "✓ Audit Report Generated"
echo "=========================================="
echo ""

# 重要な項目を抽出
echo "📋 Quick Summary:"
echo "----------------------------------------"

grep -E "^Suggestion|^Warning|^Issue" "$AUDIT_REPORT" | head -20 || true

echo ""
echo "Full report: $AUDIT_REPORT"
echo "View it with: cat $AUDIT_REPORT"

# スコアを計算
SCORE=$(grep "Hardening index" "$AUDIT_REPORT" | grep -oP '\[\s*\K[0-9]+')
if [ -n "$SCORE" ]; then
    echo ""
    echo "🎯 Hardening Score: $SCORE/100"
fi

LYNIS_SCRIPT_EOF

chmod +x "$LYNIS_SCRIPT"
echo "✓ Lynis audit script: $LYNIS_SCRIPT"

# AIDE検証スクリプト
AIDE_SCRIPT="/opt/run-aide-check.sh"

cat > "$AIDE_SCRIPT" << 'AIDE_SCRIPT_EOF'
#!/bin/bash

# AIDE File Integrity Check Script
# ファイル改ざんの検出

CHECK_REPORT="/var/log/elysia/audit/aide-check-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p "$(dirname "$CHECK_REPORT")"

echo "=========================================="
echo "🔐 Running AIDE File Integrity Check"
echo "=========================================="
echo ""
echo "Report: $CHECK_REPORT"
echo "Timestamp: $(date)"
echo ""

# AIDE チェック実行
aide --check --config=/etc/aide/aide.conf > "$CHECK_REPORT" 2>&1

if [ $? -eq 0 ]; then
    echo "✓ File integrity check completed"

    # 変更されたファイルを表示
    if grep -q "changed" "$CHECK_REPORT"; then
        echo ""
        echo "⚠️  Modified files detected:"
        grep "changed" "$CHECK_REPORT" | head -10
    else
        echo "✓ No file modifications detected"
    fi
else
    echo "⚠️  AIDE check found changes or errors"
fi

echo ""
echo "Full report: $CHECK_REPORT"

AIDE_SCRIPT_EOF

chmod +x "$AIDE_SCRIPT"
echo "✓ AIDE check script: $AIDE_SCRIPT"

echo ""
echo "=========================================="
echo "[4/5] Creating Comprehensive Audit Script..."
echo "=========================================="

# 総合セキュリティ監査スクリプト
COMPREHENSIVE_SCRIPT="/opt/comprehensive-security-audit.sh"

cat > "$COMPREHENSIVE_SCRIPT" << 'COMPREHENSIVE_SCRIPT_EOF'
#!/bin/bash

# Comprehensive Security Audit
# セキュリティの完全監査レポート生成

REPORT_DIR="/var/log/elysia/audit"
REPORT_FILE="$REPORT_DIR/comprehensive-audit-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p "$REPORT_DIR"

{
    echo "=========================================="
    echo "🔒 COMPREHENSIVE SECURITY AUDIT REPORT"
    echo "=========================================="
    echo "Generated: $(date)"
    echo "Hostname: $(hostname)"
    echo "OS: $(uname -a)"
    echo ""

    # ============================================
    # 1. System Updates Status
    # ============================================
    echo "1. SYSTEM UPDATES"
    echo "=========================================="

    apt-get update -qq 2>/dev/null
    UPDATES=$(apt list --upgradable 2>/dev/null | wc -l)
    SECURITY_UPDATES=$(apt list --upgradable 2>/dev/null | grep -i security | wc -l)

    echo "Available updates: $UPDATES"
    echo "Security updates: $SECURITY_UPDATES"

    if [ "$SECURITY_UPDATES" -gt 0 ]; then
        echo "⚠️  Security updates available!"
        echo "Run: apt-get upgrade -y"
    else
        echo "✓ All security updates applied"
    fi
    echo ""

    # ============================================
    # 2. User Account Security
    # ============================================
    echo "2. USER ACCOUNT SECURITY"
    echo "=========================================="

    echo "Sudoers:"
    grep -E "^[a-zA-Z0-9_-]" /etc/sudoers | grep -v "^#" | head -5
    echo ""

    echo "Users with login shell:"
    grep -E ":/bin/(bash|sh)$" /etc/passwd | cut -d: -f1,3 | sort -t: -k2 -n
    echo ""

    WEAK_PASSWORDS=$(awk -F: '($2 == "" || $2 == "!" || $2 == "*") {print $1}' /etc/shadow 2>/dev/null | wc -l)
    echo "Accounts with weak/no passwords: $WEAK_PASSWORDS"
    echo ""

    # ============================================
    # 3. SSH Security
    # ============================================
    echo "3. SSH SECURITY"
    echo "=========================================="

    echo "SSH Port: $(grep "^Port" /etc/ssh/sshd_config || echo 22)"
    echo "PermitRootLogin: $(grep "^PermitRootLogin" /etc/ssh/sshd_config || echo 'not set')"
    echo "PasswordAuthentication: $(grep "^PasswordAuthentication" /etc/ssh/sshd_config || echo 'not set')"
    echo "PubkeyAuthentication: $(grep "^PubkeyAuthentication" /etc/ssh/sshd_config || echo 'not set')"
    echo ""

    # ============================================
    # 4. Firewall Status
    # ============================================
    echo "4. FIREWALL CONFIGURATION"
    echo "=========================================="

    if command -v ufw &> /dev/null; then
        echo "UFW Status: $(ufw status | head -1)"
        echo ""
        echo "UFW Rules:"
        ufw status | grep -E "^[0-9]"
    else
        echo "⚠️  UFW not installed"
    fi
    echo ""

    # ============================================
    # 5. Open Ports
    # ============================================
    echo "5. OPEN PORTS AND SERVICES"
    echo "=========================================="

    if command -v netstat &> /dev/null; then
        netstat -tlnp 2>/dev/null | grep LISTEN
    else
        ss -tlnp 2>/dev/null | grep LISTEN
    fi
    echo ""

    # ============================================
    # 6. Security Services
    # ============================================
    echo "6. SECURITY SERVICES STATUS"
    echo "=========================================="

    SERVICES=(fail2ban ufw aide lynis)

    for service in "${SERVICES[@]}"; do
        if systemctl is-active --quiet $service 2>/dev/null; then
            echo "✓ $service: Active"
        elif command -v $service &> /dev/null; then
            echo "⚠️  $service: Installed but not active"
        else
            echo "❌ $service: Not installed"
        fi
    done
    echo ""

    # ============================================
    # 7. Recent Authentication Failures
    # ============================================
    echo "7. RECENT SECURITY EVENTS"
    echo "=========================================="

    echo "Failed login attempts (last 24h):"
    grep "Failed password\|authentication failure" /var/log/auth.log 2>/dev/null | tail -5 || echo "None"
    echo ""

    # ============================================
    # 8. File System Permissions
    # ============================================
    echo "8. CRITICAL FILE PERMISSIONS"
    echo "=========================================="

    for file in /etc/passwd /etc/shadow /etc/sudoers /root/.ssh/authorized_keys; do
        if [ -e "$file" ]; then
            echo "$file: $(stat -c '%A' $file 2>/dev/null || stat -f '%A' $file)"
        fi
    done
    echo ""

    # ============================================
    # 9. Disk Space
    # ============================================
    echo "9. DISK SPACE USAGE"
    echo "=========================================="

    df -h | head -n 1
    df -h | tail -n +2
    echo ""

    # ============================================
    # 10. Recommendations
    # ============================================
    echo "10. SECURITY RECOMMENDATIONS"
    echo "=========================================="

    ISSUES=0

    if [ "$SECURITY_UPDATES" -gt 0 ]; then
        echo "  ⚠️  $SECURITY_UPDATES security updates available"
        ISSUES=$((ISSUES + 1))
    fi

    if ! systemctl is-active --quiet fail2ban; then
        echo "  ⚠️  Fail2Ban is not active"
        ISSUES=$((ISSUES + 1))
    fi

    if ! systemctl is-active --quiet ufw; then
        echo "  ⚠️  UFW firewall is not active"
        ISSUES=$((ISSUES + 1))
    fi

    if [ "$WEAK_PASSWORDS" -gt 0 ]; then
        echo "  ⚠️  $WEAK_PASSWORDS accounts with weak/no passwords"
        ISSUES=$((ISSUES + 1))
    fi

    if [ $ISSUES -eq 0 ]; then
        echo "✓ No critical security issues detected"
    else
        echo ""
        echo "⚠️  $ISSUES issues found - review and address above"
    fi

    echo ""
    echo "=========================================="
    echo "✓ Audit Report Complete"
    echo "=========================================="

} | tee "$REPORT_FILE"

echo ""
echo "Full report saved to: $REPORT_FILE"

COMPREHENSIVE_SCRIPT_EOF

chmod +x "$COMPREHENSIVE_SCRIPT"
echo "✓ Comprehensive audit script: $COMPREHENSIVE_SCRIPT"

echo ""
echo "=========================================="
echo "[5/5] Creating Audit Scheduling..."
echo "=========================================="

# 定期監査スケジューリング
AUDIT_CRON_1="0 2 * * 0 $LYNIS_SCRIPT >> /var/log/elysia/audit.log 2>&1"        # 週1回 日曜 2:00 AM
AUDIT_CRON_2="0 3 * * * $AIDE_SCRIPT >> /var/log/elysia/audit.log 2>&1"        # 毎日 3:00 AM
AUDIT_CRON_3="0 4 1 * * $COMPREHENSIVE_SCRIPT >> /var/log/elysia/audit.log 2>&1" # 月1回 1日 4:00 AM

# Cron jobを追加
CRON_ADDED=0

if ! crontab -l 2>/dev/null | grep -q "$LYNIS_SCRIPT"; then
    (crontab -l 2>/dev/null; echo "$AUDIT_CRON_1") | crontab -
    echo "✓ Lynis audit schedule: Weekly (Sunday 2:00 AM)"
    CRON_ADDED=$((CRON_ADDED + 1))
fi

if ! crontab -l 2>/dev/null | grep -q "$AIDE_SCRIPT"; then
    (crontab -l 2>/dev/null; echo "$AUDIT_CRON_2") | crontab -
    echo "✓ AIDE check schedule: Daily (3:00 AM)"
    CRON_ADDED=$((CRON_ADDED + 1))
fi

if ! crontab -l 2>/dev/null | grep -q "$COMPREHENSIVE_SCRIPT"; then
    (crontab -l 2>/dev/null; echo "$AUDIT_CRON_3") | crontab -
    echo "✓ Comprehensive audit schedule: Monthly (1st day, 4:00 AM)"
    CRON_ADDED=$((CRON_ADDED + 1))
fi

if [ $CRON_ADDED -eq 0 ]; then
    echo "✓ All audit schedules already configured"
fi

echo ""
echo "=========================================="
echo "✓ Security Audit Setup Complete!"
echo "=========================================="

echo ""
echo "📁 Audit Tools:"
echo "  Lynis: Security hardening auditor"
echo "  AIDE: File integrity monitoring"
echo "  Custom scripts for comprehensive checks"

echo ""
echo "📊 Audit Scripts:"
echo "  Lynis audit: $LYNIS_SCRIPT"
echo "  AIDE check: $AIDE_SCRIPT"
echo "  Comprehensive: $COMPREHENSIVE_SCRIPT"

echo ""
echo "📅 Audit Schedule:"
echo "  Lynis: Weekly (Sunday 2:00 AM)"
echo "  AIDE: Daily (3:00 AM)"
echo "  Comprehensive: Monthly (1st day, 4:00 AM)"

echo ""
echo "🔧 Useful Commands:"
echo "  Run Lynis audit: $LYNIS_SCRIPT"
echo "  Check file integrity: $AIDE_SCRIPT"
echo "  Full audit report: $COMPREHENSIVE_SCRIPT"
echo "  View reports: ls -la /var/log/elysia/audit/"
echo "  Monitor audit: tail -f /var/log/elysia/audit.log"

echo ""
echo "📌 Next Steps:"
echo "  1. Wait for AIDE initialization to complete"
echo "  2. Run comprehensive audit: $COMPREHENSIVE_SCRIPT"
echo "  3. Review audit reports in /var/log/elysia/audit/"
echo "  4. Address any security issues found"
echo "  5. Monitor regular audit schedules"
