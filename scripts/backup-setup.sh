#!/bin/bash

# Elysia AI - Automatic Backup Setup
# 毎日自動バックアップを実行

set -e

echo "=========================================="
echo "💾 Automatic Backup Setup"
echo "=========================================="

# Root権限確認
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# バックアップ設定
BACKUP_BASE_DIR="/backup"
ELYSIA_DIR="/opt/elysia-ai"
DB_USER="elysia_user"
DB_NAME="elysia_ai"
BACKUP_TIME="02:00"  # 毎日2:00 AM
RETENTION_DAYS=30    # 30日間保持

echo ""
echo "=========================================="
echo "[1/4] Creating backup directories..."
echo "=========================================="

# バックアップディレクトリ作成
mkdir -p "$BACKUP_BASE_DIR"
chmod 700 "$BACKUP_BASE_DIR"
echo "✓ Backup directory: $BACKUP_BASE_DIR"

echo ""
echo "=========================================="
echo "[2/4] Creating backup script..."
echo "=========================================="

# バックアップスクリプト作成
BACKUP_SCRIPT="/opt/backup-elysia-ai.sh"

cat > "$BACKUP_SCRIPT" << 'BACKUP_SCRIPT_EOF'
#!/bin/bash

# Elysia AI Automatic Backup Script
# Database, Application, and Uploads backup

set -e

# Settings
BACKUP_BASE_DIR="/backup"
ELYSIA_DIR="/opt/elysia-ai"
DB_NAME="elysia_ai"
DB_USER="elysia_user"
BACKUP_DIR="$BACKUP_BASE_DIR/elysia-$(date +%Y%m%d-%H%M%S)"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "🔄 Elysia AI Backup started"
echo "Backup location: $BACKUP_DIR"
echo "==========================================" >> /var/log/elysia-backup.log

# ============================================
# 1. Database Backup
# ============================================
echo "[1/3] Backing up PostgreSQL database..."

if command -v pg_dump &> /dev/null; then
    # PostgreSQLバージョン
    DB_BACKUP="$BACKUP_DIR/database.sql.gz"

    # パスワードはシステムユーザーで実行
    sudo -u postgres pg_dump "$DB_NAME" | gzip > "$DB_BACKUP"

    DB_SIZE=$(du -h "$DB_BACKUP" | cut -f1)
    echo "✓ Database backup: $DB_SIZE"
    echo "✓ Database backup: $DB_SIZE ($DB_BACKUP)" >> /var/log/elysia-backup.log
else
    echo "⚠️  PostgreSQL not found, skipping database backup"
fi

# ============================================
# 2. Application Backup
# ============================================
echo "[2/3] Backing up application files..."

APP_BACKUP="$BACKUP_DIR/application.tar.gz"

tar --exclude=node_modules \
    --exclude=.git \
    --exclude=.env \
    --exclude=logs \
    --exclude=uploads \
    --exclude=data \
    -czf "$APP_BACKUP" \
    -C "$(dirname "$ELYSIA_DIR")" \
    "$(basename "$ELYSIA_DIR")"

APP_SIZE=$(du -h "$APP_BACKUP" | cut -f1)
echo "✓ Application backup: $APP_SIZE"
echo "✓ Application backup: $APP_SIZE ($APP_BACKUP)" >> /var/log/elysia-backup.log

# ============================================
# 3. Uploads/Data Backup
# ============================================
echo "[3/3] Backing up uploads and data..."

if [ -d "$ELYSIA_DIR/uploads" ]; then
    UPLOADS_BACKUP="$BACKUP_DIR/uploads.tar.gz"
    tar -czf "$UPLOADS_BACKUP" -C "$ELYSIA_DIR" uploads
    UPLOADS_SIZE=$(du -h "$UPLOADS_BACKUP" | cut -f1)
    echo "✓ Uploads backup: $UPLOADS_SIZE"
    echo "✓ Uploads backup: $UPLOADS_SIZE ($UPLOADS_BACKUP)" >> /var/log/elysia-backup.log
fi

if [ -d "$ELYSIA_DIR/data" ]; then
    DATA_BACKUP="$BACKUP_DIR/data.tar.gz"
    tar -czf "$DATA_BACKUP" -C "$ELYSIA_DIR" data
    DATA_SIZE=$(du -h "$DATA_BACKUP" | cut -f1)
    echo "✓ Data backup: $DATA_SIZE"
    echo "✓ Data backup: $DATA_SIZE ($DATA_BACKUP)" >> /var/log/elysia-backup.log
fi

# ============================================
# 4. Cleanup Old Backups
# ============================================
echo ""
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."

DELETED_COUNT=$(find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null | wc -l || true)

echo "✓ Deleted $DELETED_COUNT old backup(s)"
echo "✓ Deleted $DELETED_COUNT old backup(s)" >> /var/log/elysia-backup.log

# ============================================
# 5. Backup Summary
# ============================================
echo ""
echo "=========================================="
echo "✓ Backup completed successfully"
echo "=========================================="

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "Total size: $TOTAL_SIZE"
echo "Location: $BACKUP_DIR"
echo ""
echo "Timestamp: $(date)" >> /var/log/elysia-backup.log
echo "" >> /var/log/elysia-backup.log

BACKUP_SCRIPT_EOF

chmod +x "$BACKUP_SCRIPT"
echo "✓ Backup script created: $BACKUP_SCRIPT"

echo ""
echo "=========================================="
echo "[3/4] Creating Cron Job..."
echo "=========================================="

# Cron jobを作成
CRON_JOB="0 2 * * * $BACKUP_SCRIPT >> /var/log/elysia-backup.log 2>&1"

# 既存のcron jobを確認
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "✓ Cron job already exists"
else
    # Cron jobを追加
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✓ Cron job added"
    echo "  Schedule: Daily at $BACKUP_TIME (02:00 AM)"
    echo "  Command: $BACKUP_SCRIPT"
fi

echo ""
echo "=========================================="
echo "[4/4] Test Backup..."
echo "=========================================="

echo "Running test backup..."
if bash "$BACKUP_SCRIPT"; then
    echo "✓ Test backup successful"
else
    echo "❌ Test backup failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ Backup Setup Complete!"
echo "=========================================="

echo ""
echo "📋 Backup Configuration:"
echo "  Base directory: $BACKUP_BASE_DIR"
echo "  Script: $BACKUP_SCRIPT"
echo "  Schedule: Daily at $BACKUP_TIME (02:00 AM)"
echo "  Retention: $RETENTION_DAYS days"
echo "  Log file: /var/log/elysia-backup.log"

echo ""
echo "🔧 Useful Commands:"
echo "  View backups: ls -lh $BACKUP_BASE_DIR"
echo "  View log: tail -f /var/log/elysia-backup.log"
echo "  Manual backup: $BACKUP_SCRIPT"
echo "  Edit cron: crontab -e"
echo "  View cron: crontab -l"

echo ""
echo "📌 Backup Retention Policy:"
echo "  - Daily backups at 2:00 AM"
echo "  - Keep for 30 days"
echo "  - Older backups auto-deleted"
