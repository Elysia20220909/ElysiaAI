<#
.SYNOPSIS
    Ethernet optimizer for Windows 10/11.

.DESCRIPTION
    Applies conservative Ethernet-focused TCP and adapter tuning.
    The script creates a JSON backup before changes and can restore from it.

.EXAMPLES
    powershell -ExecutionPolicy Bypass -File .\scripts\ethernet-optimize.ps1 -Mode Status
    powershell -ExecutionPolicy Bypass -File .\scripts\ethernet-optimize.ps1 -Mode Apply -DnsProvider Cloudflare
    powershell -ExecutionPolicy Bypass -File .\scripts\ethernet-optimize.ps1 -Mode Apply -LowLatencyGaming
    powershell -ExecutionPolicy Bypass -File .\scripts\ethernet-optimize.ps1 -Mode Revert -BackupPath C:\ProgramData\ElysiaAI\network-backups\ethernet-backup-20260430-220000.json
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet("Status", "Apply", "Revert")]
    [string]$Mode = "Status",

    [string]$AdapterName,

    [ValidateSet("None", "DHCP", "Cloudflare", "Google", "Quad9")]
    [string]$DnsProvider = "None",

    [switch]$LowLatencyGaming,

    [switch]$DisableEnergySaving,

    [switch]$NoRestartAdapter,

    [string]$BackupPath
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "[EthernetOptimizer] $Message" -ForegroundColor $Color
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-Soft {
    param(
        [string]$Label,
        [scriptblock]$Action
    )

    try {
        & $Action
        Write-Step "[OK] $Label" "Green"
    }
    catch {
        Write-Step "[SKIP] $Label - $($_.Exception.Message)" "Yellow"
    }
}

function Get-TargetAdapters {
    $adapters = Get-NetAdapter -Physical | Where-Object {
        $label = "$($_.Name) $($_.InterfaceDescription)"
        $isWireless = $label -match "Wi-Fi|Wireless|WLAN|802\.11|AX[0-9]|AC[0-9]"
        $_.Status -ne "Disabled" -and -not $isWireless -and (
            $_.Name -match "Ethernet" -or
            $_.InterfaceDescription -match "Ethernet|GbE|2\.5G|5G|10G|Realtek|Intel|Killer|Marvell|Aquantia"
        )
    }

    if ($AdapterName) {
        $adapters = $adapters | Where-Object { $_.Name -eq $AdapterName -or $_.InterfaceDescription -like "*$AdapterName*" }
    }

    return @($adapters)
}

function Get-DnsServers {
    param([string]$Provider)

    switch ($Provider) {
        "Cloudflare" { return @("1.1.1.1", "1.0.0.1", "2606:4700:4700::1111", "2606:4700:4700::1001") }
        "Google"     { return @("8.8.8.8", "8.8.4.4", "2001:4860:4860::8888", "2001:4860:4860::8844") }
        "Quad9"      { return @("9.9.9.9", "149.112.112.112", "2620:fe::fe", "2620:fe::9") }
        default      { return @() }
    }
}

function Get-TcpGlobalSnapshot {
    $lines = netsh int tcp show global
    return @{
        Raw = @($lines)
    }
}

