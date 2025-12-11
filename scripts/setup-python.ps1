# Python環境セットアップスクリプト（Windows PowerShell）

$ErrorActionPreference = "Stop"

Push-Location (Join-Path $PSScriptRoot "..")

Write-Host "Setting up Python environment..."

# Python 3チェック
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Error: python not found. Please install Python 3.8+" -ForegroundColor Red
    Pop-Location
    exit 1
}

# venv作成
if (-not (Test-Path "python\venv")) {
    Write-Host "Creating virtual environment..."
    python -m venv python\venv
}

# venv有効化とパッケージインストール
Write-Host "Installing Python dependencies..."
& python\venv\Scripts\Activate.ps1

pip install -U pip
pip install -U -r python\requirements.txt

Write-Host "✅ Python environment ready!" -ForegroundColor Green
Write-Host "To activate: python\venv\Scripts\Activate.ps1"

Pop-Location
