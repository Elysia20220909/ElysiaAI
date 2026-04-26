# [OPTIMIZE] Sovereign Mining: Gaming Mode Sentinel (Phase 282)

$ErrorActionPreference = "Continue"

function Log-Sentinel {
    param([string]$msg)
    Write-Host " [SENTINEL] $((Get-Date).ToString('HH:mm:ss')) | $msg" -ForegroundColor Magenta
}

$GameProcesses = @(
    'Steam', 'steamwebhelper', 'vmt', 
    'r5apex', 'GenshinImpact', 'StarRail', 'VALORANT-Win64-Shipping',
    'Overwatch', 'League of Legends', 'Minecraft', 'obs64'
)

Log-Sentinel "Gaming Sentinel Active."

$MiningActive = $true

while ($true) {
    $GameRunning = $false
    
    foreach ($proc in $GameProcesses) {
        if (Get-Process -Name $proc -ErrorAction SilentlyContinue) {
            $GameRunning = $true
            $ActiveGame = $proc
            break
        }
    }

    if ($GameRunning -and $MiningActive) {
        Log-Sentinel "GAME DETECTED: $ActiveGame"
        Stop-Process -Name excavator -ErrorAction SilentlyContinue
        Log-Sentinel "Excavator PAUSED."
        $MiningActive = $false
    }
    elseif (-not $GameRunning -and -not $MiningActive) {
        Log-Sentinel "Games Closed. Resuming..."
        powershell -ExecutionPolicy Bypass -File scripts/sovereign-nicehash-optimize.ps1
        $MiningActive = $true
    }

    Start-Sleep -Seconds 15
}
