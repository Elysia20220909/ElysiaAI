#!/usr/bin/env pwsh
# 負荷テストスクリプト
# APIエンドポイントのパフォーマンステスト

param(
    [string]$BaseUrl = "http://localhost:3000",
    [int]$Connections = 50,
    [int]$Duration = 30,
    [string]$Endpoint = "/elysia-love",
    [switch]$Report
)

$ErrorActionPreference = "Stop"

Write-Host "🔥 負荷テスト開始" -ForegroundColor Cyan
Write-Host ""
Write-Host "設定:" -ForegroundColor Yellow
Write-Host "  URL: $BaseUrl$Endpoint" -ForegroundColor Gray
Write-Host "  同時接続数: $Connections" -ForegroundColor Gray
Write-Host "  テスト時間: $Duration 秒" -ForegroundColor Gray
Write-Host ""

# autocannonのインストール確認
$autocannonInstalled = Get-Command autocannon -ErrorAction SilentlyContinue

if (-not $autocannonInstalled) {
    Write-Host "⚠️  autocannon がインストールされていません" -ForegroundColor Yellow
    Write-Host "インストール中..." -ForegroundColor Cyan
    npm install -g autocannon
}

# テンポラリファイルの作成
$tempDir = Join-Path $PSScriptRoot ".." "temp"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

$resultFile = Join-Path $tempDir "loadtest_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"

# 負荷テストの実行
Write-Host "🚀 テスト実行中..." -ForegroundColor Cyan
Write-Host ""

$body = @{
    message = "Hello, Elysia!"
    userName = "LoadTest"
} | ConvertTo-Json

# autocannonコマンド構築
$command = "autocannon"
$arguments = @(
    "-c", $Connections,
    "-d", $Duration,
    "-m", "POST",
    "-H", "Content-Type: application/json",
    "-b", "'$body'",
    "-j",  # JSON output
    "$BaseUrl$Endpoint"
)

try {
    # テスト実行
    $result = & $command $arguments 2>&1 | Out-String
    
    # 結果をファイルに保存
    $result | Set-Content -Path $resultFile
    
    # 結果のパース（簡易版）
    Write-Host ""
    Write-Host "📊 テスト結果:" -ForegroundColor Cyan
    Write-Host ""
    
    # JSONをパース
    $jsonResult = $result | ConvertFrom-Json
    
    Write-Host "リクエスト統計:" -ForegroundColor Yellow
    Write-Host "  総リクエスト数:     $($jsonResult.requests.total)" -ForegroundColor Gray
    Write-Host "  成功:               $($jsonResult.requests.sent)" -ForegroundColor Green
    Write-Host "  失敗:               $($jsonResult.errors)" -ForegroundColor $(if ($jsonResult.errors -gt 0) { "Red" } else { "Gray" })
    Write-Host "  スループット:       $([math]::Round($jsonResult.requests.average, 2)) req/s" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "レイテンシ:" -ForegroundColor Yellow
    Write-Host "  平均:               $($jsonResult.latency.mean) ms" -ForegroundColor Gray
    Write-Host "  中央値:             $($jsonResult.latency.median) ms" -ForegroundColor Gray
    Write-Host "  P95:                $($jsonResult.latency.p95) ms" -ForegroundColor Gray
    Write-Host "  P99:                $($jsonResult.latency.p99) ms" -ForegroundColor Gray
    Write-Host "  最大:               $($jsonResult.latency.max) ms" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "スループット:" -ForegroundColor Yellow
    Write-Host "  平均:               $([math]::Round($jsonResult.throughput.mean / 1024 / 1024, 2)) MB/s" -ForegroundColor Gray
    Write-Host "  合計:               $([math]::Round($jsonResult.throughput.total / 1024 / 1024, 2)) MB" -ForegroundColor Gray
    
    # エラー率の計算
    $errorRate = if ($jsonResult.requests.total -gt 0) {
        [math]::Round(($jsonResult.errors / $jsonResult.requests.total) * 100, 2)
    } else {
        0
    }
    
    Write-Host ""
    Write-Host "品質指標:" -ForegroundColor Yellow
    Write-Host "  エラー率:           $errorRate%" -ForegroundColor $(if ($errorRate -gt 1) { "Red" } elseif ($errorRate -gt 0.1) { "Yellow" } else { "Green" })
    Write-Host "  可用性:             $([math]::Round((1 - $errorRate / 100) * 100, 2))%" -ForegroundColor Gray
    
    # レポート生成
    if ($Report) {
        Write-Host ""
        Write-Host "📄 HTMLレポート生成中..." -ForegroundColor Cyan
        
        $htmlReport = Join-Path $tempDir "loadtest_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').html"
        
        $html = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>負荷テストレポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f9f9f9; border-left: 4px solid #4CAF50; }
        .metric-title { font-weight: bold; color: #666; }
        .metric-value { font-size: 24px; color: #333; }
        .error { border-left-color: #f44336; }
        .warning { border-left-color: #ff9800; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔥 負荷テストレポート</h1>
        <p>実行日時: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
        <p>エンドポイント: $BaseUrl$Endpoint</p>
        <p>同時接続数: $Connections | テスト時間: $Duration 秒</p>
        
        <h2>リクエスト統計</h2>
        <div class="metric">
            <div class="metric-title">総リクエスト数</div>
            <div class="metric-value">$($jsonResult.requests.total)</div>
        </div>
        <div class="metric">
            <div class="metric-title">スループット</div>
            <div class="metric-value">$([math]::Round($jsonResult.requests.average, 2)) req/s</div>
        </div>
        <div class="metric $(if ($errorRate -gt 1) { 'error' } elseif ($errorRate -gt 0.1) { 'warning' })">
            <div class="metric-title">エラー率</div>
            <div class="metric-value">$errorRate%</div>
        </div>
        
        <h2>レイテンシ</h2>
        <div class="metric">
            <div class="metric-title">平均</div>
            <div class="metric-value">$($jsonResult.latency.mean) ms</div>
        </div>
        <div class="metric">
            <div class="metric-title">P95</div>
            <div class="metric-value">$($jsonResult.latency.p95) ms</div>
        </div>
        <div class="metric">
            <div class="metric-title">P99</div>
            <div class="metric-value">$($jsonResult.latency.p99) ms</div>
        </div>
        <div class="metric">
            <div class="metric-title">最大</div>
            <div class="metric-value">$($jsonResult.latency.max) ms</div>
        </div>
    </div>
</body>
</html>
"@
        
        $html | Set-Content -Path $htmlReport -Encoding UTF8
        Write-Host "  ✅ レポート作成完了: $htmlReport" -ForegroundColor Green
        
        # レポートを開く
        Start-Process $htmlReport
    }
    
    Write-Host ""
    Write-Host "✅ テスト完了" -ForegroundColor Green
    Write-Host "📁 詳細結果: $resultFile" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ テスト失敗: $_" -ForegroundColor Red
    exit 1
}
