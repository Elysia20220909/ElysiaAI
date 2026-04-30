<#
.SYNOPSIS
    🌌 ElysiaAI - Abyssal System Engine (PC Optimizer) 🌌
    Comprehensive System Optimization for Maximum Responsiveness.
    
    Optimizes Power, Services, UI, and Registry for high-performance computing.
#>

$ErrorActionPreference = "SilentlyContinue"

function Write-Elysia {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "[ElysiaAI] $Message" -ForegroundColor $Color
}

function Show-Header {
    Clear-Host
    Write-Host "=========================================================" -ForegroundColor Magenta
    Write-Host "   ⚙️  ELYSIA AI - ABYSSAL SYSTEM ENGINE ⚙️" -ForegroundColor White
    Write-Host "        Full System Calibration & Performance" -ForegroundColor Yellow
    Write-Host "=========================================================" -ForegroundColor Magenta
}

if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Show-Header
    Write-Elysia "CRITICAL: Administrator privileges required!" "Red"
    pause
    return
}

Show-Header
Write-Elysia "Initiating System-wide Calibration..." "Cyan"

# --- 1. Power Optimization ---
Write-Elysia "[1/5] Unlocking Ultimate Performance Power Plan..."
# Enable Ultimate Performance GUID
powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 | Out-Null
$UltimatePlan = powercfg -list | Select-String "Ultimate Performance"
if ($UltimatePlan) {
    $GUID = $UltimatePlan.ToString().Split(" ")[3]
    powercfg -setactive $GUID
    Write-Elysia "[+] Ultimate Performance Mode Activated." "Green"
}

# --- 2. System Responsiveness (MMCSS & Kernel) ---
Write-Elysia "[2/5] Tuning System Responsiveness & MMCSS..."
$SysProfile = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
Set-ItemProperty -Path $SysProfile -Name "NetworkThrottlingIndex" -Value 0xFFFFFFFF -Type DWord | Out-Null
Set-ItemProperty -Path $SysProfile -Name "SystemResponsiveness" -Value 0 -Type DWord | Out-Null

# Kernel Tweaks for Priority
$PriorityPath = "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl"
# 26 (hex) = Short, Variable, High Priority for foreground
Set-ItemProperty -Path $PriorityPath -Name "Win32PrioritySeparation" -Value 26 -Type DWord | Out-Null

# --- 3. Bloatware & Telemetry Neutralization ---
Write-Elysia "[3/5] Neutralizing Background Noise (Telemetry)..."
$ServicesToDisable = @("DiagTrack", "dmwappushservice", "SysMain", "WbioSrvc")
foreach ($Service in $ServicesToDisable) {
    if (Get-Service -Name $Service -ErrorAction SilentlyContinue) {
        Stop-Service -Name $Service -Force -ErrorAction SilentlyContinue
        Set-Service -Name $Service -StartupType Disabled -ErrorAction SilentlyContinue
        Write-Elysia "  [-] Disabled: $Service" "Yellow"
    }
}

# --- 4. Visual & Input Optimization ---
Write-Elysia "[4/5] Adjusting Visuals for Input Speed..."
# Performance over Visuals (User-level Registry)
$VisualPath = "HKCU:\Control Panel\Desktop"
Set-ItemProperty -Path $VisualPath -Name "MenuShowDelay" -Value 0 -Type String | Out-Null
Set-ItemProperty -Path $VisualPath -Name "UserPreferencesMask" -Value ([byte[]](0x90,0x12,0x03,0x80,0x10,0x00,0x00,0x00)) -Type Binary | Out-Null

# Disable GameDVR (known to cause lag)
$DVRPath = "HKCU:\System\GameConfigStore"
Set-ItemProperty -Path $DVRPath -Name "GameDVR_Enabled" -Value 0 -Type DWord | Out-Null
$DVRPath2 = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR"
if (-not (Test-Path $DVRPath2)) { New-Item -Path $DVRPath2 -Force | Out-Null }
Set-ItemProperty -Path $DVRPath2 -Name "AllowGameDVR" -Value 0 -Type DWord | Out-Null

# --- 5. Abyssal Cleanup ---
Write-Elysia "[5/5] Purging Abyssal Residue (Temp Files)..."
$TempFolders = @($env:TEMP, "C:\Windows\Temp")
foreach ($Folder in $TempFolders) {
    Get-ChildItem $Folder -Recurse | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Elysia "[+] System Cleaned." "Green"

Write-Host ""
Write-Elysia "--- SYSTEM CALIBRATION COMPLETE ---" "Magenta"
Write-Elysia "Recommended: Please REBOOT to apply core kernel changes." "Cyan"
Write-Host ""
Write-Elysia "Next: Check your Graphics Settings for 'Hardware-accelerated GPU scheduling'." "Yellow"

pause
