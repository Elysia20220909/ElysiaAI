<#
.SYNOPSIS
    ⚡ ElysiaAI - Ultimate Network Optimizer (Modern Windows Edition) ⚡
    Compatible with Windows 10/11 and PowerShell 7+.
#>

$ErrorActionPreference = "SilentlyContinue"

function Write-Elysia {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "[ElysiaAI] $Message" -ForegroundColor $Color
}

if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Elysia "CRITICAL: Administrator privileges required!" "Red"
    return
}

Write-Elysia "--- STARTING MODERN NETWORK CALIBRATION ---" "Magenta"

# 1. Modern TCP Stack Tuning
Write-Elysia "[1/4] Tuning Global TCP Parameters..."
# Modern Windows valid parameters
netsh int tcp set global rss=enabled
netsh int tcp set global rsc=enabled
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global ecncapability=enabled
netsh int tcp set global timestamps=disabled
netsh int tcp set global fastopen=enabled
netsh int tcp set global initialrto=2000
netsh int tcp set global maxsynretransmissions=2

# Congestion Provider Check (BBR support)
$tcpStats = netsh int tcp show supplemental
if ($tcpStats -match "bbr") {
    netsh int tcp set supplemental template=internet congestionprovider=bbr
    Write-Elysia "[+] BBR Congestion Control Enabled." "Green"
} else {
    netsh int tcp set supplemental template=internet congestionprovider=cubic
    Write-Elysia "[+] CUBIC Congestion Control Enabled." "Yellow"
}

# 2. Latency & Responsiveness Registry
Write-Elysia "[2/4] Applying Latency Suppression..."
$RegPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces"
Get-ChildItem $RegPath | ForEach-Object {
    Set-ItemProperty -Path $_.PSPath -Name "TcpAckFrequency" -Value 1 -Type DWord
    Set-ItemProperty -Path $_.PSPath -Name "TCPNoDelay" -Value 1 -Type DWord
}

# System Responsiveness for Gaming
$SysProfile = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
Set-ItemProperty -Path $SysProfile -Name "NetworkThrottlingIndex" -Value 0xFFFFFFFF -Type DWord
Set-ItemProperty -Path $SysProfile -Name "SystemResponsiveness" -Value 0 -Type DWord

# 3. Hardware Adapter Optimization
Write-Elysia "[3/4] Fine-tuning Hardware Adapters..."
$Adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
foreach ($Adapter in $Adapters) {
    # Latency: Disable Interrupt Moderation
    Disable-NetAdapterInterruptModeration -Name $Adapter.Name -Confirm:$false
    # Throughput: Disable Flow Control
    Disable-NetAdapterFlowControl -Name $Adapter.Name -Confirm:$false
    # Power Management: Disable Power Saving
    Disable-NetAdapterPowerManagement -Name $Adapter.Name -Confirm:$false
    
    Write-Elysia "[+] Optimized: $($Adapter.Name)" "Green"
}

# 4. Final Flush & Reset
Write-Elysia "[4/4] Purging Buffers & Setting DNS..."
$DnsServers = @("1.1.1.1", "1.0.0.1") # Cloudflare
foreach ($Adapter in $Adapters) {
    Set-DnsClientServerAddress -InterfaceAlias $Adapter.Name -ServerAddresses $DnsServers
}

ipconfig /flushdns
# Using a safer reset that avoids common access-denied errors where possible
netsh winsock reset > $null
netsh int ip reset resetlog.txt > $null

Write-Elysia "--- CALIBRATION COMPLETE ---" "Magenta"
Write-Elysia "Recommended: Please REBOOT your system to apply changes." "Cyan"

# Ping Test
Write-Elysia "Testing connection latency..."
Test-Connection 1.1.1.1 -Count 3 | Select-Object Address, ResponseTime
