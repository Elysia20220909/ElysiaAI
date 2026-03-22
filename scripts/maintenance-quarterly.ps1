#!/usr/bin/env pwsh
# 四半期保守: セキュリティ監査

Write-Host "📅 四半期保守作業開始 (セキュリティ監査)..." -ForegroundColor Cyan
Write-Host ""

# レポートファイルの準備
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportDir = "logs\security-audits"
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

$reportFile = "$reportDir\security-audit-$timestamp.txt"

Write-Host "=== セキュリティ監査レポート ===" | Out-File -FilePath $reportFile
"実行日時: $(Get-Date -Format 'yyyy/MM/dd HH:mm:ss')" | Out-File -FilePath $reportFile -Append
"" | Out-File -FilePath $reportFile -Append

# 1. 機密ファイルのチェック
Write-Host "🔒 1. 機密ファイルの保護状態を確認中..." -ForegroundColor Yellow
Write-Host ""
"=== 1. 機密ファイルの保護状態 ===" | Out-File -FilePath $reportFile -Append

$secureFiles = @(
    ".internal\secure\env\.env",
    ".internal\secure\env\.env.example",
    ".internal\secure\auth\jwt.ts",
    ".internal\secure\auth\redis.ts",
    ".internal\secure\db\index.ts",
    ".internal\app\llm\llm-config.ts"
)

$allSecure = $true
foreach ($file in $secureFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file - 存在確認OK" -ForegroundColor Green
        "✅ $file - 存在確認OK" | Out-File -FilePath $reportFile -Append
    } else {
        Write-Host "  ❌ $file - ファイルが見つかりません" -ForegroundColor Red
        "❌ $file - ファイルが見つかりません" | Out-File -FilePath $reportFile -Append
        $allSecure = $false
    }
}

Write-Host ""

# 2. .gitignoreの確認
Write-Host "🚫 2. .gitignore の設定を確認中..." -ForegroundColor Yellow
Write-Host ""
"=== 2. .gitignore 設定 ===" | Out-File -FilePath $reportFile -Append

if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    $requiredPatterns = @("/.internal/", "*.log", ".env")
    
    foreach ($pattern in $requiredPatterns) {
        if ($gitignoreContent -match [regex]::Escape($pattern)) {
            Write-Host "  ✅ '$pattern' - 除外設定OK" -ForegroundColor Green
            "✅ '$pattern' - 除外設定OK" | Out-File -FilePath $reportFile -Append
        } else {
            Write-Host "  ⚠️  '$pattern' - 除外設定が見つかりません" -ForegroundColor Yellow
            "⚠️ '$pattern' - 除外設定が見つかりません" | Out-File -FilePath $reportFile -Append
            $allSecure = $false
        }
    }
}

Write-Host ""

# 3. Git履歴の機密情報チェック
Write-Host "📜 3. Git履歴の機密情報チェック..." -ForegroundColor Yellow
Write-Host ""
"=== 3. Git履歴の機密情報 ===" | Out-File -FilePath $reportFile -Append

if (Get-Command git -ErrorAction SilentlyContinue) {
    $sensitivePatterns = @("password", "secret", "api_key", "token", "private_key")
    $foundIssues = $false
    
    foreach ($pattern in $sensitivePatterns) {
        $result = git log --all -S $pattern --oneline 2>&1
        if ($result -and $result.Count -gt 0) {
            Write-Host "  ⚠️  '$pattern' がGit履歴に含まれています" -ForegroundColor Yellow
            "⚠️ '$pattern' がGit履歴に含まれています" | Out-File -FilePath $reportFile -Append
            $foundIssues = $true
        }
    }
    
    if (-not $foundIssues) {
        Write-Host "  ✅ 明らかな機密情報は検出されませんでした" -ForegroundColor Green
        "✅ 明らかな機密情報は検出されませんでした" | Out-File -FilePath $reportFile -Append
    }
}

Write-Host ""

# 4. 依存関係のセキュリティ脆弱性
Write-Host "🔍 4. 依存関係のセキュリティ脆弱性チェック..." -ForegroundColor Yellow
Write-Host ""
"=== 4. 依存関係の脆弱性 ===" | Out-File -FilePath $reportFile -Append

if (Get-Command npm -ErrorAction SilentlyContinue) {
    $auditResult = npm audit --json 2>&1
    try {
        $audit = $auditResult | ConvertFrom-Json
        
        $total = $audit.metadata.vulnerabilities.total
        $critical = $audit.metadata.vulnerabilities.critical
        $high = $audit.metadata.vulnerabilities.high
        $moderate = $audit.metadata.vulnerabilities.moderate
        $low = $audit.metadata.vulnerabilities.low
        
        Write-Host "  検出された脆弱性:" -ForegroundColor Gray
        Write-Host "    Critical: $critical" -ForegroundColor $(if ($critical -gt 0) { "Red" } else { "Green" })
        Write-Host "    High: $high" -ForegroundColor $(if ($high -gt 0) { "Yellow" } else { "Green" })
        Write-Host "    Moderate: $moderate" -ForegroundColor Gray
        Write-Host "    Low: $low" -ForegroundColor Gray
        
        "脆弱性: Critical=$critical, High=$high, Moderate=$moderate, Low=$low" | Out-File -FilePath $reportFile -Append
        
        if ($critical -gt 0 -or $high -gt 0) {
            Write-Host "  ⚠️  緊急対応が必要な脆弱性があります" -ForegroundColor Red
            "⚠️ 緊急対応が必要な脆弱性があります" | Out-File -FilePath $reportFile -Append
            $allSecure = $false
        }
    } catch {
        Write-Host "  ℹ️  npm auditの実行に失敗しました" -ForegroundColor Yellow
        "ℹ️ npm auditの実行に失敗しました" | Out-File -FilePath $reportFile -Append
    }
}

