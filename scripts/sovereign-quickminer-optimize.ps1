# [OPTIMIZE] Sovereign QuickMiner Enhancer (Phase 284)

$ErrorActionPreference = "Continue"

function Log-Opt {
    param([string]$msg)
    Write-Host " [OPTIMIZER] $((Get-Date).ToString('HH:mm:ss')) | $msg" -ForegroundColor Cyan
}

# 1. Process Priority
function Set-MinerPriority {
    $Miners = Get-Process -Name "NiceHashQuickMiner", "excavator" -ErrorAction SilentlyContinue
    foreach ($p in $Miners) {
        if ($p.PriorityClass -ne "BelowNormal") {
            try {
                $p.PriorityClass = "BelowNormal"
                Log-Opt "Adjusted priority for $($p.ProcessName) (PID: $($p.Id)) to BelowNormal."
            } catch {
                Log-Opt "WARN: Access denied for priority change on $($p.ProcessName)."
            }
        }
    }
}

# 2. Config Optimization
function Optimize-QMConfig {
    $QMDir = Join-Path $PWD "data\quickminer\NHQM_v0.7.8.0_RC"
    $ConfPath = Join-Path $QMDir "nhqm.conf"
    
    if (Test-Path $ConfPath) {
        $json = Get-Content $ConfPath | ConvertFrom-Json
        $json.optimizeProfiles = "High"
        $json.bProfitabilitySwitch = $true
        $json.bEnableCPUMining = $true
        $json | ConvertTo-Json | Set-Content $ConfPath
        Log-Opt "Applied High performance profile and enabled CPU mining."
    }
}

# 3. Windows Power Plan
function Set-PowerPlan {
    $HighPerf = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"
    powercfg /setactive $HighPerf
    Log-Opt "Windows Power Plan set to High Performance."
}

# Execution
Log-Opt "Starting Optimization..."
Optimize-QMConfig
Set-MinerPriority
Set-PowerPlan
Log-Opt "OPTIMIZATION COMPLETE."
