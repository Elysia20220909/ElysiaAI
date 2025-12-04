# Elysia AI - All Services Startup Script
# このスクリプトはRedis、Ollama、FastAPIを個別に起動します

param(
    [switch]$Redis,
    [switch]$Ollama,
    [switch]$FastAPI,
    [switch]$All
)

Write-Host "=== Elysia AI サービス起動スクリプト ===" -ForegroundColor Cyan
Write-Host ""

# Redis起動関数
function Start-RedisService {
    Write-Host "📦 Redisサービスを確認中..." -ForegroundColor Yellow

    # Redisがインストールされているか確認
    $redisInstalled = Get-Command redis-server -ErrorAction SilentlyContinue

    if ($redisInstalled) {
        Write-Host "✅ Redis がインストールされています" -ForegroundColor Green

        # 既に起動しているか確認
        $redisProcess = Get-Process redis-server -ErrorAction SilentlyContinue

        if ($redisProcess) {
            Write-Host "ℹ️  Redis は既に起動しています (PID: $($redisProcess.Id))" -ForegroundColor Cyan
        } else {
            Write-Host "🚀 Redis を起動中..." -ForegroundColor Green
            Start-Process redis-server -WindowStyle Hidden
            Start-Sleep -Seconds 2

            $redisProcess = Get-Process redis-server -ErrorAction SilentlyContinue
            if ($redisProcess) {
                Write-Host "✅ Redis が起動しました (PID: $($redisProcess.Id))" -ForegroundColor Green
                Write-Host "   ポート: 6379" -ForegroundColor Gray
                Write-Host "   機能: レート制限、キャッシング" -ForegroundColor Gray
            } else {
                Write-Host "❌ Redis の起動に失敗しました" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "⚠️  Redis がインストールされていません" -ForegroundColor Yellow
        Write-Host "   インストール方法:" -ForegroundColor Gray
        Write-Host "   1. WSL2を使用: wsl sudo apt-get install redis-server" -ForegroundColor Gray
        Write-Host "   2. または: https://github.com/microsoftarchive/redis/releases からダウンロード" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   ※ Redisなしでもアプリは動作しますが、レート制限機能は無効化されます" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Ollama起動関数
function Start-OllamaService {
    Write-Host "🤖 Ollamaサービスを確認中..." -ForegroundColor Yellow

    # Ollamaがインストールされているか確認
    $ollamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue

    if ($ollamaInstalled) {
        Write-Host "✅ Ollama がインストールされています" -ForegroundColor Green

        # 既に起動しているか確認
        $ollamaProcess = Get-Process ollama -ErrorAction SilentlyContinue

        if ($ollamaProcess) {
            Write-Host "ℹ️  Ollama は既に起動しています (PID: $($ollamaProcess.Id))" -ForegroundColor Cyan
        } else {
            Write-Host "🚀 Ollama を起動中..." -ForegroundColor Green
            Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
            Start-Sleep -Seconds 3

            $ollamaProcess = Get-Process ollama -ErrorAction SilentlyContinue
            if ($ollamaProcess) {
                Write-Host "✅ Ollama が起動しました (PID: $($ollamaProcess.Id))" -ForegroundColor Green
                Write-Host "   ポート: 11434" -ForegroundColor Gray
                Write-Host "   機能: LLM推論エンジン" -ForegroundColor Gray

                # モデルの確認
                Write-Host "   モデル確認中..." -ForegroundColor Gray
                Start-Sleep -Seconds 2
                $models = ollama list 2>$null
                if ($models) {
                    Write-Host "   インストール済みモデル:" -ForegroundColor Gray
                    $models | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
                } else {
                    Write-Host "   ⚠️  モデルがインストールされていません" -ForegroundColor Yellow
                    Write-Host "   推奨: ollama pull llama3.2" -ForegroundColor Gray
                }
            } else {
                Write-Host "❌ Ollama の起動に失敗しました" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "⚠️  Ollama がインストールされていません" -ForegroundColor Yellow
        Write-Host "   インストール方法:" -ForegroundColor Gray
        Write-Host "   1. https://ollama.ai/download からダウンロード" -ForegroundColor Gray
        Write-Host "   2. インストール後: ollama pull llama3.2" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   ※ Ollamaなしでもアプリは動作しますが、AI機能は使用できません" -ForegroundColor Yellow
    }
    Write-Host ""
}

# FastAPI起動関数
function Start-FastAPIService {
    Write-Host "🐍 FastAPI RAGサービスを確認中..." -ForegroundColor Yellow

    # Pythonがインストールされているか確認
    $pythonInstalled = Get-Command python -ErrorAction SilentlyContinue

    if ($pythonInstalled) {
        Write-Host "✅ Python がインストールされています" -ForegroundColor Green

        # FastAPIが起動しているか確認 (ポート8000)
        $port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue

        if ($port8000) {
            Write-Host "ℹ️  FastAPI は既に起動しています (ポート 8000)" -ForegroundColor Cyan
        } else {
            Write-Host "🚀 FastAPI を起動中..." -ForegroundColor Green

            # requirements.txtの確認
            $requirementsPath = Join-Path $PSScriptRoot "..\python\requirements.txt"
            if (Test-Path $requirementsPath) {
                Write-Host "   依存関係をインストール中..." -ForegroundColor Gray
                python -m pip install -r $requirementsPath --quiet
            }

            # FastAPIを起動
            $fastapiPath = Join-Path $PSScriptRoot "..\python\fastapi_server.py"
            if (Test-Path $fastapiPath) {
                Start-Process python -ArgumentList $fastapiPath -WindowStyle Hidden
                Start-Sleep -Seconds 5

                # 起動確認
                $port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
                if ($port8000) {
                    Write-Host "✅ FastAPI が起動しました" -ForegroundColor Green
                    Write-Host "   URL: http://localhost:8000" -ForegroundColor Gray
                    Write-Host "   機能: RAG (検索拡張生成)" -ForegroundColor Gray
                    Write-Host "   ドキュメント: http://localhost:8000/docs" -ForegroundColor Gray
                } else {
                    Write-Host "❌ FastAPI の起動に失敗しました" -ForegroundColor Red
                    Write-Host "   手動起動: python python/fastapi_server.py" -ForegroundColor Gray
                }
            } else {
                Write-Host "❌ fastapi_server.py が見つかりません" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "⚠️  Python がインストールされていません" -ForegroundColor Yellow
        Write-Host "   インストール方法: https://www.python.org/downloads/" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   ※ FastAPIなしでもアプリは動作しますが、RAG機能は使用できません" -ForegroundColor Yellow
    }
    Write-Host ""
}

# サービス起動状況サマリー
function Show-ServiceStatus {
    Write-Host "=== サービス起動状況 ===" -ForegroundColor Cyan
    Write-Host ""

    # Redis
    $redisRunning = Get-Process redis-server -ErrorAction SilentlyContinue
    if ($redisRunning) {
        Write-Host "✅ Redis        : 起動中 (ポート 6379)" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis        : 停止中" -ForegroundColor Red
    }

    # Ollama
    $ollamaRunning = Get-Process ollama -ErrorAction SilentlyContinue
    if ($ollamaRunning) {
        Write-Host "✅ Ollama       : 起動中 (ポート 11434)" -ForegroundColor Green
    } else {
        Write-Host "❌ Ollama       : 停止中" -ForegroundColor Red
    }

    # FastAPI
    $fastapiRunning = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    if ($fastapiRunning) {
        Write-Host "✅ FastAPI      : 起動中 (ポート 8000)" -ForegroundColor Green
    } else {
        Write-Host "❌ FastAPI      : 停止中" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "次のステップ:" -ForegroundColor Yellow
    Write-Host "  bun run dev    # Elysiaサーバーを起動" -ForegroundColor Gray
    Write-Host ""
}

# メイン処理
if ($All) {
    Start-RedisService
    Start-OllamaService
    Start-FastAPIService
    Show-ServiceStatus
} else {
    if ($Redis) { Start-RedisService }
    if ($Ollama) { Start-OllamaService }
    if ($FastAPI) { Start-FastAPIService }

    if (-not ($Redis -or $Ollama -or $FastAPI)) {
        Write-Host "使用方法:" -ForegroundColor Yellow
        Write-Host "  .\scripts\start-all-services.ps1 -All         # 全サービス起動" -ForegroundColor Gray
        Write-Host "  .\scripts\start-all-services.ps1 -Redis       # Redisのみ起動" -ForegroundColor Gray
        Write-Host "  .\scripts\start-all-services.ps1 -Ollama      # Ollamaのみ起動" -ForegroundColor Gray
        Write-Host "  .\scripts\start-all-services.ps1 -FastAPI     # FastAPIのみ起動" -ForegroundColor Gray
        Write-Host ""
        Write-Host "または個別のスクリプトを使用:" -ForegroundColor Yellow
        Write-Host "  .\scripts\start-fastapi.ps1" -ForegroundColor Gray
        Write-Host ""
    }

    Show-ServiceStatus
}
