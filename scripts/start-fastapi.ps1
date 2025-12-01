# FastAPI RAGサーバー起動スクリプト（Windows PowerShell）

$ErrorActionPreference = "Stop"

Push-Location (Join-Path $PSScriptRoot "..")

Write-Host "🌸 Starting Elysia FastAPI RAG Server..." -ForegroundColor Magenta

# Python venv有効化
if (Test-Path "python\venv\Scripts\Activate.ps1") {
    & python\venv\Scripts\Activate.ps1
} else {
    Write-Host "⚠️  Virtual environment not found. Run: .\scripts\setup-python.ps1" -ForegroundColor Yellow
    Pop-Location
    exit 1
}

# FastAPIサーバー起動
Push-Location python
python fastapi_server.py
Pop-Location

Pop-Location
