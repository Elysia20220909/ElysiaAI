#!/bin/bash

# Elysia AI - Log Monitoring Setup
# ログ監視とロテーション設定

set -e

echo "=========================================="
echo "📊 Log Monitoring Setup"
echo "=========================================="

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# ログ設定
LOG_DIR="/var/log/elysia"
ELYSIA_DIR="/opt/elysia-ai"
LOG_RETENTION_DAYS=30
LOG_ROTATION_SIZE="100M"

echo ""
echo "=========================================="
echo "[1/3] Creating log directories..."
echo "=========================================="

# ログディレクトリ作成
mkdir -p "$LOG_DIR"
mkdir -p "$LOG_DIR/audit"
chmod 750 "$LOG_DIR"
echo "✓ Log directory: $LOG_DIR"

echo ""
echo "=========================================="
echo "[2/3] Creating log rotation configuration..."
echo "=========================================="

# Logrotateの設定ファイルを作成
LOGROTATE_CONFIG="/etc/logrotate.d/elysia"

cat > "$LOGROTATE_CONFIG" << 'LOGROTATE_EOF'
# Elysia AI Log Rotation Configuration

/var/log/elysia/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload elysia > /dev/null 2>&1 || true
    endscript
}

/var/log/elysia/audit/*.log {
    weekly
    missingok
    rotate 12
    compress
    delaycompress
    notifempty
    create 0600 root root
}

/var/log/elysia-backup.log {
    weekly
    missingok
    rotate 8
    compress
    delaycompress
    notifempty
    create 0640 root root
}
LOGROTATE_EOF

chmod 644 "$LOGROTATE_CONFIG"
echo "✓ Logrotate configuration created: $LOGROTATE_CONFIG"

echo ""
echo "=========================================="
echo "[3/3] Creating log monitoring script..."
echo "=========================================="

# ログ監視スクリプトを作成
LOG_MONITOR_SCRIPT="/opt/monitor-elysia-logs.sh"

cat > "$LOG_MONITOR_SCRIPT" << 'LOGMONITOR_SCRIPT_EOF'
#!/bin/bash

# Elysia AI - Log Monitoring Script
# エラー、警告、セキュリティイベントを監視

set -e

LOG_DIR="/var/log/elysia"
EMAIL="admin@elysia-ai.local"  # 管理者メールアドレス
ALERT_THRESHOLD=10              # アラート発火の閾値

echo "=========================================="
echo "📊 Log Monitoring Report"
echo "Generated: $(date)"
echo "=========================================="

# ============================================
# 1. Error Analysis
# ============================================
echo ""
echo "🔴 ERROR ANALYSIS:"
echo "----------------------------------------"

ERROR_COUNT=$(grep -i "error\|exception\|fatal" "$LOG_DIR"/*.log 2>/dev/null | wc -l || echo "0")
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "Total errors in last 24h: $ERROR_COUNT"

    if [ "$ERROR_COUNT" -gt "$ALERT_THRESHOLD" ]; then
        echo "⚠️  HIGH ERROR RATE DETECTED!"
        echo ""
        echo "Recent errors:"
        grep -i "error\|exception\|fatal" "$LOG_DIR"/*.log 2>/dev/null | tail -5 || true
    else
        echo "✓ Error count within threshold"
    fi
else
    echo "✓ No errors detected"
fi

# ============================================
# 2. Warning Analysis
# ============================================
echo ""
echo "🟡 WARNING ANALYSIS:"
echo "----------------------------------------"

WARNING_COUNT=$(grep -i "warn\|deprecated\|slow" "$LOG_DIR"/*.log 2>/dev/null | wc -l || echo "0")
if [ "$WARNING_COUNT" -gt 0 ]; then
    echo "Total warnings in last 24h: $WARNING_COUNT"
    echo "Recent warnings:"
    grep -i "warn\|deprecated\|slow" "$LOG_DIR"/*.log 2>/dev/null | tail -3 || true
else
    echo "✓ No warnings detected"
fi

# ============================================
# 3. Security Audit
# ============================================
echo ""
echo "🛡️  SECURITY AUDIT:"
echo "----------------------------------------"

# Failed authentication attempts
FAILED_AUTH=$(grep -i "authentication failed\|access denied\|unauthorized" "$LOG_DIR"/*.log 2>/dev/null | wc -l || echo "0")
echo "Failed authentication attempts: $FAILED_AUTH"

if [ "$FAILED_AUTH" -gt 5 ]; then
    echo "⚠️  Multiple failed authentication attempts detected"
fi

# SQL injection attempts
SQL_INJECT=$(grep -i "sql.*inject\|drop.*table\|union.*select" "$LOG_DIR"/*.log 2>/dev/null | wc -l || echo "0")
echo "SQL injection attempts: $SQL_INJECT"

if [ "$SQL_INJECT" -gt 0 ]; then
    echo "⚠️  SQL injection attempts detected"
fi

# Rate limit violations
RATE_LIMIT=$(grep -i "rate.*limit\|too.*many.*requests" "$LOG_DIR"/*.log 2>/dev/null | wc -l || echo "0")
echo "Rate limit violations: $RATE_LIMIT"

# ============================================
# 4. Performance Metrics
# ============================================
echo ""
echo "⚡ PERFORMANCE METRICS:"
echo "----------------------------------------"

# Average response time
AVG_RESPONSE=$(grep -oP '(?<=response_time=)[0-9.]+' "$LOG_DIR"/*.log 2>/dev/null | awk '{sum+=$1; count++} END {if (count>0) printf "%.2f", sum/count; else print "N/A"}' || echo "N/A")
echo "Average response time: ${AVG_RESPONSE}ms"

# API call count
API_CALLS=$(grep -c "method=\|POST\|GET\|PUT\|DELETE" "$LOG_DIR"/*.log 2>/dev/null || echo "0")
echo "Total API calls in last 24h: $API_CALLS"

# Unique users
UNIQUE_USERS=$(grep -oP '(?<=user_id=)[^ ]+' "$LOG_DIR"/*.log 2>/dev/null | sort -u | wc -l || echo "0")
echo "Unique users: $UNIQUE_USERS"

# ============================================
# 5. System Health
# ============================================
echo ""
echo "🏥 SYSTEM HEALTH:"
echo "----------------------------------------"

# Database connection status
if grep -q "database.*connected\|db.*ok" "$LOG_DIR"/*.log 2>/dev/null; then
    echo "✓ Database: Connected"
else
    echo "❌ Database: Check connection"
fi

# Redis connection status
if grep -q "redis.*connected\|cache.*ok" "$LOG_DIR"/*.log 2>/dev/null; then
    echo "✓ Redis: Connected"
else
    echo "⚠️  Redis: Check connection"
fi

# Disk space
DISK_USAGE=$(df -h "$LOG_DIR" | tail -1 | awk '{print $(NF-1)}')
echo "Disk usage: $DISK_USAGE"

# Log file size
LOG_SIZE=$(du -sh "$LOG_DIR" | cut -f1)
echo "Log directory size: $LOG_SIZE"

# ============================================
# 6. Summary
# ============================================
echo ""
echo "=========================================="
echo "📋 SUMMARY"
echo "=========================================="

if [ "$ERROR_COUNT" -gt "$ALERT_THRESHOLD" ] || [ "$FAILED_AUTH" -gt 5 ] || [ "$SQL_INJECT" -gt 0 ]; then
    echo "⚠️  ATTENTION REQUIRED"
    echo ""
    echo "Action items:"
    [ "$ERROR_COUNT" -gt "$ALERT_THRESHOLD" ] && echo "  1. Investigate high error rate ($ERROR_COUNT errors)"
    [ "$FAILED_AUTH" -gt 5 ] && echo "  2. Review authentication failures ($FAILED_AUTH attempts)"
    [ "$SQL_INJECT" -gt 0 ] && echo "  3. Review SQL injection attempts ($SQL_INJECT attempts)"
else
    echo "✓ System status: HEALTHY"
fi

echo ""
echo "Log files:"
echo "  Main: $LOG_DIR/elysia.log"
echo "  Audit: $LOG_DIR/audit/"
echo "  Backup: /var/log/elysia-backup.log"

LOGMONITOR_SCRIPT_EOF

chmod +x "$LOG_MONITOR_SCRIPT"
echo "✓ Log monitoring script: $LOG_MONITOR_SCRIPT"

echo ""
echo "=========================================="
echo "Creating systemd log rotation service..."
echo "=========================================="

# Log rotationの定期実行設定
cat > /etc/systemd/system/elysia-logrotate.service << 'LOGROTATE_SERVICE'
[Unit]
Description=Elysia AI Log Rotation
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/logrotate -f /etc/logrotate.d/elysia
StandardOutput=journal
StandardError=journal
LOGROTATE_SERVICE

cat > /etc/systemd/system/elysia-logrotate.timer << 'LOGROTATE_TIMER'
[Unit]
Description=Elysia AI Log Rotation Timer
Requires=elysia-logrotate.service

[Timer]
OnCalendar=daily
OnCalendar=00:00
Persistent=true

[Install]
WantedBy=timers.target
LOGROTATE_TIMER

systemctl daemon-reload
systemctl enable elysia-logrotate.timer
systemctl start elysia-logrotate.timer

echo "✓ Systemd service created and enabled"

echo ""
echo "=========================================="
echo "Creating cron job for monitoring..."
echo "=========================================="

# ログ監視のcron job (毎時間実行)
MONITOR_CRON="0 * * * * $LOG_MONITOR_SCRIPT >> /var/log/elysia/monitor.log 2>&1"

if crontab -l 2>/dev/null | grep -q "$LOG_MONITOR_SCRIPT"; then
    echo "✓ Monitoring cron job already exists"
else
    (crontab -l 2>/dev/null; echo "$MONITOR_CRON") | crontab -
    echo "✓ Monitoring cron job added"
    echo "  Schedule: Hourly"
    echo "  Command: $LOG_MONITOR_SCRIPT"
fi

echo ""
echo "=========================================="
echo "✓ Log Monitoring Setup Complete!"
echo "=========================================="

echo ""
echo "📋 Log Configuration:"
echo "  Base directory: $LOG_DIR"
echo "  Rotation: Daily (30 day retention)"
echo "  Config: $LOGROTATE_CONFIG"
echo "  Monitor script: $LOG_MONITOR_SCRIPT"
echo "  Monitor schedule: Hourly"

echo ""
echo "🔧 Useful Commands:"
echo "  View logs: tail -f $LOG_DIR/elysia.log"
echo "  View audit: tail -f $LOG_DIR/audit/*.log"
echo "  Run monitoring: $LOG_MONITOR_SCRIPT"
echo "  Check rotation: logrotate -d /etc/logrotate.d/elysia"
echo "  View timer: systemctl status elysia-logrotate.timer"

echo ""
echo "📌 Log Types:"
echo "  - Application logs: $LOG_DIR/elysia.log"
echo "  - Audit logs: $LOG_DIR/audit/"
echo "  - Backup logs: /var/log/elysia-backup.log"
echo "  - Monitor reports: $LOG_DIR/monitor.log"
