# Elysia OS Resonance - Boot Loader 🌸
# Version: 2.1.0-RESONANCE

Write-Host "[Elysia OS] Initializing Boot Sequence..." -ForegroundColor Cyan

# 1. Dependency Check
Write-Host "[Boot] Checking Hardware Perception (psutil)..." -NoNewline
if (-not (pip show psutil)) {
    Write-Host " [MISSING]" -ForegroundColor Yellow
    Write-Host "Installing psutil..." -ForegroundColor Gray
    pip install psutil
} else {
    Write-Host " [OK]" -ForegroundColor Green
}

Write-Host "[Boot] Checking Settings Manager (pydantic-settings)..." -NoNewline
if (-not (pip show pydantic-settings)) {
    Write-Host " [MISSING]" -ForegroundColor Yellow
    Write-Host "Installing pydantic-settings..." -ForegroundColor Gray
    pip install pydantic-settings
} else {
    Write-Host " [OK]" -ForegroundColor Green
}

# 2. Start Kernel (Backend)
Write-Host "[Boot] Launching Elysia Kernel (Port 8000)..." -ForegroundColor Cyan
Start-Process python -ArgumentList "-m uvicorn usr.lib.elysia.kernel:app --host 0.0.0.0 --port 8000" -NoNewWindow

# 3. Start Frontend (UI)
Write-Host "[Boot] Launching Resonance Interface (Port 3000)..." -ForegroundColor Cyan
Start-Process python -ArgumentList "-m http.server 3000 --directory public" -NoNewWindow

# 4. Finalizing
Write-Host "[Boot] Elysia OS Resonance is now ACTIVE!" -ForegroundColor Green
Write-Host "--------------------------------------------------"
Write-Host "Dashboard: http://localhost:3000/dashboard.html" -ForegroundColor White
Write-Host "Main UI: http://localhost:3000" -ForegroundColor White
Write-Host "--------------------------------------------------"

# 5. Open Dashboard
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000/dashboard.html"

Write-Host "READY! Let's go!" -ForegroundColor Magenta
