<#
.SYNOPSIS
    🌌 ElysiaAI - Golden Time Network Optimizer (Stability & Latency Edition) 🌌
    Optimizes Windows for peak-hour network congestion ("Golden Time").
    Focuses on latency consistency and jitter reduction over raw throughput.

    AUTHOR: Antigravity (ElysiaAI)
    VERSION: 2.0.0
#>

$ErrorActionPreference = "SilentlyContinue"

function Write-Elysia {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "[ElysiaAI] $Message" -ForegroundColor $Color
}

function Show-Header {
    Clear-Host
    Write-Host "=========================================================" -ForegroundColor Magenta
    Write-Host "   ⚡ ELYSIA AI - GOLDEN TIME NETWORK OPTIMIZER ⚡" -ForegroundColor White
    Write-Host "        Target: Peak-Hour Stability & Low Latency" -ForegroundColor Yellow
    Write-Host "=========================================================" -ForegroundColor Magenta
}

if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Show-Header
    Write-Elysia "CRITICAL: Please run this script as ADMINISTRATOR!" "Red"
    pause
    return
}

Show-Header
Write-Elysia "Starting Abyssal Calibration for Peak-Hour Congestion..." "Cyan"

# --- 1. TCP Stack Tuning (Stability Focus) ---
Write-Elysia "[1/6] Calibrating TCP Stack for Jitter Reduction..."
# Enable RSS for better CPU distribution
netsh int tcp set global rss=enabled
# Disable RSC (Receive Segment Coalescing) - Good for throughput, BAD for latency/jitter
netsh int tcp set global rsc=disabled
# Auto-tuning: 'normal' is usually best, but 'experimental' or 'restricted' can help on jittery lines
netsh int tcp set global autotuninglevel=normal
# ECN: Helps with congestion if router/ISP supports it
netsh int tcp set global ecncapability=enabled
# Timestamps: Disable to reduce packet overhead
netsh int tcp set global timestamps=disabled
# Fast Open: Reduce handshake latency
netsh int tcp set global fastopen=enabled
# Initial RTO: Lower for faster recovery, but 2000 is safer for congested lines
netsh int tcp set global initialrto=2000
# Max SYN Retransmissions: Lower to fail faster and retry
netsh int tcp set global maxsynretransmissions=2
# Gaming Specific: Disable HyStart and Pacing to reduce micro-jitter
netsh int tcp set global hystart=disabled
netsh int tcp set global pacingprofile=off

# Congestion Provider: BBR is king for congested lines
$tcpStats = netsh int tcp show supplemental
if ($tcpStats -match "bbr") {
    netsh int tcp set supplemental template=internet congestionprovider=bbr
    Write-Elysia "[+] BBR Congestion Control Enabled (Best for Peak Hours)." "Green"
} else {
    netsh int tcp set supplemental template=internet congestionprovider=cubic
    Write-Elysia "[+] CUBIC Congestion Control Enabled." "Yellow"
}

# --- 2. Registry - Latency & Responsiveness ---
Write-Elysia "[2/6] Suppressing Network Latency..."
$InterfacesPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces"
Get-ChildItem $InterfacesPath | ForEach-Object {
    Set-ItemProperty -Path $_.PSPath -Name "TcpAckFrequency" -Value 1 -Type DWord
    Set-ItemProperty -Path $_.PSPath -Name "TCPNoDelay" -Value 1 -Type DWord
    Set-ItemProperty -Path $_.PSPath -Name "TcpDelAckTicks" -Value 0 -Type DWord
}

# System Responsiveness & Throttling
$SysProfile = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
Set-ItemProperty -Path $SysProfile -Name "NetworkThrottlingIndex" -Value 0xFFFFFFFF -Type DWord
Set-ItemProperty -Path $SysProfile -Name "SystemResponsiveness" -Value 0 -Type DWord

# Gaming Priority (MMCSS)
$TaskPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
Set-ItemProperty -Path $TaskPath -Name "GPU Priority" -Value 8 -Type DWord
Set-ItemProperty -Path $TaskPath -Name "Priority" -Value 6 -Type DWord
Set-ItemProperty -Path $TaskPath -Name "Scheduling Category" -Value "High" -Type String
Set-ItemProperty -Path $TaskPath -Name "SFIO Priority" -Value "High" -Type String