function New-Backup {
    param([array]$Adapters)

    $backupRoot = Join-Path $env:ProgramData "ElysiaAI\network-backups"
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

    $path = Join-Path $backupRoot ("ethernet-backup-{0}.json" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
    $payload = [ordered]@{
        CreatedAt = (Get-Date).ToString("o")
        ComputerName = $env:COMPUTERNAME
        TcpGlobal = Get-TcpGlobalSnapshot
        Adapters = @()
    }

    foreach ($adapter in $Adapters) {
        $dns = Get-DnsClientServerAddress -InterfaceAlias $adapter.Name -ErrorAction SilentlyContinue
        $power = Get-NetAdapterPowerManagement -Name $adapter.Name -ErrorAction SilentlyContinue
        $rss = Get-NetAdapterRss -Name $adapter.Name -ErrorAction SilentlyContinue
        $advanced = Get-NetAdapterAdvancedProperty -Name $adapter.Name -ErrorAction SilentlyContinue

        $payload.Adapters += [ordered]@{
            Name = $adapter.Name
            InterfaceDescription = $adapter.InterfaceDescription
            InterfaceGuid = $adapter.InterfaceGuid
            MacAddress = $adapter.MacAddress
            Dns = @($dns | Select-Object InterfaceAlias, AddressFamily, ServerAddresses)
            PowerManagement = $power
            Rss = $rss
            AdvancedProperties = @($advanced | Select-Object DisplayName, DisplayValue, RegistryKeyword, RegistryValue)
        }
    }

    $payload | ConvertTo-Json -Depth 8 | Set-Content -Path $path -Encoding UTF8
    return $path
}

function Show-Status {
    $adapters = Get-TargetAdapters
    if (-not $adapters) {
        Write-Step "No Ethernet-like physical adapters were found." "Yellow"
        return
    }

    Write-Step "Detected Ethernet adapters:"
    $adapters | Format-Table Name, Status, LinkSpeed, MacAddress, InterfaceDescription -AutoSize

    Write-Step "TCP global state:"
    netsh int tcp show global

    foreach ($adapter in $adapters) {
        Write-Step "DNS for $($adapter.Name):"
        Get-DnsClientServerAddress -InterfaceAlias $adapter.Name | Format-Table InterfaceAlias, AddressFamily, ServerAddresses -AutoSize
    }
}

function Apply-Optimization {
    $adapters = Get-TargetAdapters
    if (-not $adapters) {
        throw "No Ethernet-like physical adapters were found. Use -AdapterName to target one explicitly."
    }

    $createdBackup = New-Backup -Adapters $adapters
    Write-Step "Backup saved: $createdBackup" "Green"

    Write-Step "Applying conservative TCP tuning..."
    Invoke-Soft "Enable TCP receive-side scaling" { netsh int tcp set global rss=enabled | Out-Null }
    Invoke-Soft "Enable receive segment coalescing" { netsh int tcp set global rsc=enabled | Out-Null }
    Invoke-Soft "Use normal auto-tuning" { netsh int tcp set global autotuninglevel=normal | Out-Null }
    Invoke-Soft "Enable ECN capability" { netsh int tcp set global ecncapability=enabled | Out-Null }
    Invoke-Soft "Disable TCP timestamps" { netsh int tcp set global timestamps=disabled | Out-Null }
    Invoke-Soft "Enable TCP Fast Open" { netsh int tcp set global fastopen=enabled | Out-Null }

    foreach ($adapter in $adapters) {
        Write-Step "Optimizing adapter: $($adapter.Name)"

        Invoke-Soft "Enable RSS on $($adapter.Name)" {
            Enable-NetAdapterRss -Name $adapter.Name -ErrorAction Stop
        }

        if ($DisableEnergySaving) {
            Invoke-Soft "Disable power saving on $($adapter.Name)" {
                Disable-NetAdapterPowerManagement -Name $adapter.Name -ErrorAction Stop
            }
        }

        if ($LowLatencyGaming) {
            Invoke-Soft "Disable interrupt moderation on $($adapter.Name)" {
                Disable-NetAdapterInterruptModeration -Name $adapter.Name -Confirm:$false -ErrorAction Stop
            }
            Invoke-Soft "Disable flow control on $($adapter.Name)" {
                Disable-NetAdapterFlowControl -Name $adapter.Name -Confirm:$false -ErrorAction Stop
            }
        }

        if ($DnsProvider -eq "DHCP") {
            Invoke-Soft "Reset DNS to DHCP on $($adapter.Name)" {
                Set-DnsClientServerAddress -InterfaceAlias $adapter.Name -ResetServerAddresses -ErrorAction Stop
            }
        }
        elseif ($DnsProvider -ne "None") {
            $servers = Get-DnsServers -Provider $DnsProvider
            Invoke-Soft "Set $DnsProvider DNS on $($adapter.Name)" {
                Set-DnsClientServerAddress -InterfaceAlias $adapter.Name -ServerAddresses $servers -ErrorAction Stop
            }
        }

        if (-not $NoRestartAdapter -and $PSCmdlet.ShouldProcess($adapter.Name, "Restart network adapter")) {
            Invoke-Soft "Restart $($adapter.Name)" {
                Restart-NetAdapter -Name $adapter.Name -Confirm:$false -ErrorAction Stop
            }
        }
    }

    Invoke-Soft "Flush DNS cache" { Clear-DnsClientCache }
    Write-Step "Done. Reboot Windows if link speed or latency does not change immediately." "Green"
}

function Restore-Backup {
    if (-not $BackupPath) {
        $backupRoot = Join-Path $env:ProgramData "ElysiaAI\network-backups"
        $latest = Get-ChildItem -Path $backupRoot -Filter "ethernet-backup-*.json" -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1

        if (-not $latest) {
            throw "No backup found. Pass -BackupPath explicitly."
        }

        $BackupPath = $latest.FullName
    }

    $backup = Get-Content -Path $BackupPath -Raw | ConvertFrom-Json
    Write-Step "Restoring adapter DNS and selected adapter settings from: $BackupPath"

    foreach ($saved in $backup.Adapters) {
        $adapter = Get-NetAdapter -Name $saved.Name -ErrorAction SilentlyContinue
        if (-not $adapter) {
            Write-Step "[SKIP] Adapter not found: $($saved.Name)" "Yellow"
            continue
        }

        $ipv4Dns = @($saved.Dns | Where-Object { $_.AddressFamily -eq 2 } | Select-Object -ExpandProperty ServerAddresses)
        $ipv6Dns = @($saved.Dns | Where-Object { $_.AddressFamily -eq 23 } | Select-Object -ExpandProperty ServerAddresses)

        if ($ipv4Dns.Count -gt 0) {
            Invoke-Soft "Restore IPv4 DNS on $($saved.Name)" {
                Set-DnsClientServerAddress -InterfaceAlias $saved.Name -AddressFamily IPv4 -ServerAddresses $ipv4Dns -ErrorAction Stop
            }
        }
        else {
            Invoke-Soft "Reset IPv4 DNS on $($saved.Name)" {
                Set-DnsClientServerAddress -InterfaceAlias $saved.Name -AddressFamily IPv4 -ResetServerAddresses -ErrorAction Stop
            }
        }

        if ($ipv6Dns.Count -gt 0) {
            Invoke-Soft "Restore IPv6 DNS on $($saved.Name)" {
                Set-DnsClientServerAddress -InterfaceAlias $saved.Name -AddressFamily IPv6 -ServerAddresses $ipv6Dns -ErrorAction Stop
            }
        }
        else {
            Invoke-Soft "Reset IPv6 DNS on $($saved.Name)" {
                Set-DnsClientServerAddress -InterfaceAlias $saved.Name -AddressFamily IPv6 -ResetServerAddresses -ErrorAction Stop
            }
        }

        if (-not $NoRestartAdapter -and $PSCmdlet.ShouldProcess($saved.Name, "Restart network adapter")) {
            Invoke-Soft "Restart $($saved.Name)" {
                Restart-NetAdapter -Name $saved.Name -Confirm:$false -ErrorAction Stop
            }
        }
    }

    Invoke-Soft "Flush DNS cache" { Clear-DnsClientCache }
    Write-Step "Restore finished. TCP global settings are shown below for manual review:" "Green"
    netsh int tcp show global
}

if ($Mode -in @("Apply", "Revert") -and -not (Test-IsAdmin)) {
    throw "Run PowerShell as Administrator for Mode=$Mode."
}

switch ($Mode) {
    "Status" { Show-Status }
    "Apply"  { Apply-Optimization }
    "Revert" { Restore-Backup }
}
