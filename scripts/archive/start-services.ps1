# Elysia AI - Service Startup Script
param(
    [switch]$Redis,
    [switch]$Ollama,
    [switch]$FastAPI,
    [switch]$All
)

Write-Host "=== Elysia AI Service Startup ===" -ForegroundColor Cyan
Write-Host ""

# Redis
function Start-Redis {
    Write-Host "Redis Service..." -ForegroundColor Yellow
    $redis = Get-Process redis-server -ErrorAction SilentlyContinue
    if ($redis) {
        Write-Host "  Already running (PID: $($redis.Id))" -ForegroundColor Green
    } else {
        $cmd = Get-Command redis-server -ErrorAction SilentlyContinue
        if ($cmd) {
            Write-Host "  Starting Redis..." -ForegroundColor Green
            Start-Process redis-server -WindowStyle Hidden
            Start-Sleep -Seconds 2
            Write-Host "  Started on port 6379" -ForegroundColor Green
        } else {
            Write-Host "  Not installed. Install from: https://redis.io/download" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# Ollama
function Start-Ollama {
    Write-Host "Ollama Service..." -ForegroundColor Yellow
    $ollama = Get-Process ollama -ErrorAction SilentlyContinue
    if ($ollama) {
        Write-Host "  Already running (PID: $($ollama.Id))" -ForegroundColor Green
    } else {
        $cmd = Get-Command ollama -ErrorAction SilentlyContinue
        if ($cmd) {
            Write-Host "  Starting Ollama..." -ForegroundColor Green
            Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
            Start-Sleep -Seconds 3
            Write-Host "  Started on port 11434" -ForegroundColor Green
        } else {
            Write-Host "  Not installed. Install from: https://ollama.ai/download" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# FastAPI
function Start-FastAPI {
    Write-Host "FastAPI Service..." -ForegroundColor Yellow
    $port = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    if ($port) {
        Write-Host "  Already running on port 8000" -ForegroundColor Green
    } else {
        $python = Get-Command python -ErrorAction SilentlyContinue
        if ($python) {
            Write-Host "  Starting FastAPI..." -ForegroundColor Green
            $scriptPath = Join-Path $PSScriptRoot "..\python\fastapi_server.py"
            if (Test-Path $scriptPath) {
                Start-Process python -ArgumentList $scriptPath -WindowStyle Hidden
                Start-Sleep -Seconds 5
                Write-Host "  Started on port 8000" -ForegroundColor Green
            } else {
                Write-Host "  fastapi_server.py not found" -ForegroundColor Red
            }
        } else {
            Write-Host "  Python not installed" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# Main
if ($All) {
    Start-Redis
    Start-Ollama
    Start-FastAPI
} else {
    if ($Redis) { Start-Redis }
    if ($Ollama) { Start-Ollama }
    if ($FastAPI) { Start-FastAPI }

    if (-not ($Redis -or $Ollama -or $FastAPI)) {
        Write-Host "Usage:" -ForegroundColor Yellow
        Write-Host "  .\scripts\start-services.ps1 -All" -ForegroundColor Gray
        Write-Host "  .\scripts\start-services.ps1 -Redis" -ForegroundColor Gray
        Write-Host "  .\scripts\start-services.ps1 -Ollama" -ForegroundColor Gray
        Write-Host "  .\scripts\start-services.ps1 -FastAPI" -ForegroundColor Gray
        Write-Host ""
    }
}

Write-Host "=== Service Status ===" -ForegroundColor Cyan
$redisOk = Get-Process redis-server -ErrorAction SilentlyContinue
$ollamaOk = Get-Process ollama -ErrorAction SilentlyContinue
$fastapiOk = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue

if ($redisOk) { Write-Host "Redis   : Running" -ForegroundColor Green } else { Write-Host "Redis   : Stopped" -ForegroundColor Red }
if ($ollamaOk) { Write-Host "Ollama  : Running" -ForegroundColor Green } else { Write-Host "Ollama  : Stopped" -ForegroundColor Red }
if ($fastapiOk) { Write-Host "FastAPI : Running" -ForegroundColor Green } else { Write-Host "FastAPI : Stopped" -ForegroundColor Red }
Write-Host ""
Write-Host "Next: bun run dev" -ForegroundColor Yellow
