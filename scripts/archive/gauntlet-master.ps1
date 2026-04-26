# ElysiaAI Sovereign Gauntlet Master Orchestrator
# Final ASCII-only version.

$ErrorActionPreference = "Stop"

function Write-Elysia {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "`n[Elysia-Audit] $Message" -ForegroundColor $Color
}

Write-Elysia "Initiating full-stack vulnerability diagnosis..." "Magenta"

# 1. Detection Logic
$dockerComposeCmd = ""
$isWsl = $false

# Try Windows Native
if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
    $dockerComposeCmd = "docker-compose"
} elseif (Get-Command "docker" -ErrorAction SilentlyContinue) {
    try {
        docker compose version | Out-Null
        $dockerComposeCmd = "docker compose"
    } catch {}
}

# Try WSL2 Fallback
if (-not $dockerComposeCmd -and (Get-Command "wsl" -ErrorAction SilentlyContinue)) {
    Write-Elysia "Windows Docker not found. Checking WSL2..." "Gray"
    try {
        $wslCheck = wsl docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Elysia "SUCCESS: Docker found within WSL2." "Green"
            $dockerComposeCmd = "wsl docker compose"
            $isWsl = $true
        }
    } catch {}
}

if (-not $dockerComposeCmd) {
    Write-Host "ERROR: Docker Compose not found in Windows or WSL2." -ForegroundColor Red
    exit 1
}

Write-Host "Using resonance engine: $dockerComposeCmd" -ForegroundColor Gray

# 2. Rebuild
Write-Elysia "Phase 0: Rebuilding Security Sandbox..."
Invoke-Expression "$dockerComposeCmd build security-sandbox"

# 3. Up
Write-Elysia "Phase 1: Ensuring Sovereign Stack is operational..."
Invoke-Expression "$dockerComposeCmd up -d app db redis shield-agent security-sandbox"

# 4. Wait
Write-Elysia "Waiting for resonance stabilization (5s)..."
Start-Sleep -Seconds 5

# 5. Execute The Gauntlet
Write-Elysia "COMMENCING SOVEREIGN GAUNTLET" "Yellow"
if ($isWsl) {
    Invoke-Expression "wsl bash scripts/verify-security.sh"
} else {
    Invoke-Expression "$dockerComposeCmd exec security-sandbox bash /sandbox/scripts/verify-security.sh"
}

Write-Elysia "--------------------------------------------------------" "Magenta"
Write-Elysia "INTEGRITY AUDIT COMPLETE" "Green"
Write-Host "Check logs directory for scan reports."
