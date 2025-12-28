#!/usr/bin/env pwsh
# Twitter Archive Bulk Delete Tool - Setup Script for PowerShell
# This script sets up the Python environment and dependencies

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Twitter Archive Bulk Delete Tool - Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[✓] Python detected: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "[✗] ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ from https://www.python.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[1/4] Creating virtual environment..." -ForegroundColor Yellow
python -m venv venv
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] ERROR: Failed to create virtual environment" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[2/4] Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

Write-Host "[3/4] Installing dependencies..." -ForegroundColor Yellow
pip install -r python\requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] ERROR: Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[4/4] Checking config/.env file..." -ForegroundColor Yellow
if (-not (Test-Path "config\.env")) {
    Write-Host ""
    Write-Host "⚠️  WARNING: config/.env file not found" -ForegroundColor Yellow
    Write-Host "Please create it and add your Twitter API credentials:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "TWITTER_API_KEY=your-api-key" -ForegroundColor Gray
    Write-Host "TWITTER_API_SECRET_KEY=your-api-secret" -ForegroundColor Gray
    Write-Host "TWITTER_ACCESS_TOKEN=your-access-token" -ForegroundColor Gray
    Write-Host "TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can copy config/.env.example and fill in your credentials." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Ensure config/.env contains your Twitter API credentials"
Write-Host "2. Download your Twitter archive and extract tweets.js"
Write-Host "3. Run: python python\delete_tweets_from_archive.py tweets.js"
Write-Host ""
Write-Host "To activate the virtual environment in the future, run:" -ForegroundColor Cyan
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
