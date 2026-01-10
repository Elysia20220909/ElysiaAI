#!/bin/bash
# 依存関係の脆弱性スキャンスクリプト（Linux/Mac用）

set -e

echo "====================================="
echo "依存関係の脆弱性スキャン"
echo "====================================="
echo ""

timestamp=$(date +"%Y-%m-%d_%H-%M-%S")
log_dir="logs/security"
log_file="$log_dir/vulnerability-scan-$timestamp.log"

# ログディレクトリを作成
mkdir -p "$log_dir"

log_message() {
    local message="$1"
    local color="${2:-normal}"
    local log_line="[$(date +'%Y-%m-%d %H:%M:%S')] $message"

    case "$color" in
        red) echo -e "\033[0;31m$log_line\033[0m" ;;
        green) echo -e "\033[0;32m$log_line\033[0m" ;;
        yellow) echo -e "\033[0;33m$log_line\033[0m" ;;
        cyan) echo -e "\033[0;36m$log_line\033[0m" ;;
        *) echo "$log_line" ;;
    esac

    echo "$log_line" >> "$log_file"
}

log_message "脆弱性スキャン開始" "green"
log_message "ログファイル: $log_file"
echo ""

# 1. Bun audit
log_message "=== Bun Audit ===" "cyan"
if command -v bun &> /dev/null; then
    if bun audit >> "$log_file" 2>&1; then
        log_message "✓ Bun audit: 脆弱性なし" "green"
    else
        log_message "⚠ Bun audit: 脆弱性が検出されました" "yellow"
        bun audit
    fi
else
    log_message "Bun がインストールされていません" "yellow"
fi
echo ""

# 2. npm audit
log_message "=== NPM Audit ===" "cyan"
if command -v npm &> /dev/null; then
    npm_audit_output=$(npm audit --json 2>&1 || true)
    echo "$npm_audit_output" >> "$log_file"

    critical=$(echo "$npm_audit_output" | grep -o '"critical":[0-9]*' | cut -d':' -f2 || echo "0")
    high=$(echo "$npm_audit_output" | grep -o '"high":[0-9]*' | cut -d':' -f2 || echo "0")
    moderate=$(echo "$npm_audit_output" | grep -o '"moderate":[0-9]*' | cut -d':' -f2 || echo "0")
    low=$(echo "$npm_audit_output" | grep -o '"low":[0-9]*' | cut -d':' -f2 || echo "0")

    total=$((critical + high + moderate + low))

    if [ "$total" -eq 0 ]; then
        log_message "✓ NPM audit: 脆弱性なし" "green"
    else
        log_message "⚠ NPM audit: $total 件の脆弱性が検出されました" "yellow"
        [ "$critical" -gt 0 ] && log_message "  - Critical: $critical" "red"
        [ "$high" -gt 0 ] && log_message "  - High: $high" "yellow"
        [ "$moderate" -gt 0 ] && log_message "  - Moderate: $moderate"
        [ "$low" -gt 0 ] && log_message "  - Low: $low"
    fi
else
    log_message "npm がインストールされていません" "yellow"
fi
echo ""

# 3. パッケージの更新チェック
log_message "=== 更新可能なパッケージ ===" "cyan"
if command -v bun &> /dev/null; then
    outdated_output=$(bun outdated 2>&1 || true)
    echo "$outdated_output" >> "$log_file"

    if echo "$outdated_output" | grep -q "All dependencies are up to date"; then
        log_message "✓ すべての依存関係が最新です" "green"
    else
        log_message "⚠ 更新可能なパッケージがあります:" "yellow"
        echo "$outdated_output"
    fi
fi
echo ""

# 4. セキュリティ設定チェック
log_message "=== セキュリティ設定チェック ===" "cyan"

if [ -f ".env" ]; then
    log_message "✓ .env ファイルが存在します" "green"

    if [ -f ".gitignore" ] && grep -q "\.env" ".gitignore"; then
        log_message "✓ .env は .gitignore に含まれています" "green"
    else
        log_message "✗ .env が .gitignore に含まれていません！" "red"
    fi

    if grep -qE "dev-secret|change-in-production|elysia-dev" ".env"; then
        log_message "⚠ .env にデフォルト値が含まれている可能性があります" "yellow"
    else
        log_message "✓ .env にデフォルト値は検出されませんでした" "green"
    fi
else
    log_message "⚠ .env ファイルが見つかりません" "yellow"
fi
echo ""

# 5. セキュリティドキュメント
log_message "=== セキュリティドキュメント ===" "cyan"
security_files=("docs/SECURITY_GUIDELINES.md" "SECURITY.md" ".github/SECURITY.md")
for file in "${security_files[@]}"; do
    if [ -f "$file" ]; then
        log_message "✓ $file が存在します" "green"
    fi
done
echo ""

# 6. ランタイムバージョン
log_message "=== ランタイムバージョン ===" "cyan"
if command -v bun &> /dev/null; then
    bun_version=$(bun --version)
    log_message "Bun: $bun_version"
fi

if command -v node &> /dev/null; then
    node_version=$(node --version)
    log_message "Node.js: $node_version"
fi
echo ""

# サマリー
log_message "=====================================" "cyan"
log_message "スキャン完了" "green"
log_message "=====================================" "cyan"
echo ""
log_message "詳細ログ: $log_file"
echo ""

if [ "${total:-0}" -gt 0 ]; then
    log_message "⚠ 脆弱性が検出されました。対応が必要です。" "yellow"
    exit 1
else
    log_message "✓ 重大な問題は検出されませんでした。" "green"
    exit 0
fi
