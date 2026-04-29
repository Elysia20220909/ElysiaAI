<#
.SYNOPSIS
    🌌 ElysiaAI - Abyssal DNS Sentinel & Radar 🌌
    Real-time Network Stability Monitoring & Dynamic DNS Optimization.
    
    This script benchmarks multiple DNS providers and applies the fastest one,
    then enters a monitoring mode to visualize jitter and latency.
#>

$ErrorActionPreference = "SilentlyContinue"

function Write-Elysia {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "[ElysiaAI] $Message" -ForegroundColor $Color
}

function Show-Header {
    Clear-Host
    Write-Host "=========================================================" -ForegroundColor Magenta
    Write-Host "   📡 ELYSIA AI - ABYSSAL DNS SENTINEL & RADAR 📡" -ForegroundColor White
    Write-Host "        Dynamic Optimization & Stability Monitor" -ForegroundColor Yellow
    Write-Host "=========================================================" -ForegroundColor Magenta
}

if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Show-Header
    Write-Elysia "CRITICAL: Administrator privileges required for DNS changes!" "Red"
    pause
    return
}

Show-Header
Write-Elysia "Initializing Abyssal Resolver Benchmark..." "Cyan"

$DnsProviders = @(
    @{ Name = "Cloudflare"; IPs = @("1.1.1.1", "1.0.0.1") },
    @{ Name = "Google"; IPs = @("8.8.8.8", "8.8.4.4") },
    @{ Name = "Quad9"; IPs = @("9.9.9.9", "149.112.112.112") },
    @{ Name = "AdGuard"; IPs = @("94.140.14.14", "94.140.15.15") },
    @{ Name = "OpenDNS"; IPs = @("208.67.222.222", "208.67.220.220") }
)

$Results = @()

foreach ($Provider in $DnsProviders) {
    Write-Host "Testing $($Provider.Name)... " -NoNewline
    $avg = 0
    $count = 3
    for ($i=0; $i -lt $count; $i++) {
        $t = Measure-Command { Test-Connection $Provider.IPs[0] -Count 1 -ErrorAction SilentlyContinue }
        $avg += $t.TotalMilliseconds
    }
    $finalAvg = [math]::Round($avg / $count, 2)
    Write-Host "[$($finalAvg)ms]" -ForegroundColor Yellow
    $Results += [PSCustomObject]@{ Name = $Provider.Name; Latency = $finalAvg; IPs = $Provider.IPs }
}

$Best = $Results | Sort-Object Latency | Select-Object -First 1
Write-Host ""
Write-Elysia "Winner: $($Best.Name) with $($Best.Latency)ms average." "Green"

# Apply best DNS
$Adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.HardwareInterfaceGuid }
foreach ($Adapter in $Adapters) {
    Set-DnsClientServerAddress -InterfaceAlias $Adapter.Name -ServerAddresses $Best.IPs
    Write-Elysia "[+] Applied to $($Adapter.Name)" "Green"
}

ipconfig /flushdns | Out-Null
Write-Elysia "DNS Cache Flushed. Starting Real-time Radar..." "Magenta"
Start-Sleep -Seconds 2

# --- Real-time Radar Mode ---
$History = @()
$MaxHistory = 20

try {
    while ($true) {
        Show-Header
        Write-Host "Current DNS: " -NoNewline; Write-Host "$($Best.Name) ($($Best.IPs[0]))" -ForegroundColor Green
        Write-Host "Status: " -NoNewline; Write-Host "ACTIVE MONITORING" -ForegroundColor Cyan
        Write-Host "---------------------------------------------------------"
        
        $p = Test-Connection 1.1.1.1 -Count 1 -ErrorAction SilentlyContinue
        if ($p) {
            $ms = $p.ResponseTime
            $History += $ms
            if ($History.Count -gt $MaxHistory) { $History = $History[1..$MaxHistory] }
            
            # Calculate Jitter
            $jitter = 0
            if ($History.Count -gt 1) {
                for ($i=1; $i -lt $History.Count; $i++) {
                    $jitter += [math]::Abs($History[$i] - $History[$i-1])
                }
                $jitter = [math]::Round($jitter / ($History.Count -1), 2)
            }

            # Visual Radar
            $barLength = [math]::Min([int]($ms / 2), 40)
            $bar = "█" * $barLength
            $color = "Green"
            if ($ms -gt 50) { $color = "Yellow" }
            if ($ms -gt 100) { $color = "Red" }

            Write-Host "Latency: " -NoNewline; Write-Host "$($ms)ms " -ForegroundColor $color -NoNewline
            Write-Host "[$bar]" -ForegroundColor $color
            Write-Host "Jitter:  " -NoNewline; Write-Host "$($jitter)ms" -ForegroundColor ($jitter -lt 5 ? "Green" : "Yellow")
            
            if ($jitter -gt 15) {
                Write-Host "WARNING: High Jitter detected! (Network unstable)" -ForegroundColor Red
            }
        } else {
            Write-Host "LATENCY: TIMEOUT / PACKET LOSS" -ForegroundColor Red
        }

        Write-Host "---------------------------------------------------------"
        Write-Host "Press CTRL+C to stop the Abyssal Sentinel." -ForegroundColor Gray
        
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Elysia "Sentinel de-activated." "Yellow"
}
