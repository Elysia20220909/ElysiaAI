# Elysia AI - サービス状態確認スクリプト

Write-Host "=== Elysia AI サービス状態確認 ===" -ForegroundColor Cyan
Write-Host ""

# Redis確認
Write-Host "📦 Redis (レート制限・キャッシング)" -ForegroundColor Yellow
$redisProcess = Get-Process redis-server -ErrorAction SilentlyContinue
if ($redisProcess) {
    Write-Host "  ✅ 起動中 (PID: $($redisProcess.Id))" -ForegroundColor Green
    Write-Host "  ポート: 6379" -ForegroundColor Gray

    # 接続テスト
    try {
        $redisTest = redis-cli ping 2>$null
        if ($redisTest -eq "PONG") {
            Write-Host "  ✅ 接続成功" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ⚠️  接続テスト失敗" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ 停止中" -ForegroundColor Red
    Write-Host "  起動方法: .\scripts\start-all-services.ps1 -Redis" -ForegroundColor Gray
}
Write-Host ""

# Ollama確認
Write-Host "🤖 Ollama (LLM推論エンジン)" -ForegroundColor Yellow
$ollamaProcess = Get-Process ollama -ErrorAction SilentlyContinue
if ($ollamaProcess) {
    Write-Host "  ✅ 起動中 (PID: $($ollamaProcess.Id))" -ForegroundColor Green
    Write-Host "  ポート: 11434" -ForegroundColor Gray

    # APIテスト
    try {
        $ollamaTest = curl -s http://localhost:11434/api/tags 2>$null
        if ($ollamaTest) {
            Write-Host "  ✅ API応答正常" -ForegroundColor Green

            # モデル一覧
            $models = ollama list 2>$null
            if ($models) {
                Write-Host "  インストール済みモデル:" -ForegroundColor Gray
                $models | Select-Object -Skip 1 | ForEach-Object {
                    Write-Host "    - $_" -ForegroundColor Gray
                }
            }
        }
    } catch {
        Write-Host "  ⚠️  API応答なし" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ 停止中" -ForegroundColor Red
    Write-Host "  起動方法: .\scripts\start-all-services.ps1 -Ollama" -ForegroundColor Gray
}
Write-Host ""

# FastAPI確認
Write-Host "🐍 FastAPI (RAGサービス)" -ForegroundColor Yellow
$fastapiPort = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($fastapiPort) {
    Write-Host "  ✅ 起動中 (ポート: 8000)" -ForegroundColor Green

    # ヘルスチェック
    try {
        $fastapiTest = curl -s http://localhost:8000/health 2>$null
        if ($fastapiTest) {
            Write-Host "  ✅ ヘルスチェック成功" -ForegroundColor Green
            Write-Host "  API仕様: http://localhost:8000/docs" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ⚠️  ヘルスチェック失敗" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ 停止中" -ForegroundColor Red
    Write-Host "  起動方法: .\scripts\start-all-services.ps1 -FastAPI" -ForegroundColor Gray
}
Write-Host ""

# Elysiaサーバー確認
Write-Host "🚀 Elysia Server (メインアプリ)" -ForegroundColor Yellow
$elysiaPort = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($elysiaPort) {
    Write-Host "  ✅ 起動中 (ポート: 3000)" -ForegroundColor Green
    Write-Host "  URL: http://localhost:3000" -ForegroundColor Gray
    Write-Host "  Swagger: http://localhost:3000/swagger" -ForegroundColor Gray
    Write-Host "  管理画面: http://localhost:3000/admin-extended.html" -ForegroundColor Gray
} else {
    Write-Host "  ❌ 停止中" -ForegroundColor Red
    Write-Host "  起動方法: bun run dev" -ForegroundColor Gray
}
Write-Host ""

# サマリー
Write-Host "=== 起動推奨度 ===" -ForegroundColor Cyan
Write-Host "  🔴 必須: Elysia Server" -ForegroundColor Red
Write-Host "  🟡 推奨: Ollama (AI機能)" -ForegroundColor Yellow
Write-Host "  🟢 任意: Redis (レート制限), FastAPI (RAG)" -ForegroundColor Green
Write-Host ""

# 起動コマンド
Write-Host "=== 起動コマンド ===" -ForegroundColor Cyan
Write-Host "  全サービス起動: .\scripts\start-all-services.ps1 -All" -ForegroundColor Gray
Write-Host "  Elysiaサーバー: bun run dev" -ForegroundColor Gray
Write-Host ""
