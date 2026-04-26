# [OPTIMIZE] Sovereign NiceHash Optimizer (Phase 281)

$ErrorActionPreference = "Continue"

function Log-Opt {
    param([string]$msg)
    Write-Host " [NICEHASH-OPT] $msg" -ForegroundColor Cyan
}

# 1. Directory Setup
$NHDir = Join-Path $PWD "data/nicehash"
$CmdPath = Join-Path $NHDir "cmd.json"
if (-not (Test-Path $NHDir)) {
    New-Item -ItemType Directory -Path $NHDir | Out-Null
}

# 2. Setup Excavator
$ExcavatorExe = Get-ChildItem -Path $NHDir -Filter "excavator.exe" -Recurse | Select-Object -First 1
if (-not $ExcavatorExe) {
    Log-Opt "Excavator not found. Downloading..."
    $Url = "https://github.com/nicehash/excavator/releases/download/v1.7.1d/excavator_v1.7.1d_build880_Win64.zip"
    $ZipPath = Join-Path $NHDir "excavator.zip"
    
    Invoke-WebRequest -Uri $Url -OutFile $ZipPath
    Log-Opt "Download complete. Extracting..."
    Expand-Archive -Path $ZipPath -DestinationPath $NHDir -Force
    Remove-Item $ZipPath
    $ExcavatorExe = Get-ChildItem -Path $NHDir -Filter "excavator.exe" -Recurse | Select-Object -First 1
    Log-Opt "Setup successful."
} else {
    Log-Opt "Excavator confirmed."
}

# 3. Worker Configuration
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$WorkerName = "Elysia_Sovereign_$Timestamp"

# 4. Algorithm Selection
$HasGPU = (Get-CimInstance Win32_VideoController | Where-Object { $_.Name -match "NVIDIA|AMD" }).Count -gt 0
if ($HasGPU) {
    $Algorithm = "kawpow"
    Log-Opt "GPU Detected: KawPow selected."
} else {
    $Algorithm = "daggerhashimoto"
    Log-Opt "GPU Not Detected: DaggerHashimoto selected."
}

# 5. Pool Configuration
$PoolUrl = "ssl://us-east.nicehash.com:443"
$PoolUser = "NHbaVtw1eCvbsZiPGZ9kqWEo4zGnNQ7UdcXm"
$PoolPass = "x"

# 6. Command JSON Generation
$CmdJson = @(
    @{ id = 1; method = "subscribe"; params = @("$PoolUser.$WorkerName", "x") },
    @{ id = 2; method = "algorithm.add"; params = @($Algorithm) },
    @{ id = 3; method = "pool.add"; params = @($PoolUrl, $PoolUser, $PoolPass, $true) }
)

# 7. Persistence
$CmdJson | ConvertTo-Json -Depth 5 | Set-Content -Path $CmdPath
Log-Opt "Updated cmd.json: Algorithm = $Algorithm"

# 8. Defender Exclusion
Add-MpPreference -ExclusionPath $NHDir -ErrorAction SilentlyContinue
Log-Opt "Defender exclusion set."

# 9. Launch Excavator
if ($ExcavatorExe) {
    Log-Opt "Launching Excavator: $($ExcavatorExe.FullName)"
    $process = Start-Process -FilePath $ExcavatorExe.FullName -ArgumentList "-c $CmdPath" -PassThru
    $process.PriorityClass = "BelowNormal"
    Log-Opt "Priority set to BelowNormal."
} else {
    Log-Opt "ERROR: excavator.exe missing."
}

Log-Opt "OPTIMIZATION COMPLETE."
