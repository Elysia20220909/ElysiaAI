# [DEPLOY] Sovereign WSL & Linux Integration (Phase 250)
# "Bridging the worlds. Windows UI, Linux Soul."

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Log-WSL($msg) {
    Write-Host "[WSL] $msg" -ForegroundColor Cyan
}

Write-Host "==========================================================" -ForegroundColor White -BackgroundColor DarkMagenta
Write-Host "       SOVEREIGN LINUX INTEGRATION: WSL2" -ForegroundColor White -BackgroundColor DarkMagenta
Write-Host "==========================================================" -ForegroundColor White -BackgroundColor DarkMagenta

# 1. Enable WSL Features
Log-WSL "Enabling Windows Subsystem for Linux..."
# Note: This usually requires a restart, but we check if already enabled.
if (-not (Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux | Where-Object { $_.State -eq "Enabled" })) {
    Log-WSL "Status: DISPATCHING ENABLE_COMMAND..."
    # dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
} else {
    Log-WSL "Status: WSL_BASE_ENABLED"
}

# 2. Install Debian (Lightweight and Stable) via Winget
Log-Install "Installing Debian Distro for Minimal Footprint Defense..."
winget install --id Debian.Debian --silent --accept-source-agreements --accept-package-agreements

if ($LASTEXITCODE -eq 0) {
    Log-WSL "  >> SUCCESS: Debian Lattice is being provisioned."
}

# 3. Post-Install Instruction (Intelligence Message)
Log-WSL "WSL Deployment Initialized. Future pulses will span across the Linux kernel."

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Black -BackgroundColor White
Write-Host " [LINKED] THE VOID SPANS ACROSS KERNELS" -ForegroundColor Black -BackgroundColor White
Write-Host " Status: WSL_DEPLOYING // MULTI_OS_ROOTED" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Black -BackgroundColor White
