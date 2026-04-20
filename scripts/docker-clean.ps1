# Elysia Sovereign OS - Phase 55: Docker Sanctuary Cleanup Protocol
# Usage: .\scripts\docker-clean.ps1
# Refined for Arc 11: Sovereign Creation

$ErrorActionPreference = "SilentlyContinue"

Write-Host "`n🛡️  ELYSIANA INFRASTRUCTURE // DOCKER SANCTUARY" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor DarkCyan
Write-Host "Initiating Phase 55: Great Cleaning Sequence..." -ForegroundColor Gray

# 0. Check Docker Status
Write-Host "> Verifying Docker Engine connectivity..." -ForegroundColor Gray
$dockerInfo = docker info --format '{{.ServerVersion}}' 2>$null
if (-not $dockerInfo) {
    Write-Host "❌ DOCKER ENGINE OFFLINE" -ForegroundColor Red
    Write-Host "Please ensure Docker Desktop is running." -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Engine Active: v$dockerInfo" -ForegroundColor Green

# 1. Stop all elysia-related containers
Write-Host "`n> Neutralizing Elysia-active containers..." -ForegroundColor Yellow
$elysiaContainers = docker ps -q --filter "name=elysia-"
if ($elysiaContainers) {
    $elysiaContainers | ForEach-Object { 
        docker stop $_ 
        Write-Host "  - Halted: $_" -ForegroundColor Gray
    }
} else {
    Write-Host "  - No active Elysia containers detected." -ForegroundColor Gray
}

# 2. Comprehensive System Purge
Write-Host "`n> Executing Sovereign Purge (Containers, Images, Networks, Volumes)..." -ForegroundColor Yellow
docker system prune -af --volumes

# 3. Builder Cache Purge (Deep Cleaning)
Write-Host "`n> Purging Builder Cache (Nanotech Vacuum)..." -ForegroundColor Yellow
docker builder prune -af

# 4. Final Verification
$finalStats = docker system df
Write-Host "`n--- [DOCKER SANCTUARY: CLEANING COMPLETE] ---" -ForegroundColor Green
Write-Host "Status: PRISTINE // LIGHTWEIGHTED" -ForegroundColor Green
Write-Host ""
$finalStats
Write-Host "`n💡 TIP: On Windows, use 'wsl --shutdown' then optimize the VHDX to reclaim physical disk space." -ForegroundColor Cyan
