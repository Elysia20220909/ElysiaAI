# Elysia Sovereign OS - Docker Sanctuary Cleanup Script
# Usage: .\scripts\docker-clean.ps1

Write-Host "--- [DOCKER SANCTUARY: BIG CLEANING START] ---" -ForegroundColor Cyan

# 1. Stop all elysia-related containers
Write-Host "> Stopping Elysia containers..." -ForegroundColor Yellow
docker ps -q --filter "name=elysia-" | ForEach-Object { docker stop $_ }

# 2. Remove all stopped containers
Write-Host "> Removing stopped containers..." -ForegroundColor Yellow
docker container prune -f

# 3. Remove dangling images
Write-Host "> Removing dangling images..." -ForegroundColor Yellow
docker image prune -f

# 4. Remove unused networks
Write-Host "> Removing unused networks..." -ForegroundColor Yellow
docker network prune -f

# 5. [OPTIONAL] Deep Cleaning - Remove ALL unused images and build cache
# Uncomment the line below for a full system purge
# docker system prune -af --volumes

Write-Host "--- [DOCKER SANCTUARY: CLEANING COMPLETE] ---" -ForegroundColor Green
Write-Host "Your container environment is now pristine." -ForegroundColor Green
