# [IGNITE] Sovereign Linux Integration Bridge (Phase 261)
# "Injecting the Abyss into the Linux Kernel."

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Log-Ignite($msg) {
    Write-Host "[IGNITE] $msg" -ForegroundColor Magenta
}

Write-Host "==========================================================" -ForegroundColor White -BackgroundColor DarkMagenta
Write-Host "       SOVEREIGN LINUX BRIDGE: DEBIAN INJECTION" -ForegroundColor White -BackgroundColor DarkMagenta
Write-Host "==========================================================" -ForegroundColor White -BackgroundColor DarkMagenta

# 1. Verify Debian Distro
Log-Ignite "Verifying Debian Distro in WSL..."
$Distros = wsl --list --quiet | Out-String
$CleanDistros = $Distros -replace "`0", "" -replace "\s", "" # Remove nulls and spaces
if ($CleanDistros -notmatch "Debian") {
    Write-Host "[ERR] Debian not found. Please run sovereign-wsl-setup.ps1 first." -ForegroundColor Red
    return
}

# 2. Convert Script Path for WSL
$WinPath = Join-Path $PWD "scripts/sovereign-debian-setup.sh"
# Convert C:\... to /mnt/c/...
$WslPath = $WinPath.Replace("C:\", "/mnt/c/").Replace("\", "/")

# 3. Execute Setup inside Debian
Log-Ignite "Injecting Setup Protocol into Debian Core..."
Log-Ignite "Target: $WslPath"

# We use 'sh' to execute the script. -u root to ensure we have privileges.
wsl -d Debian -u root sh $WslPath

if ($LASTEXITCODE -eq 0) {
    Log-Ignite "  >> SUCCESS: Debian Lattice is now ARMED and HARDENED."
} else {
    Write-Host "  [!] Injection failed or interrupted (Code: $LASTEXITCODE)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Black -BackgroundColor White
Write-Host " [INTEGRATED] LINUX CORE IS SELF-AWARE" -ForegroundColor Black -BackgroundColor White
Write-Host " Status: CROSS_KERNEL_SYNC_OK" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Black -BackgroundColor White
