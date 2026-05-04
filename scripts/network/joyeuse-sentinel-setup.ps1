# 🌸 ElysiaAI // OPERATIVE AUTO-SETUP: JOYEUSE-0603
# PURPOSE: Full environment initialization and intelligence network synchronization.

Write-Host "🌌 INITIALIZING SOVEREIGN SENTINEL PROTOCOL..." -ForegroundColor Cyan
Write-Host "OPERATIVE IDENTIFIED: Joyeuse#0603" -ForegroundColor Magenta
Write-Host "--------------------------------------------------"

# 1. Environment Synchronization
Write-Host "[*] Synchronizing Bun Environment..." -ForegroundColor Yellow
& bun scripts/manage.ts setup

# 2. Python Cognitive Layer Setup
Write-Host "[*] Constructing Python Virtual Environment (Cognitive Layer)..." -ForegroundColor Yellow
& bun scripts/manage.ts setup-python

# 3. Security Verification
Write-Host "[*] Auditing System Integrity..." -ForegroundColor Yellow
& bun scripts/manage.ts check

# 4. Intelligence Network Warm-up
Write-Host "[*] Warming up Intelligence Notifiers..." -ForegroundColor Yellow
$IntelScripts = @(
    "scripts\send_latest_nte_news.py",
    "scripts\dispatch_8_0_intel.py",
    "scripts\send_marathon_abyssal_intel.py"
)

foreach ($Script in $IntelScripts) {
    if (Test-Path $Script) {
        Write-Host " [+] Dispatching $Script..." -ForegroundColor Green
        & python $Script
    }
}

# 5. Welcome Signal
Write-Host "[*] Dispatching Final Welcome Signal for Joyeuse..." -ForegroundColor Cyan
$WelcomeMsg = @"
import asyncio
from nte_notifier import NTENotifier
async def welcome():
    notifier = NTENotifier()
    content = notifier.format_terminal(
        "OPERATIVE ONBOARDED: Joyeuse#0603",
        "オペレーティブ着任: Joyeuse#0603",
        "Access granted to the ElysiaAI Intelligence Network. System status: OPTIMAL.",
        "ElysiaAI インテリジェンスネットワークへのアクセスを承認。システムステータス：正常。",
        source="Sovereign Terminal"
    )
    await notifier.send_message(content)
asyncio.run(welcome())
"@
$WelcomeMsg | Out-File -FilePath "scripts/temp_welcome.py" -Encoding utf8
& python scripts/temp_welcome.py
Remove-Item "scripts/temp_welcome.py"

Write-Host "--------------------------------------------------"
Write-Host "✅ AUTO-SETUP COMPLETE. WELCOME TO THE ABYSS, JOYEUSE." -ForegroundColor Green
Write-Host "Run 'bun scripts/manage.ts dev' to start the full stack." -ForegroundColor Cyan
