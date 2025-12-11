$ErrorActionPreference = 'Stop'

Write-Host "🖥️  Setting up Desktop App..." -ForegroundColor Cyan

Set-Location (Join-Path $PSScriptRoot '..' 'desktop')

if (Get-Command bun -ErrorAction SilentlyContinue) {
    bun install
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    npm install
} else {
    Write-Error "Neither bun nor npm found"
    exit 1
}

Write-Host "✅ Desktop app ready!" -ForegroundColor Green
Write-Host ""
Write-Host "To run: cd desktop && npm start"