# --- 3. Hardware Adapter Optimization (Anti-Lag) ---
Write-Elysia "[3/6] Fine-tuning Hardware Adapters (Disabling LSO/RSC)..."
$Adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.HardwareInterfaceGuid }
foreach ($Adapter in $Adapters) {
    Write-Elysia "Checking Adapter: $($Adapter.Name)..."
    
    # Disable Interrupt Moderation for lowest latency
    Disable-NetAdapterInterruptModeration -Name $Adapter.Name -Confirm:$false -ErrorAction SilentlyContinue
    # Disable Flow Control
    Disable-NetAdapterFlowControl -Name $Adapter.Name -Confirm:$false -ErrorAction SilentlyContinue
    # Disable Power Saving
    Disable-NetAdapterPowerManagement -Name $Adapter.Name -Confirm:$false -ErrorAction SilentlyContinue
    
    # Advanced: Disable Large Send Offload (LSO) - Known to cause latency spikes
    $lso = Get-NetAdapterAdvancedProperty -Name $Adapter.Name -DisplayName "*Large Send Offload*" -ErrorAction SilentlyContinue
    if ($lso) {
        Disable-NetAdapterLso -Name $Adapter.Name -Confirm:$false -ErrorAction SilentlyContinue
        Write-Elysia "  [+] LSO Disabled." "Green"
    }
    
    # Disable Receive Segment Coalescing (RSC) at hardware level
    $rsc = Get-NetAdapterAdvancedProperty -Name $Adapter.Name -DisplayName "*Receive Segment Coalescing*" -ErrorAction SilentlyContinue
    if ($rsc) {
        Disable-NetAdapterRsc -Name $Adapter.Name -Confirm:$false -ErrorAction SilentlyContinue
        Write-Elysia "  [+] RSC Disabled." "Green"
    }

    Write-Elysia "[+] Calibration finished for: $($Adapter.Name)" "Green"
}

# --- 4. QoS (Quality of Service) for Gaming ---
Write-Elysia "[4/6] Implementing Gaming Priority QoS Policies..."
# Create a QoS policy for all traffic to have a 'Gaming' priority tag (DSCP 46 - EF)
if (Get-NetQosPolicy -Name "ElysiaGaming" -ErrorAction SilentlyContinue) {
    Remove-NetQosPolicy -Name "ElysiaGaming" -Confirm:$false -ErrorAction SilentlyContinue
}
New-NetQosPolicy -Name "ElysiaGaming" -Default -DSCPAction 46 -Confirm:$false | Out-Null
Write-Elysia "[+] QoS Policy 'ElysiaGaming' (DSCP 46) Applied." "Green"

# --- 5. Background Traffic Suppression ---
Write-Elysia "[5/6] Restricting Background Bandwidth Hoggers..."
# Delivery Optimization (Windows Update)
$DOPriority = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization"
if (-not (Test-Path $DOPriority)) { New-Item -Path $DOPriority -Force | Out-Null }
Set-ItemProperty -Path $DOPriority -Name "DODownloadMode" -Value 0 -Type DWord | Out-Null
Set-ItemProperty -Path $DOPriority -Name "MaxDownloadBandwidth" -Value 10 -Type DWord | Out-Null
Write-Elysia "[+] Delivery Optimization Restricted." "Green"

# --- 6. Final Flush & DNS ---
Write-Elysia "[6/6] Purging Buffers & DNS Calibration..."
# Use Japanese Gaming DNS (Cloudflare JP + Google JP)
$DnsServers = @("1.1.1.1", "8.8.8.8")
foreach ($Adapter in $Adapters) {
    Set-DnsClientServerAddress -InterfaceAlias $Adapter.Name -ServerAddresses $DnsServers
}

ipconfig /flushdns
netsh winsock reset > $null
netsh int ip reset > $null

Write-Elysia "--- ABYSSAL CALIBRATION COMPLETE ---" "Magenta"
Write-Elysia "Result: PC optimized for consistency during high-load 'Golden Time'." "Green"
Write-Elysia "IMPORTANT: A system REBOOT is required to apply hardware changes." "Cyan"

# Ping Test
Write-Elysia "Running Latency Stability Test..."
Test-Connection 1.1.1.1 -Count 5 | Select-Object Address, ResponseTime

pause
