#!/usr/bin/env pwsh
# Elysia AI - All Platforms Development Launcher
# Web + Desktop (Electron + Tauri) + Mobile を統合起動

$ErrorActionPreference = "Continue"

Write-Host "🌸 Elysia AI - All Platforms Launcher 🌸" -ForegroundColor Magenta
Write-Host ""

# 1. Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Cyan

$checks = @{
    "Node.js" = { node --version }
    "Bun"     = { bun --version }
    "Python"  = { python --version }
    "Rust"    = { rustc --version }
}

foreach ($tool in $checks.Keys) {
    try {
        $version = & $checks[$tool] 2>$null
        Write-Host "  ✓ $tool : $version" -ForegroundColor Green
    }
    catch {
        Write-Host "  ✗ $tool : Not found" -ForegroundColor Yellow
    }
}

Write-Host ""

# 2. Start backend services
Write-Host "🚀 Starting backend services..." -ForegroundColor Cyan

# FastAPI server
Write-Host "  Starting FastAPI (Python)..." -ForegroundColor Gray
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd python; python fastapi_server.py" -WindowStyle Normal

Start-Sleep -Seconds 2

# Elysia main server
Write-Host "  Starting Elysia Server (Bun)..." -ForegroundColor Gray
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "bun run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

# 3. Health check
Write-Host "🏥 Health checking services..." -ForegroundColor Cyan

$endpoints = @{
    "FastAPI" = "http://localhost:8000/health"
    "Elysia"  = "http://localhost:3000/ping"
}

foreach ($name in $endpoints.Keys) {
    try {
        $response = Invoke-WebRequest -Uri $endpoints[$name] -TimeoutSec 5 -UseBasicParsing
        Write-Host "  ✓ $name : OK (${response.StatusCode})" -ForegroundColor Green
    }
    catch {
        Write-Host "  ⚠ $name : Not ready yet" -ForegroundColor Yellow
    }
}

Write-Host ""

# 4. Launch platforms
Write-Host "💻 Launching platforms..." -ForegroundColor Cyan

$platforms = @(
    @{ Name = "Web Demo"; Url = "http://localhost:3000/demo-airi.html" }
    @{ Name = "Admin Dashboard"; Url = "http://localhost:3000/admin-extended.html" }
)

Write-Host ""
Write-Host "Available platforms:" -ForegroundColor Magenta
Write-Host "  1. Web Demo" -ForegroundColor White
Write-Host "  2. Desktop (Electron)" -ForegroundColor White
Write-Host "  3. Desktop (Tauri)" -ForegroundColor White
Write-Host "  4. Mobile (Expo)" -ForegroundColor White
Write-Host "  5. All Web Pages" -ForegroundColor White
Write-Host "  0. Skip platform launch" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Select platform to launch (1-5, 0 to skip)"

switch ($choice) {
    "1" {
        Write-Host "  Opening Web Demo..." -ForegroundColor Gray
        Start-Process "http://localhost:3000/demo-airi.html"
    }
    "2" {
        Write-Host "  Launching Electron Desktop..." -ForegroundColor Gray
        Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd desktop; npm start" -WindowStyle Normal
    }
    "3" {
        Write-Host "  Launching Tauri Desktop..." -ForegroundColor Gray
        if (Test-Path "tauri-app") {
            Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd tauri-app; npm run dev" -WindowStyle Normal
        }
        else {
            Write-Host "  ⚠ Tauri app not found. Run setup first." -ForegroundColor Yellow
        }
    }
    "4" {
        Write-Host "  Launching Expo Mobile..." -ForegroundColor Gray
        Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd mobile; npm start" -WindowStyle Normal
    }
    "5" {
        Write-Host "  Opening all web pages..." -ForegroundColor Gray
        foreach ($platform in $platforms) {
            Start-Process $platform.Url
            Start-Sleep -Milliseconds 500
        }
    }
    "0" {
        Write-Host "  Skipping platform launch" -ForegroundColor Gray
    }
    default {
        Write-Host "  Invalid choice. Skipping." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✨ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "Quick Links:" -ForegroundColor Cyan
Write-Host "  Web Demo    : http://localhost:3000/demo-airi.html" -ForegroundColor White
Write-Host "  Admin       : http://localhost:3000/admin-extended.html" -ForegroundColor White
Write-Host "  Health      : http://localhost:3000/health" -ForegroundColor White
Write-Host "  Metrics     : http://localhost:3000/metrics" -ForegroundColor White
Write-Host "  Swagger     : http://localhost:3000/swagger" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Gray

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host ""
    Write-Host "👋 Shutting down..." -ForegroundColor Yellow
}
