# 🍒 Elysia OS - Windows Boot Script 🍒

Write-Host "🌟 Initializing Elysia OS Resonance Cluster..." -ForegroundColor Cyan

# 0. Pre-flight Check
python scripts/elysia_check.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Pre-flight check failed. Please resolve the issues above." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 1. Start Python Kernel (elysiad)
Write-Host "⚡ Starting Elysia Kernel Daemon..." -ForegroundColor Magenta
# Start as a background process
Start-Process python -ArgumentList "usr/lib/elysia/kernel.py" -NoNewWindow -PassThru -RedirectStandardOutput "var/log/elysia/kernel.log"

# 2. Start Frontend UI (Bun)
Write-Host "💎 Starting Elysia UI (Bun)..." -ForegroundColor Blue
bun run dev

Write-Host "🛑 Elysia Kernel Stopped." -ForegroundColor Red
