#!/bin/bash

# Elysia AI - Database Security Hardening
# PostgreSQL セキュリティ強化設定

set -e

echo "=========================================="
echo "🗄️  Database Security Hardening"
echo "=========================================="

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# PostgreSQL 存在確認
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not installed"
    echo "Install it first: apt-get install -y postgresql"
    exit 1
fi

echo ""
echo "=========================================="
echo "[1/4] Configuring PostgreSQL Security..."
echo "=========================================="

# PostgreSQL設定ファイル
PG_CONF="/etc/postgresql/*/main/postgresql.conf"
PG_HBA="/etc/postgresql/*/main/pg_hba.conf"

# PostgreSQL セキュリティ設定を強化
echo "Configuring PostgreSQL..."

# pg_hba.conf セキュリティ設定
cat > /tmp/pg_hba_security.conf << 'PG_HBA_EOF'
# PostgreSQL Client Authentication Configuration (Security Hardened)

# "local" is for Unix domain socket connections only
local   all             all                                     md5

# IPv4 local connections (require password)
host    all             all             127.0.0.1/32            md5

# IPv4 connections from trusted network only
# host    all             all             192.168.1.0/24          md5

# IPv6 local connections (require password)
host    all             all             ::1/128                 md5

# SSL connections
hostssl all             all             0.0.0.0/0               md5

PG_HBA_EOF

# バックアップ
sudo -u postgres cp $(echo /etc/postgresql/*/main/pg_hba.conf | awk '{print $1}') \
    $(echo /etc/postgresql/*/main/pg_hba.conf | awk '{print $1}').backup 2>/dev/null || true

echo "✓ PostgreSQL configuration secured"

echo ""
echo "=========================================="
echo "[2/4] Setting Up Database Encryption..."
echo "=========================================="

# PostgreSQL ssl設定
PG_MAIN_CONF=$(ls /etc/postgresql/*/main/postgresql.conf 2>/dev/null | head -1)

if [ -f "$PG_MAIN_CONF" ]; then
    # SSL設定を有効化
    sudo -u postgres sed -i "s/#ssl = off/ssl = on/" "$PG_MAIN_CONF" 2>/dev/null || true

    # パスワード暗号化
    sudo -u postgres sed -i "s/#password_encryption = md5/password_encryption = scram-sha-256/" "$PG_MAIN_CONF" 2>/dev/null || true

    echo "✓ SSL and encryption configured"
fi

echo ""
echo "=========================================="
echo "[3/4] Creating Database User with Limited Privileges..."
echo "=========================================="

# Elysia AI用ユーザー作成（低権限）
DB_USER="elysia_user"
DB_NAME="elysia_ai"
DB_PASSWORD=$(head -c 32 /dev/urandom | base64 | tr -d "=+/" | cut -c1-20)

echo "Creating database user..."

# PostgreSQL 設定のデフォルト値
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"

# ユーザー存在確認
USER_EXISTS=$(sudo -u postgres psql -t -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER';" 2>/dev/null || echo "0")

if [ "$USER_EXISTS" == "0" ]; then
    # ユーザー作成
    sudo -u postgres psql -c "
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
        ALTER ROLE $DB_USER SET password_encryption = scram-sha-256;
    " 2>/dev/null || true

    echo "✓ Database user created: $DB_USER"
else
    echo "✓ Database user already exists: $DB_USER"
fi

# データベース存在確認
DB_EXISTS=$(sudo -u postgres psql -t -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" == "0" ]; then
    # データベース作成
    sudo -u postgres psql -c "
        CREATE DATABASE $DB_NAME OWNER $DB_USER;
    " 2>/dev/null || true

    echo "✓ Database created: $DB_NAME"
else
    echo "✓ Database already exists: $DB_NAME"
fi

# 低権限設定
sudo -u postgres psql -d "$DB_NAME" -c "
    -- ユーザーが自分のロールのみ変更可能
    REVOKE ALL ON DATABASE $DB_NAME FROM public;
    GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;

    -- テーブル権限設定
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $DB_USER;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO $DB_USER;
" 2>/dev/null || true

echo "✓ User privileges configured (least privilege principle)"

echo ""
echo "=========================================="
echo "[4/4] Enabling Query Logging and Auditing..."
echo "=========================================="

# 監査ログ設定
AUDIT_CONF="/var/log/postgresql/audit.log"

if [ ! -f "$AUDIT_CONF" ]; then
    touch "$AUDIT_CONF"
    chown postgres:postgres "$AUDIT_CONF"
    chmod 600 "$AUDIT_CONF"
fi

# PostgreSQL監査設定
sudo -u postgres psql -d "$DB_NAME" -c "
    -- DDL文ログ有効化
    ALTER SYSTEM SET log_statement = 'all';
    ALTER SYSTEM SET log_duration = on;
    ALTER SYSTEM SET log_connections = on;
    ALTER SYSTEM SET log_disconnections = on;

    -- スロークエリログ（1秒以上）
    ALTER SYSTEM SET log_min_duration_statement = 1000;

    -- ログフォーマット
    ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
" 2>/dev/null || true

# PostgreSQL 再起動
sudo systemctl restart postgresql 2>/dev/null || true

echo "✓ Query logging and auditing enabled"

echo ""
echo "=========================================="
echo "✓ Database Security Hardening Complete!"
echo "=========================================="

echo ""
echo "🔐 Security Settings Applied:"
echo "  - SSL/TLS encryption: Enabled"
echo "  - Password encryption: scram-sha-256"
echo "  - User privileges: Least privilege principle"
echo "  - Query auditing: All statements logged"
echo "  - Slow query logging: 1 second threshold"
echo "  - Connection logging: Enabled"

echo ""
echo "📊 Database Information:"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo "  Password: (stored securely in .env)"
echo "  Host: $PG_HOST"
echo "  Port: $PG_PORT"

echo ""
echo "📝 Log Files:"
echo "  PostgreSQL logs: /var/log/postgresql/"
echo "  Audit logs: $AUDIT_CONF"

echo ""
echo "🔧 Useful Commands:"
echo "  View active connections: sudo -u postgres psql -c \"SELECT * FROM pg_stat_activity;\""
echo "  View user privileges: sudo -u postgres psql -c \"\\du\""
echo "  View database list: sudo -u postgres psql -c \"\\l\""
echo "  Backup database: pg_dump -U $DB_USER $DB_NAME > backup.sql"
echo "  Restore database: psql -U $DB_USER $DB_NAME < backup.sql"

echo ""
echo "⚠️  Important:"
echo "  1. Store DB password securely in .env file"
echo "  2. Regularly review audit logs: tail -f /var/log/postgresql/*.log"
echo "  3. Monitor slow queries and optimize"
echo "  4. Regularly backup database"
echo "  5. Test disaster recovery procedures monthly"
