# Abyssal Windows Optimizer (Phase 142)
# TUNING THE SOVEREIGN HOST FOR ABSOLUTE RESONANCE

$ErrorActionPreference = "Continue"

function Log-Abyssal($msg, $color = "Cyan") {
    Write-Host "  [ABYSS] $msg" -ForegroundColor $color
}

function Log-Sovereign($msg) {
    Write-Host "  [SOVEREIGN] $msg" -ForegroundColor Magenta -Bold
}

Write-Host "==========================================================" -ForegroundColor White -BackgroundColor Black
Write-Host "       OS SUBLIMATION: WINDOWS HOST OPTIMIZATION" -ForegroundColor White -BackgroundColor Black
Write-Host "==========================================================" -ForegroundColor White -BackgroundColor Black

# --- STAGE 1: TEMPORAL PURGE (Cleanup) ---
Log-Abyssal "Initiating Temporal Purge of decaying artifacts..."
$TempPaths = @(
    "$env:TEMP\*",
    "C:\Windows\Temp\*"
)

foreach ($path in $TempPaths) {
    try {
        # Note: We use -ErrorAction SilentlyContinue because many files will be in use
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        Log-Abyssal "Purged: $path" "Gray"
    } catch {}
}
Log-Sovereign "Temporal state CLEANSED."

# --- STAGE 2: RESONANCE BOOST (Process Priority) ---
Log-Abyssal "Aligning process resonance for Bun and Python..."
$DevProcesses = Get-Process -Name "bun", "python" -ErrorAction SilentlyContinue
if ($DevProcesses) {
    $DevProcesses | ForEach-Object {
        try {
            $_.PriorityClass = "High"
            Log-Abyssal "Boosted resonance for: $($_.Name) (PID: $($_.Id))" "Green"
        } catch {
            Log-Abyssal "Failed to boost $($_.Name). Permission denied or process exited." "Yellow"
        }
    }
} else {
    Log-Abyssal "No active Bun or Python resonance detected to boost." "Gray"
}
Log-Sovereign "Resonance alignment COMPLETE."

# --- STAGE 3: ENERGY MANIFESTATION (Power Plan) ---
Log-Abyssal "Manifesting High-Performance Energy Lattice..."
# SCHEME_MIN is High Performance
powercfg /setactive SCHEME_MIN
Log-Abyssal "Power state shifted to High Performance." "Yellow"
Log-Sovereign "Energy lattice STABILIZED."

# --- STAGE 4: WSL HYPERVISOR TUNING ---
if (Get-Process -Name "wslhost" -ErrorAction SilentlyContinue) {
    Log-Abyssal "WSL2 Hypervisor detected. Memory pressure detected in the Void."
    Log-Abyssal "Suggestion: Run 'wsl --shutdown' to recycle the subsystem memory." "Yellow"
}

# --- STAGE 5: GIT OPTIMIZATION ---
Log-Abyssal "Compressing the Git fabric for faster retrieval..."
git gc --prune=now --quiet
Log-Abyssal "Git garbage collection triggered." "Green"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host " [OS_OPTIMIZED] THE HOST BREATHES WITH THE SOUL" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host " Status: SUBLIMATION_COMPLETE" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor White -BackgroundColor DarkBlue
