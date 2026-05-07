#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet('Status', 'Apply', 'Revert')]
    [string]$Mode = 'Status',

    [ValidateSet('FFXIV', 'Generic')]
    [string]$Profile = 'FFXIV',

    [string]$InterfaceAlias,

    [ValidateSet('None', 'DHCP', 'Cloudflare', 'Google', 'Quad9')]
    [string]$DnsProvider = 'None',

    [string[]]$Endpoint = @(),

    [switch]$FlushDns,
    [switch]$PreferActiveInterface,
    [switch]$StartExitLagService,
    [switch]$AddFirewallRules,
    [switch]$AddQosPolicy,
    [switch]$TraceRoute,

    [ValidateRange(1, 10)]
    [int]$ProbeCount = 3,

    [string]$BackupPath
)

$ErrorActionPreference = 'Stop'
$RulePrefix = 'Elysia Game Route'

function Write-Step {
    param([string]$Message)
    Write-Host "[GameRoute] $Message"
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-DnsServers {
    param([string]$Provider)

    switch ($Provider) {
        'Cloudflare' { return @('1.1.1.1', '1.0.0.1') }
        'Google' { return @('8.8.8.8', '8.8.4.4') }
        'Quad9' { return @('9.9.9.9', '149.112.112.112') }
        default { return @() }
    }
}

function ConvertTo-Endpoint {
    param([string]$Value)

    if ($Value -notmatch '^(.+):([0-9]{1,5})$') {
        throw "Endpoint must be host:port, got: $Value"
    }

    return [pscustomobject]@{
        Host = $Matches[1]
        Port = [int]$Matches[2]
    }
}

function Get-ProfileEndpoints {
    $items = [System.Collections.Generic.List[object]]::new()

    if ($Profile -eq 'FFXIV') {
        @(
            'frontier.ffxiv.com:443',
            'patch-bootver.ffxiv.com:80',
            'patch-gamever.ffxiv.com:80',
            'kamori.goats.dev:443',
            'exitlag.com:443'
        ) | ForEach-Object { $items.Add((ConvertTo-Endpoint $_)) }
    }

    foreach ($custom in $Endpoint) {
        $items.Add((ConvertTo-Endpoint $custom))
    }

    return @($items | Sort-Object Host, Port -Unique)
}

function Get-ActiveInterfaceAlias {
    if ($InterfaceAlias) {
        return $InterfaceAlias
    }

    $route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop |
        Sort-Object RouteMetric, InterfaceMetric |
        Select-Object -First 1

    if (-not $route) {
        throw 'Could not find the active IPv4 default route.'
    }

    $ipInterface = Get-NetIPInterface -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction Stop |
        Select-Object -First 1

    if (-not $ipInterface) {
        throw "Could not resolve interface for route index: $($route.InterfaceIndex)"
    }

    return $ipInterface.InterfaceAlias
}

function Resolve-GamePath {
    $launcherConfig = Join-Path $env:APPDATA 'XIVLauncher\launcherConfigV3.json'
    if (Test-Path -LiteralPath $launcherConfig) {
        try {
            $config = Get-Content -LiteralPath $launcherConfig -Raw | ConvertFrom-Json
            if ($config.GamePath) {
                return [string]$config.GamePath
            }
        } catch {
            Write-Warning "Could not read XIVLauncher config: $($_.Exception.Message)"
        }
    }

    return 'C:\Program Files (x86)\SquareEnix\FINAL FANTASY XIV - A Realm Reborn'
}

function Resolve-XivLauncherExe {
    $candidates = [System.Collections.Generic.List[string]]::new()
    $directCandidates = @(
        (Join-Path $env:LOCALAPPDATA 'XIVLauncher\XIVLauncher.exe'),
        (Join-Path $env:APPDATA 'XIVLauncher\XIVLauncher.exe'),
        (Join-Path $env:ProgramFiles 'XIVLauncher\XIVLauncher.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'XIVLauncher\XIVLauncher.exe')
    )

    foreach ($candidate in $directCandidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            $candidates.Add($candidate)
        }
    }

    $versionedRoot = Join-Path $env:LOCALAPPDATA 'XIVLauncher'
    if (Test-Path -LiteralPath $versionedRoot) {
        Get-ChildItem -LiteralPath $versionedRoot -Directory -Filter 'app-*' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            ForEach-Object {
                $candidate = Join-Path $_.FullName 'XIVLauncher.exe'
                if (Test-Path -LiteralPath $candidate) {
                    $candidates.Add($candidate)
                }
            }
    }

    return @($candidates | Select-Object -First 1)
}

function Get-GamePrograms {
    $programs = [System.Collections.Generic.List[object]]::new()

    if ($Profile -eq 'FFXIV') {
        $gamePath = Resolve-GamePath
        $ffxivExe = Join-Path $gamePath 'game\ffxiv_dx11.exe'
        if (Test-Path -LiteralPath $ffxivExe) {
            $programs.Add([pscustomobject]@{ Name = 'FFXIV'; Path = $ffxivExe })
        }

        $launcherExe = Resolve-XivLauncherExe
        if ($launcherExe) {
            $programs.Add([pscustomobject]@{ Name = 'XIVLauncher'; Path = $launcherExe })
        }
    }

    $exitLagExe = 'C:\Program Files\ExitLag\ExitLag.exe'
    if (Test-Path -LiteralPath $exitLagExe) {
        $programs.Add([pscustomobject]@{ Name = 'ExitLag'; Path = $exitLagExe })
    }

    return @($programs | Sort-Object Path -Unique)
}

function New-RouteBackup {
    param([string]$Alias)

    $backupRoot = Join-Path $env:ProgramData 'ElysiaAI\network-backups'
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

    $path = Join-Path $backupRoot ("game-route-backup-{0}.json" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
    $payload = [ordered]@{
        CreatedAt = (Get-Date).ToString('o')
        ComputerName = $env:COMPUTERNAME
        InterfaceAlias = $Alias
        Dns = @(
            Get-DnsClientServerAddress -InterfaceAlias $Alias -ErrorAction SilentlyContinue |
                Select-Object InterfaceAlias, AddressFamily, ServerAddresses
        )
        IpInterfaces = @(
            Get-NetIPInterface -InterfaceAlias $Alias -ErrorAction SilentlyContinue |
                Select-Object InterfaceAlias, AddressFamily, InterfaceMetric, AutomaticMetric
        )
        FirewallRulePrefix = $RulePrefix
        QosPolicyPrefix = $RulePrefix
    }

    $payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $path -Encoding UTF8
    return $path
}

function Test-Endpoint {
    param(
        [string]$HostName,
        [int]$Port
    )

    $resolved = $null
    try {
        $resolved = Resolve-DnsName $HostName -ErrorAction Stop | Where-Object { $_.IPAddress } | Select-Object -First 1
        if ($resolved) {
            Write-Step "DNS OK: $HostName -> $($resolved.IPAddress)"
        } else {
            Write-Warning "DNS returned no IP address for: $HostName"
            return
        }
    } catch {
        Write-Warning "DNS failed: $HostName ($($_.Exception.Message))"
        return
    }

    try {
        $tcpOk = Test-NetConnection $HostName -Port $Port -InformationLevel Quiet
        if ($tcpOk) {
            Write-Step "TCP OK: $($HostName):$Port"
        } else {
            Write-Warning "TCP failed: $($HostName):$Port"
        }
    } catch {
        Write-Warning "TCP check failed: $($HostName):$Port ($($_.Exception.Message))"
    }

    try {
        $ping = Test-Connection $HostName -Count $ProbeCount -ErrorAction Stop
        $avg = [Math]::Round((($ping | Measure-Object -Property ResponseTime -Average).Average), 1)
        Write-Step "Ping avg: $HostName $avg ms ($ProbeCount samples)"
    } catch {
        Write-Step "Ping skipped/blocked: $HostName"
    }

    if ($TraceRoute) {
        Write-Step "Trace route: $HostName"
        Test-NetConnection $HostName -TraceRoute | Select-Object -ExpandProperty TraceRoute
    }
}

function Show-Status {
    $alias = Get-ActiveInterfaceAlias
    Write-Step "Active interface: $alias"

    $adapter = Get-NetAdapter -Name $alias -ErrorAction SilentlyContinue
    if ($adapter) {
        $adapter | Select-Object Name, Status, LinkSpeed, InterfaceDescription | Format-List
    }

    Write-Step 'Default IPv4 route:'
    Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
        Sort-Object RouteMetric, InterfaceMetric |
        Select-Object ifIndex, InterfaceAlias, NextHop, RouteMetric, InterfaceMetric |
        Format-Table -AutoSize

    Write-Step "DNS servers for $($alias):"
    Get-DnsClientServerAddress -InterfaceAlias $alias -ErrorAction SilentlyContinue |
        Select-Object InterfaceAlias, AddressFamily, ServerAddresses |
        Format-Table -AutoSize

    $svc = Get-Service -Name 'ExitLagPmService' -ErrorAction SilentlyContinue
    if ($svc) {
        Write-Step "ExitLag service: $($svc.Status) / $($svc.StartType)"
    } else {
        Write-Step 'ExitLag service: not found'
    }

    $processes = Get-Process | Where-Object { $_.ProcessName -match 'ExitLag|XIVLauncher|ffxiv' }
    if ($processes) {
        Write-Step 'Related processes:'
        $processes | Select-Object ProcessName, Id, MainWindowTitle | Format-Table -AutoSize
    }

    foreach ($target in Get-ProfileEndpoints) {
        Test-Endpoint -HostName $target.Host -Port $target.Port
    }
}

function Set-DnsProvider {
    param(
        [string]$Alias,
        [string]$Provider
    )

    if ($Provider -eq 'None') {
        return
    }

    if ($Provider -eq 'DHCP') {
        if ($PSCmdlet.ShouldProcess($Alias, 'Reset DNS servers to DHCP')) {
            Set-DnsClientServerAddress -InterfaceAlias $Alias -ResetServerAddresses
            Write-Step "DNS reset to DHCP on: $Alias"
        }
        return
    }

    if ($PSCmdlet.ShouldProcess($Alias, "Set DNS provider to $Provider")) {
        $servers = Get-DnsServers -Provider $Provider
        Set-DnsClientServerAddress -InterfaceAlias $Alias -ServerAddresses $servers
        Write-Step "DNS set to $Provider on: $Alias"
    }
}

function Set-PreferredInterface {
    param([string]$Alias)

    if ($PSCmdlet.ShouldProcess($Alias, 'Prefer this interface for game traffic')) {
        Set-NetIPInterface -InterfaceAlias $Alias -AddressFamily IPv4 -AutomaticMetric Disabled -InterfaceMetric 5
        Set-NetIPInterface -InterfaceAlias $Alias -AddressFamily IPv6 -AutomaticMetric Disabled -InterfaceMetric 15 -ErrorAction SilentlyContinue
        Write-Step "Preferred route metric set on: $Alias"
    }
}

function Add-ProgramFirewallRules {
    foreach ($program in Get-GamePrograms) {
        $ruleName = "$RulePrefix $($program.Name) Outbound"
        $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Step "Firewall rule already exists: $ruleName"
            continue
        }

        if ($PSCmdlet.ShouldProcess($program.Path, "Add outbound firewall allow rule: $ruleName")) {
            New-NetFirewallRule -DisplayName $ruleName -Direction Outbound -Program $program.Path -Action Allow -Profile Any | Out-Null
            Write-Step "Firewall outbound allow: $($program.Name)"
        }
    }
}

function Add-ProgramQosPolicies {
    foreach ($program in Get-GamePrograms | Where-Object { $_.Name -in @('FFXIV', 'XIVLauncher') }) {
        $policyName = "$RulePrefix $($program.Name) QoS"
        $existing = Get-NetQosPolicy -Name $policyName -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Step "QoS policy already exists: $policyName"
            continue
        }

        if ($PSCmdlet.ShouldProcess($program.Path, "Add DSCP QoS policy: $policyName")) {
            try {
                New-NetQosPolicy -Name $policyName -AppPathNameMatchCondition $program.Path -DSCPAction 46 -NetworkProfile All | Out-Null
                Write-Step "QoS DSCP 46 policy added: $($program.Name)"
            } catch {
                Write-Warning "Could not add QoS policy for $($program.Name): $($_.Exception.Message)"
            }
        }
    }
}

