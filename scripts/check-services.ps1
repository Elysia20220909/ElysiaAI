# Elysia AI - サービス状態確認スクリプト (Robust Edition)

Write-Host "=== Elysia AI サービス状態確認 ===" -ForegroundColor Cyan
Write-Host ""

# Redis確認
Write-Host "📦 Redis (レート制限・キャッシング)" -ForegroundColor Yellow
$redisProcess = Get-Process redis-server -ErrorAction SilentlyContinue
if ($redisProcess) {
    Write-Host "  ✅ 起動中 (PID: $($redisProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "  ❌ 停止中" -ForegroundColor Red
}
Write-Host ""

# Ollama確認
Write-Host "🤖 Ollama (LLM推論エンジン)" -ForegroundColor Yellow
$ollamaProcess = Get-Process ollama -ErrorAction SilentlyContinue
if ($ollamaProcess) {
    Write-Host "  ✅ 起動中 (PID: $($ollamaProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "  ❌ 停止中" -ForegroundColor Red
}
Write-Host ""

# FastAPI確認
Write-Host "🐍 FastAPI (RAGサービス)" -ForegroundColor Yellow
$fastapiPort = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($fastapiPort) {
    Write-Host "  ✅ 起動中 (ポート: 8000)" -ForegroundColor Green
} else {
    Write-Host "  ❌ 停止中" -ForegroundColor Red
}
Write-Host ""

# Elysiaサーバー確認
Write-Host "🚀 Elysia Server (メインアプリ)" -ForegroundColor Yellow
$elysiaPort = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($elysiaPort) {
    Write-Host "  ✅ 起動中 (ポート: 3000)" -ForegroundColor Green
} else {
    Write-Host "  ❌ 停止中" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== 監査完了 ===" -ForegroundColor Cyan