Write-Host ""

# 5. ファイルパーミッションチェック (Windows)
Write-Host "🔐 5. 重要ファイルのアクセス権限チェック..." -ForegroundColor Yellow
Write-Host ""
"=== 5. ファイルアクセス権限 ===" | Out-File -FilePath $reportFile -Append

$criticalFiles = @(".internal\secure\env\.env")
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        $acl = Get-Acl $file
        $owner = $acl.Owner
        Write-Host "  ✅ $file - 所有者: $owner" -ForegroundColor Green
        "✅ $file - 所有者: $owner" | Out-File -FilePath $reportFile -Append
    }
}

Write-Host ""

# 6. 環境変数の強度チェック
Write-Host "🔑 6. 環境変数の強度チェック..." -ForegroundColor Yellow
Write-Host ""
"=== 6. 環境変数の強度 ===" | Out-File -FilePath $reportFile -Append

if (Test-Path ".internal\secure\env\.env") {
    $envContent = Get-Content ".internal\secure\env\.env" -Raw
    
    # JWT_SECRETの長さチェック
    if ($envContent -match 'JWT_SECRET=(.+)') {
        $secret = $matches[1].Trim()
        if ($secret.Length -lt 32) {
            Write-Host "  ⚠️  JWT_SECRET が短すぎます (推奨: 32文字以上)" -ForegroundColor Yellow
            "⚠️ JWT_SECRET が短すぎます (推奨: 32文字以上)" | Out-File -FilePath $reportFile -Append
            $allSecure = $false
        } else {
            Write-Host "  ✅ JWT_SECRET の長さは十分です" -ForegroundColor Green
            "✅ JWT_SECRET の長さは十分です" | Out-File -FilePath $reportFile -Append
        }
    }
    
    # デフォルト値のチェック
    $defaultValues = @("dev-secret", "dev-password", "elysia-dev-password")
    foreach ($default in $defaultValues) {
        if ($envContent -match [regex]::Escape($default)) {
            Write-Host "  ❌ デフォルト値 '$default' が使用されています" -ForegroundColor Red
            "❌ デフォルト値 '$default' が使用されています" | Out-File -FilePath $reportFile -Append
            $allSecure = $false
        }
    }
}

Write-Host ""

# 7. ログファイルの機密情報チェック
Write-Host "📝 7. ログファイルの機密情報チェック..." -ForegroundColor Yellow
Write-Host ""
"=== 7. ログファイルの機密情報 ===" | Out-File -FilePath $reportFile -Append

$logFiles = Get-ChildItem -Path "logs" -Filter "*.log" -Recurse -ErrorAction SilentlyContinue
$foundSensitive = $false

foreach ($logFile in $logFiles) {
    $content = Get-Content $logFile.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "(password|secret|token|api_key)[\s:=]+\S+") {
        Write-Host "  ⚠️  $($logFile.Name) に機密情報が含まれている可能性があります" -ForegroundColor Yellow
        "⚠️ $($logFile.Name) に機密情報が含まれている可能性があります" | Out-File -FilePath $reportFile -Append
        $foundSensitive = $true
    }
}

if (-not $foundSensitive) {
    Write-Host "  ✅ ログファイルに明らかな機密情報は見つかりませんでした" -ForegroundColor Green
    "✅ ログファイルに明らかな機密情報は見つかりませんでした" | Out-File -FilePath $reportFile -Append
}

Write-Host ""

# 最終評価
"" | Out-File -FilePath $reportFile -Append
"=== 最終評価 ===" | Out-File -FilePath $reportFile -Append

Write-Host "📊 最終評価:" -ForegroundColor Cyan
if ($allSecure) {
    Write-Host "  ✅ セキュリティ状態: 良好" -ForegroundColor Green
    "セキュリティ状態: 良好" | Out-File -FilePath $reportFile -Append
} else {
    Write-Host "  ⚠️  セキュリティ状態: 改善が必要" -ForegroundColor Yellow
    "セキュリティ状態: 改善が必要" | Out-File -FilePath $reportFile -Append
}

Write-Host ""
Write-Host "✅ 四半期セキュリティ監査が完了しました！" -ForegroundColor Green
Write-Host "📄 詳細レポート: $reportFile" -ForegroundColor Cyan
Write-Host "📊 次回実行: " -NoNewline
Write-Host (Get-Date).AddMonths(3).ToString("yyyy/MM/dd") -ForegroundColor Cyan