function Invoke-Apply {
    if (-not (Test-IsAdmin)) {
        throw 'Run PowerShell as Administrator for Mode=Apply.'
    }

    $alias = Get-ActiveInterfaceAlias
    Write-Step "Target interface: $alias"
    $backup = New-RouteBackup -Alias $alias
    Write-Step "Backup saved: $backup"

    if ($FlushDns) {
        if ($PSCmdlet.ShouldProcess('DNS resolver cache', 'Flush DNS cache')) {
            Clear-DnsClientCache
            Write-Step 'DNS resolver cache flushed.'
        }
    }

    Set-DnsProvider -Alias $alias -Provider $DnsProvider

    if ($PreferActiveInterface) {
        Set-PreferredInterface -Alias $alias
    }

    if ($StartExitLagService) {
        $svc = Get-Service -Name 'ExitLagPmService' -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -ne 'Running') {
            if ($PSCmdlet.ShouldProcess('ExitLagPmService', 'Start service')) {
                Start-Service -Name 'ExitLagPmService'
                Write-Step 'ExitLagPmService started.'
            }
        } elseif ($svc) {
            Write-Step 'ExitLagPmService is already running.'
        } else {
            Write-Step 'ExitLagPmService was not found.'
        }
    }

    if ($AddFirewallRules) {
        Add-ProgramFirewallRules
    }

    if ($AddQosPolicy) {
        Add-ProgramQosPolicies
    }

    foreach ($target in Get-ProfileEndpoints) {
        Test-Endpoint -HostName $target.Host -Port $target.Port
    }
}

