# Docker Compose Quick Start
# 全サービスを1コマンドで起動

$ErrorActionPreference = "Stop"

Write-Host "🐳 Docker Compose 環境を起動中..." -ForegroundColor Cyan

# Dockerが起動しているか確認
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "❌ Dockerが起動していません。Docker Desktopを起動してください。" -ForegroundColor Red
    exit 1
}

# Docker Composeでサービス起動
Write-Host "📦 コンテナを起動中..." -ForegroundColor Yellow
docker-compose up -d

# 起動確認
Start-Sleep -Seconds 5

Write-Host "`n✅ Docker Compose 起動完了!" -ForegroundColor Green
Write-Host "`n🚀 起動したサービス:" -ForegroundColor Cyan
Write-Host "   - Redis: http://localhost:6379" -ForegroundColor White
Write-Host "   - Ollama: http://localhost:11434" -ForegroundColor White
Write-Host "   - FastAPI: http://localhost:8000" -ForegroundColor White
Write-Host "   - VOICEVOX: http://localhost:50021" -ForegroundColor White

Write-Host "`n💡 Elysiaサーバー起動方法:" -ForegroundColor Cyan
Write-Host "   bun run dev" -ForegroundColor White

Write-Host "`n📋 コンテナ管理:" -ForegroundColor Cyan
Write-Host "   確認: docker-compose ps" -ForegroundColor White
Write-Host "   ログ: docker-compose logs -f" -ForegroundColor White
Write-Host "   停止: docker-compose down" -ForegroundColor White
Write-Host "   再起動: docker-compose restart" -ForegroundColor White

# コンテナ状態表示
Write-Host "`n📊 現在の状態:" -ForegroundColor Cyan
docker-compose ps
