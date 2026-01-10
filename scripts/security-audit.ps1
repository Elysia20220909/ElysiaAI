#!/usr/bin/env pwsh
# 依存関係の脆弱性スキャンスクリプト
# 定期的に実行してセキュリティリスクを検出

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "依存関係の脆弱性スキャン" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logDir = "logs/security"
$logFile = "$logDir/vulnerability-scan-$timestamp.log"

# ログディレクトリを作成
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-Log {
    param($Message, $Color = "White")
    $logMessage = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Write-Host $logMessage -ForegroundColor $Color
    Add-Content -Path $logFile -Value $logMessage
}

Write-Log "脆弱性スキャン開始" "Green"
Write-Log "ログファイル: $logFile" "Gray"
Write-Log ""

# 1. Bun audit
Write-Log "=== Bun Audit ===" "Cyan"
try {
    $bunAuditOutput = bun audit 2>&1
    $bunAuditOutput | Out-File -Append -FilePath $logFile

    if ($LASTEXITCODE -eq 0) {
        Write-Log "✓ Bun audit: 脆弱性なし" "Green"
    }
    else {
        Write-Log "⚠ Bun audit: 脆弱性が検出されました" "Yellow"
        Write-Host $bunAuditOutput -ForegroundColor Yellow
    }
}
catch {
    Write-Log "✗ Bun audit実行エラー: $_" "Red"
}
Write-Log ""

# 2. npm audit (互換性チェック)
Write-Log "=== NPM Audit ===" "Cyan"
try {
    $npmAuditOutput = npm audit --json 2>&1
    $npmAuditOutput | Out-File -Append -FilePath $logFile

    $auditJson = $npmAuditOutput | ConvertFrom-Json
    $vulnerabilities = $auditJson.metadata.vulnerabilities

    if ($vulnerabilities) {
        $total = $vulnerabilities.info + $vulnerabilities.low + $vulnerabilities.moderate + $vulnerabilities.high + $vulnerabilities.critical

        if ($total -eq 0) {
            Write-Log "✓ NPM audit: 脆弱性なし" "Green"
        }
        else {
            Write-Log "⚠ NPM audit: $total 件の脆弱性が検出されました" "Yellow"
            Write-Log "  - Critical: $($vulnerabilities.critical)" $(if ($vulnerabilities.critical -gt 0) { "Red" } else { "Gray" })
            Write-Log "  - High: $($vulnerabilities.high)" $(if ($vulnerabilities.high -gt 0) { "Yellow" } else { "Gray" })
            Write-Log "  - Moderate: $($vulnerabilities.moderate)" "Gray"
            Write-Log "  - Low: $($vulnerabilities.low)" "Gray"
            Write-Log "  - Info: $($vulnerabilities.info)" "Gray"
        }
    }
}
catch {
    Write-Log "✗ NPM audit実行エラー: $_" "Red"
}
Write-Log ""

# 3. パッケージの更新チェック
Write-Log "=== 更新可能なパッケージ ===" "Cyan"
try {
    $outdatedOutput = bun outdated 2>&1
    $outdatedOutput | Out-File -Append -FilePath $logFile

    if ($outdatedOutput -match "All dependencies are up to date") {
        Write-Log "✓ すべての依存関係が最新です" "Green"
    }
    else {
        Write-Log "⚠ 更新可能なパッケージがあります:" "Yellow"
        Write-Host $outdatedOutput -ForegroundColor Gray
    }
}
catch {
    Write-Log "パッケージ更新チェックでエラー: $_" "Yellow"
}
Write-Log ""

# 4. 重要なセキュリティ設定をチェック
Write-Log "=== セキュリティ設定チェック ===" "Cyan"

# .env ファイルの存在確認
if (Test-Path ".env") {
    Write-Log "✓ .env ファイルが存在します" "Green"

    # .gitignore に .env が含まれているか確認
    if (Test-Path ".gitignore") {
        $gitignoreContent = Get-Content ".gitignore" -Raw
        if ($gitignoreContent -match "\.env") {
            Write-Log "✓ .env は .gitignore に含まれています" "Green"
        }
        else {
            Write-Log "✗ .env が .gitignore に含まれていません！" "Red"
        }
    }

    # .env 内のデフォルト値チェック
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "dev-secret|change-in-production|elysia-dev") {
        Write-Log "⚠ .env にデフォルト値が含まれている可能性があります" "Yellow"
    }
    else {
        Write-Log "✓ .env にデフォルト値は検出されませんでした" "Green"
    }
}
else {
    Write-Log "⚠ .env ファイルが見つかりません" "Yellow"
}
Write-Log ""

# 5. セキュリティ関連ファイルの確認
Write-Log "=== セキュリティドキュメント ===" "Cyan"
$securityFiles = @(
    "docs/SECURITY_GUIDELINES.md",
    "SECURITY.md",
    ".github/SECURITY.md"
)

foreach ($file in $securityFiles) {
    if (Test-Path $file) {
        Write-Log "✓ $file が存在します" "Green"
    }
}
Write-Log ""

# 6. Node.js/Bun バージョンチェック
Write-Log "=== ランタイムバージョン ===" "Cyan"
try {
    $bunVersion = bun --version
    Write-Log "Bun: $bunVersion" "Gray"

    $nodeVersion = node --version
    Write-Log "Node.js: $nodeVersion" "Gray"
}
catch {
    Write-Log "バージョン確認エラー: $_" "Yellow"
}
Write-Log ""

# 7. サマリーレポート
Write-Log "=====================================" "Cyan"
Write-Log "スキャン完了" "Green"
Write-Log "=====================================" "Cyan"
Write-Log ""
Write-Log "詳細ログ: $logFile" "Gray"
Write-Log ""

# 脆弱性が検出された場合は終了コード1
if ($bunAuditOutput -match "vulnerabilities" -or $total -gt 0) {
    Write-Log "⚠ 脆弱性が検出されました。対応が必要です。" "Yellow"
    exit 1
}
else {
    Write-Log "✓ 重大な問題は検出されませんでした。" "Green"
    exit 0
}