function Invoke-Revert {
    if (-not (Test-IsAdmin)) {
        throw 'Run PowerShell as Administrator for Mode=Revert.'
    }

    if (-not $BackupPath) {
        $backupRoot = Join-Path $env:ProgramData 'ElysiaAI\network-backups'
        $latest = Get-ChildItem -Path $backupRoot -Filter 'game-route-backup-*.json' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1

        if (-not $latest) {
            throw 'No game route backup found. Pass -BackupPath explicitly.'
        }

        $BackupPath = $latest.FullName
    }

    $backup = Get-Content -LiteralPath $BackupPath -Raw | ConvertFrom-Json
    $alias = [string]$backup.InterfaceAlias
    Write-Step "Restoring from: $BackupPath"

    $dnsServers = @()
    foreach ($dns in $backup.Dns) {
        $dnsServers += @($dns.ServerAddresses | Where-Object { $_ })
    }

    if ($PSCmdlet.ShouldProcess($alias, 'Restore DNS servers')) {
        if ($dnsServers.Count -gt 0) {
            Set-DnsClientServerAddress -InterfaceAlias $alias -ServerAddresses $dnsServers
        } else {
            Set-DnsClientServerAddress -InterfaceAlias $alias -ResetServerAddresses
        }
    }

    foreach ($ip in $backup.IpInterfaces) {
        if ($PSCmdlet.ShouldProcess($alias, "Restore interface metric for $($ip.AddressFamily)")) {
            Set-NetIPInterface -InterfaceAlias $alias -AddressFamily $ip.AddressFamily -AutomaticMetric $ip.AutomaticMetric -InterfaceMetric $ip.InterfaceMetric -ErrorAction SilentlyContinue
        }
    }

    Get-NetFirewallRule -DisplayName "$RulePrefix *" -ErrorAction SilentlyContinue | ForEach-Object {
        if ($PSCmdlet.ShouldProcess($_.DisplayName, 'Remove firewall rule')) {
            Remove-NetFirewallRule -Name $_.Name
            Write-Step "Removed firewall rule: $($_.DisplayName)"
        }
    }

    Get-NetQosPolicy -Name "$RulePrefix *" -ErrorAction SilentlyContinue | ForEach-Object {
        if ($PSCmdlet.ShouldProcess($_.Name, 'Remove QoS policy')) {
            Remove-NetQosPolicy -Name $_.Name -Confirm:$false
            Write-Step "Removed QoS policy: $($_.Name)"
        }
    }

    if ($PSCmdlet.ShouldProcess('DNS resolver cache', 'Flush DNS cache')) {
        Clear-DnsClientCache
        Write-Step 'DNS resolver cache flushed.'
    }
}

switch ($Mode) {
    'Status' { Show-Status }
    'Apply' { Invoke-Apply }
    'Revert' { Invoke-Revert }
}
