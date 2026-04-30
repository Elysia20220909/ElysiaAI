<#
.SYNOPSIS
    ⚡ ElysiaAI - Ultra High-Speed Network Optimizer (Super Line Edition)
    Optimizes Windows network stack for 1Gbps+ lines and low-latency gaming.

    USAGE: Run as Administrator.
#>

$ErrorActionPreference = "SilentlyContinue"

function Write-Elysia {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "[ElysiaAI] $Message" -ForegroundColor $Color
}

if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Elysia "ERROR: This script MUST be run as Administrator." "Red"
    return
}

Write-Elysia "Initializing Abyssal Network Calibration..." "Cyan"
Write-Elysia "Target: Maximum Throughput & Minimum Latency" "Yellow"

# 1. TCP Global Parameters
Write-Elysia "Optimizing TCP/IP Stack..."
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global chimney=enabled
netsh int tcp set global dca=enabled
netsh int tcp set global netdma=enabled
netsh int tcp set global ecncapability=enabled
netsh int tcp set global timestamps=disabled
netsh int tcp set global rss=enabled
netsh int tcp set global fastopen=enabled
netsh int tcp set global initialrto=2000
netsh int tcp set global nonsackrttresiliency=disabled
netsh int tcp set global maxsynretransmissions=2

# Detect and set Congestion Provider (BBR > CUBIC > CTCP)
$CongestionProvider = "cubic"
$available = netsh int tcp show supplemental
if ($available -match "bbr") { $CongestionProvider = "bbr" }

Write-Elysia "Setting Congestion Provider to: $CongestionProvider" "Magenta"
netsh int tcp set supplemental template=custom congestionprovider=$CongestionProvider
netsh int tcp set supplemental template=internet congestionprovider=$CongestionProvider

# Advanced Registry Parameters for High Throughput
$TcpPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
Set-ItemProperty -Path $TcpPath -Name "MaxFreeTcbs" -Value 65536 -Type DWord
Set-ItemProperty -Path $TcpPath -Name "MaxHashTableSize" -Value 16384 -Type DWord
Set-ItemProperty -Path $TcpPath -Name "MaxUserPort" -Value 65534 -Type DWord
Set-ItemProperty -Path $TcpPath -Name "TcpTimedWaitDelay" -Value 30 -Type DWord
Set-ItemProperty -Path $TcpPath -Name "GlobalMaxTcpWindowSize" -Value 0x00FFFFFF -Type DWord


# 2. Registry - Latency & Gaming (Nagle's Algorithm, etc.)
Write-Elysia "Applying Registry-level Latency Tweaks..."
$RegPath1 = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces"
$Interfaces = Get-ChildItem $RegPath1
foreach ($Interface in $Interfaces) {
    Set-ItemProperty -Path $Interface.PSPath -Name "TcpAckFrequency" -Value 1 -Type DWord
    Set-ItemProperty -Path $Interface.PSPath -Name "TCPNoDelay" -Value 1 -Type DWord
    Set-ItemProperty -Path $Interface.PSPath -Name "TcpDelAckTicks" -Value 0 -Type DWord
}

# Network Throttling & Responsiveness
$MSMQPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
Set-ItemProperty -Path $MSMQPath -Name "NetworkThrottlingIndex" -Value 0xFFFFFFFF -Type DWord
Set-ItemProperty -Path $MSMQPath -Name "SystemResponsiveness" -Value 0 -Type DWord

# 3. NIC Hardware Optimization
Write-Elysia "Fine-tuning Network Adapter Hardware Settings..."
$Adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
foreach ($Adapter in $Adapters) {
    # Disable Interrupt Moderation for lowest latency
    Disable-NetAdapterInterruptModeration -Name $Adapter.Name
    # Disable Flow Control to prevent buffering delays
    Disable-NetAdapterFlowControl -Name $Adapter.Name
    # Enable RSS
    Enable-NetAdapterRss -Name $Adapter.Name
    # Disable Power Saving
    Disable-NetAdapterPowerManagement -Name $Adapter.Name
    Write-Elysia "[+] Optimized Adapter: $($Adapter.Name)" "Green"
}

# 4. DNS Optimization
Write-Elysia "Configuring Ultra-Fast DNS Resolvers (Cloudflare + Quad9)..."
$DNS = @("1.1.1.1", "9.9.9.9")
foreach ($Adapter in $Adapters) {
    Set-DnsClientServerAddress -InterfaceAlias $Adapter.Name -ServerAddresses $DNS
}

# 5. Flush & Reset
Write-Elysia "Purging Network Buffers..."
ipconfig /flushdns
netsh winsock reset
netsh int ip reset

Write-Elysia "Network Calibration COMPLETE." "Green"
Write-Elysia "Please REBOOT your system to apply all changes." "Magenta"
