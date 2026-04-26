#!/usr/bin/env pwsh
# 月次保守: 依存関係の更新確認

Write-Host "📅 月次保守作業開始..." -ForegroundColor Cyan
Write-Host ""

# 現在の依存関係バージョンを記録
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportDir = "logs\maintenance-reports"
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

$reportFile = "$reportDir\dependencies-$timestamp.txt"

Write-Host "📦 現在の依存関係を確認中..." -ForegroundColor Cyan
Write-Host ""

# Node.js依存関係の確認
Write-Host "=== Bun / Node.js 依存関係 ===" | Out-File -FilePath $reportFile
Write-Host ""
Write-Host "🔍 Bun依存関係チェック..." -ForegroundColor Yellow

if (Get-Command bun -ErrorAction SilentlyContinue) {
    $bunVersion = bun --version
    Write-Host "  Bunバージョン: $bunVersion" -ForegroundColor Gray
    "Bun: $bunVersion" | Out-File -FilePath $reportFile -Append
    
    Write-Host "  outdatedパッケージを確認中..." -ForegroundColor Gray
    $outdated = bun outdated 2>&1
    $outdated | Out-File -FilePath $reportFile -Append
    
    if ($outdated -match "up to date") {
        Write-Host "  ✅ すべてのパッケージは最新です" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  更新可能なパッケージがあります" -ForegroundColor Yellow
        Write-Host "  詳細: bun outdated" -ForegroundColor Gray
    }
}

Write-Host ""

# Python依存関係の確認
Write-Host "=== Python 依存関係 ===" | Out-File -FilePath $reportFile -Append
Write-Host ""
Write-Host "🔍 Python依存関係チェック..." -ForegroundColor Yellow

if (Test-Path ".venv\Scripts\Activate.ps1") {
    & .venv\Scripts\Activate.ps1
    
    if (Get-Command pip -ErrorAction SilentlyContinue) {
        $pythonVersion = python --version 2>&1
        Write-Host "  Pythonバージョン: $pythonVersion" -ForegroundColor Gray
        "Python: $pythonVersion" | Out-File -FilePath $reportFile -Append
        
        Write-Host "  outdatedパッケージを確認中..." -ForegroundColor Gray
        $pipOutdated = pip list --outdated 2>&1
        $pipOutdated | Out-File -FilePath $reportFile -Append
        
        if ($pipOutdated -match "Package" -and $pipOutdated.Count -gt 2) {
            Write-Host "  ⚠️  更新可能なパッケージがあります" -ForegroundColor Yellow
            Write-Host "  詳細: pip list --outdated" -ForegroundColor Gray
        } else {
            Write-Host "  ✅ すべてのパッケージは最新です" -ForegroundColor Green
        }
    }
    
    deactivate 2>$null
}

Write-Host ""

# セキュリティ脆弱性チェック
Write-Host "=== セキュリティチェック ===" | Out-File -FilePath $reportFile -Append
Write-Host ""
Write-Host "🔒 セキュリティ脆弱性チェック..." -ForegroundColor Yellow

if (Get-Command bun -ErrorAction SilentlyContinue) {
    Write-Host "  npm auditを実行中..." -ForegroundColor Gray
    $audit = npm audit --json 2>&1 | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($audit.metadata.vulnerabilities.total -eq 0) {
        Write-Host "  ✅ 脆弱性は検出されませんでした" -ForegroundColor Green
        "npm audit: 脆弱性なし" | Out-File -FilePath $reportFile -Append
    } else {
        $critical = $audit.metadata.vulnerabilities.critical
        $high = $audit.metadata.vulnerabilities.high
        Write-Host "  ⚠️  脆弱性が検出されました" -ForegroundColor Red
        Write-Host "    Critical: $critical" -ForegroundColor Red
        Write-Host "    High: $high" -ForegroundColor Yellow
        "npm audit: Critical=$critical, High=$high" | Out-File -FilePath $reportFile -Append
        Write-Host "  修復: npm audit fix" -ForegroundColor Gray
    }
}

Write-Host ""

# ディスク使用量チェック
Write-Host "=== ディスク使用量 ===" | Out-File -FilePath $reportFile -Append
Write-Host ""
Write-Host "💾 プロジェクトサイズを確認中..." -ForegroundColor Yellow

$projectSize = (Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.DirectoryName -notlike "*node_modules*" } |
    Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host "  プロジェクトサイズ: $([math]::Round($projectSize, 2)) MB" -ForegroundColor Gray
"プロジェクトサイズ: $([math]::Round($projectSize, 2)) MB" | Out-File -FilePath $reportFile -Append

if (Test-Path "node_modules") {
    $nodeModulesSize = (Get-ChildItem -Path "node_modules" -Recurse -File -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  node_modules: $([math]::Round($nodeModulesSize, 2)) MB" -ForegroundColor Gray
    "node_modules: $([math]::Round($nodeModulesSize, 2)) MB" | Out-File -FilePath $reportFile -Append
}

Write-Host ""

# 推奨アクション
Write-Host "=== 推奨アクション ===" | Out-File -FilePath $reportFile -Append
Write-Host ""
Write-Host "📝 推奨アクション:" -ForegroundColor Cyan

$actions = @(
    "bun update - 依存関係の更新",
    "pip install --upgrade -r python/requirements.txt - Python依存関係の更新",
    "npm audit fix - セキュリティ脆弱性の自動修正",
    "bun run build - ビルド確認",
    "bun test - テスト実行"
)

foreach ($action in $actions) {
    Write-Host "  • $action" -ForegroundColor Gray
    $action | Out-File -FilePath $reportFile -Append
}

Write-Host ""
Write-Host "✅ 月次保守作業が完了しました！" -ForegroundColor Green
Write-Host "📄 レポート: $reportFile" -ForegroundColor Cyan
Write-Host "📊 次回実行: " -NoNewline
Write-Host (Get-Date).AddMonths(1).ToString("yyyy/MM/dd") -ForegroundColor Cyan
