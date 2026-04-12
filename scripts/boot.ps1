# 🍒 Elysia OS - Windows Boot Script 🍒

# 文字化け対策: PowerShell と Python のエンコーディングを UTF-8 に固定
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONUTF8 = "1"

Write-Host "🌟 Initializing Elysia OS Resonance Cluster..." -ForegroundColor Cyan

# 0. Pre-flight Check
python scripts/elysia_check.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Pre-flight check failed. Please resolve the issues above." -ForegroundColor Red
    exit $LASTEXITCODE
}

# --- Phase 17 Resonance Cluster Initiation ---
Write-Host "🧬 Manifesting AbyssRTOS Resonance Simulation..." -ForegroundColor Yellow
Start-Process python -ArgumentList "scripts/abyss_rtos_sim.py" -NoNewWindow

# --- Cargo Path Hardening ---
$cargoPath = "C:\Users\hosih\.cargo\bin"
if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
    if (Test-Path $cargoPath) {
        $env:PATH = "$cargoPath;$env:PATH"
        echo "[FIX] Cargo path added: $cargoPath"
    }
}
# Final verify
echo "[DEBUG] Current Path for Tauri: $env:PATH"
cargo --version

# 1. System Diagnosis
echo "--- Elysia OS Diagnostic Report ---"

# --- 1. Cleanse Cluster (Zombie Process Removal) ---
Write-Host "🧹 Cleansing Resonance Cluster..." -ForegroundColor Gray
Stop-Process -Name bun -Force -ErrorAction SilentlyContinue
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { 
    try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
}

# --- 2. Ignite API Resonance (Port 3000) ---
Write-Host "📡 Initiating API Resonance (Port 3000)..." -ForegroundColor Cyan
$serverProcess = Start-Process bun -ArgumentList "run", "--filter", "@elysia-ai/server", "dev" -PassThru -NoNewWindow
echo "[OK] Server resonance started (PID: $($serverProcess.Id))"

# Wait for Heartbeat
Write-Host "💓 Waiting for resonance heartbeat..." -NoNewline
$retries = 0
while ($retries -lt 30) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/ping" -UseBasicParsing -TimeoutSec 1
        if ($response.StatusCode -eq 200) {
            Write-Host " [IGNITED]" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 1
        $retries++
    }
}

if ($retries -eq 30) {
    Write-Host " [FAILED]" -ForegroundColor Red
    Write-Host "❌ API resonance failed to stabilize. Check var/log/elysia/server.log"
    Stop-Process -Id $serverProcess.Id -Force
    exit 1
}

# --- 3. Manifest OS UI (Tauri) ---
Write-Host "💎 Starting Elysia OS Native App..." -ForegroundColor Blue
# Note: The kernel is now automatically managed by the native wrapper.
bun run dev:desktop

Write-Host "🛑 Elysia OS Instance Stopped. Stopping background services..." -ForegroundColor Red
Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
