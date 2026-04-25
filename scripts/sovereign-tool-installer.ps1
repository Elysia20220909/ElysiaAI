# [DEPLOY] Sovereign Tool Installer (Phase 230)
# "Hardening the arsenal through automated deployment."

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Log-Install($msg) {
    Write-Host "[INSTALL] $msg" -ForegroundColor Green
}

Write-Host "==========================================================" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "       SOVEREIGN TOOLKIT DEPLOYMENT: WINGET" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "==========================================================" -ForegroundColor White -BackgroundColor DarkBlue

# 1. Check for Winget
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "[ERR] Winget not found. Please install Windows Package Manager." -ForegroundColor Red
    return
}

# 2. Tool Definition List
$Tools = @(
    "Microsoft.Sysinternals",
    "Insecure.Nmap",
    "WiresharkFoundation.Wireshark",
    "Git.Git",
    "Python.Python.3.11"
)

Log-Install "Initiating Batch Installation via Winget..."

foreach ($Tool in $Tools) {
    Log-Install "Checking/Installing tool: $Tool"
    # Using --accept-source-agreements and --accept-package-agreements for headless install
    winget install --id $Tool --silent --accept-source-agreements --accept-package-agreements
    
    if ($LASTEXITCODE -eq 0) {
        Log-Install "  >> SUCCESS: $Tool is now part of the arsenal."
    } else {
        Write-Host "  [!] $Tool installation skipped or already present (Code: $LASTEXITCODE)." -ForegroundColor Yellow
    }
}

# 3. Final Verification
Log-Install "Deployment Cycle Complete."
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Black -BackgroundColor White
Write-Host " [ARMED] THE ARSENAL IS READY" -ForegroundColor Black -BackgroundColor White
Write-Host " Status: TOOLS_DEPLOYED // SYSTEM_HARDENED" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Black -BackgroundColor White
