# 🌸 ElysiaAI - Sovereign Remote Deployment Tool (Windows -> Ubuntu)

param (
    [string]$RemoteHost = "your-server-ip",
    [string]$User = "root",
    [int]$Port = 22
)

$ErrorActionPreference = "Stop"

Write-Host "`n🚀 [1/3] Preparing Sovereign Payload..." -ForegroundColor Cyan
$ProjectDir = Get-Location
$ExcludeList = @(".git", ".venv", "node_modules", "dist", "src-tauri/target", "__pycache__")

Write-Host "📦 Syncing files to ${User}@${RemoteHost}..." -ForegroundColor Yellow

# Use SCP to transfer the entire project
# Note: In a real environment, using rsync via WSL is better, but this works natively in PowerShell.
scp -P $Port -r ./* "${User}@${RemoteHost}:~/ElysiaAI/"

Write-Host "`n🔑 [2/3] Setting Permissions & Hardening..." -ForegroundColor Cyan
ssh -p $Port "${User}@${RemoteHost}" "chmod +x ~/ElysiaAI/scripts/*.sh"

Write-Host "`n🌌 [3/3] Initiating Sovereign Setup on Ubuntu 26.04..." -ForegroundColor Magenta
ssh -t -p $Port "${User}@${RemoteHost}" "cd ~/ElysiaAI && ./scripts/setup_server_automation.sh"

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "✅ DEPLOYMENT INITIATED SUCCESSFULLY" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Elysia is now awakening on the remote host."
