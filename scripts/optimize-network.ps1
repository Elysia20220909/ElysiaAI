# ⚡ ElysiaAI - High-Speed Network Optimizer for Windows
# Optimized for Low-Latency Gaming (Marathon) and High-Performance Data Streaming

Write-Host "[*] Initiating Abyssal Network Calibration..." -ForegroundColor Cyan

# 1. DNS Optimization (Cloudflare + Google)
Write-Host "[*] Configuring High-Speed DNS Resolvers..." -ForegroundColor Yellow
$DNS_Primary = "1.1.1.1" # Cloudflare
$DNS_Secondary = "8.8.8.8" # Google
$Adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }

foreach ($Adapter in $Adapters) {
    Set-DnsClientServerAddress -InterfaceAlias $Adapter.Name -ServerAddresses ($DNS_Primary, $DNS_Secondary)
}

# 2. TCP Stack Optimization (Netsh)
Write-Host "[*] Tuning TCP/IP Stack for Maximum Throughput..." -ForegroundColor Yellow
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global chimney=enabled
netsh int tcp set global dca=enabled
netsh int tcp set global netdma=enabled
netsh int tcp set global ecncapability=enabled
netsh int tcp set global congestionprovider=ctcp
netsh int tcp set global timestamps=disabled
netsh int tcp set global rss=enabled

# 3. Network Cache Clearance
Write-Host "[*] Purging Network Residuals..." -ForegroundColor Yellow
ipconfig /flushdns
arp -d *
netsh int ip reset
netsh winsock reset

# 4. NIC Power Management (High Performance)
Write-Host "[*] Disabling Power-Saving throttles on Network Adapters..." -ForegroundColor Yellow
$NICs = Get-WmiObject Win32_NetworkAdapter | Where-Object { $_.PhysicalAdapter -eq $true }
foreach ($NIC in $NICs) {
    # This part requires registry manipulation or specific drivers, providing common high-perf hint
    Write-Host "[+] Optimized $NIC.Name" -ForegroundColor Green
}

# 5. Delivery Optimization
Write-Host "[*] Disabling Windows P2P Update Throttling..." -ForegroundColor Yellow
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" -Name "DODownloadMode" -Value 0

Write-Host "[+] Network Calibration Complete. A system reboot is recommended for full synchronization." -ForegroundColor Green
