#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet('Balanced', 'Performance', 'Ultra')]
    [string]$Profile = 'Performance',

    [string]$GamePath,
    [string]$ConfigDir,
    [string]$XivLauncherPath,

    [bool]$FlushDns = $true,
    [bool]$QuietStartup = $true,

    [switch]$OptimizePreset,
    [switch]$ShowActiveEffects,
    [switch]$DisableGameDvr,
    [switch]$SkipNetworkCheck,
    [switch]$SkipFFXIVConfig,
    [switch]$SkipGShade,
    [switch]$SkipBootFix,
    [switch]$NoLaunch,
    [switch]$WaitForGame,
    [switch]$SetProcessPriority,
    [switch]$ReportOnly,

    [ValidateRange(5, 600)]
    [int]$WaitTimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "[FFXIV Comfort] $Message"
}

function Resolve-FFXIVConfigDir {
    param([string]$OverridePath)

    if ($OverridePath) {
        return $OverridePath
    }

    return (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'My Games\FINAL FANTASY XIV - A Realm Reborn')
}

function Resolve-ConfiguredGamePath {
    param([string]$OverridePath)

    if ($OverridePath) {
        return $OverridePath
    }

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

function Resolve-XivLauncherPath {
    param([string]$OverridePath)

    if ($OverridePath) {
        if (Test-Path -LiteralPath $OverridePath) {
            return (Resolve-Path -LiteralPath $OverridePath).Path
        }

        throw "XIVLauncher was not found at: $OverridePath"
    }

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

    $startMenuCandidates = @(
        (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\XIVLauncher.lnk'),
        (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs\XIVLauncher.lnk')
    )

    foreach ($candidate in $startMenuCandidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            $candidates.Add($candidate)
        }
    }

    if ($candidates.Count -gt 0) {
        return $candidates[0]
    }

    throw @'
Could not find XIVLauncher automatically.
Pass -XivLauncherPath with the full path to XIVLauncher.exe or its Start Menu shortcut.
'@
}

function Read-TextPreservingEncoding {
    param([string]$Path)

    $bytes = [System.IO.File]::ReadAllBytes($Path)

    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $encoding = [System.Text.UTF8Encoding]::new($true)
        return @{ Text = $encoding.GetString($bytes); Encoding = $encoding }
    }

    try {
        $encoding = [System.Text.UTF8Encoding]::new($false, $true)
        return @{ Text = $encoding.GetString($bytes); Encoding = [System.Text.UTF8Encoding]::new($false) }
    } catch {
        $encoding = [System.Text.Encoding]::Default
        return @{ Text = $encoding.GetString($bytes); Encoding = $encoding }
    }
}

function Set-BootConfigValue {
    param(
        [System.Collections.Generic.List[string]]$Lines,
        [string]$Key,
        [string]$Value
    )

    $pattern = '^\s*' + [regex]::Escape($Key) + '\s+'
    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -match $pattern) {
            $Lines[$i] = "$Key`t$Value"
            return
        }
    }

    $versionIndex = -1
    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -match '^\s*<Version>\s*$') {
            $versionIndex = $i
            break
        }
    }

    if ($versionIndex -ge 0) {
        $Lines.Insert($versionIndex + 1, "$Key`t$Value")
    } else {
        $Lines.Add('')
        $Lines.Add('<Version>')
        $Lines.Add("$Key`t$Value")
    }
}

function Set-FFXIVBootComfort {
    param([string]$ConfigDirectory)

    $bootPath = Join-Path $ConfigDirectory 'FFXIV_BOOT.cfg'
    if (-not (Test-Path -LiteralPath $bootPath)) {
        Write-Warning "Could not find FFXIV_BOOT.cfg at: $bootPath"
        return
    }

    $read = Read-TextPreservingEncoding -Path $bootPath
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.AddRange([string[]]([regex]::Split($read.Text, "\r?\n")))

    Set-BootConfigValue -Lines $lines -Key 'DX11Enabled' -Value '1'
    Set-BootConfigValue -Lines $lines -Key 'BootVersionCheckMode' -Value '1'

    if ($ReportOnly) {
        Write-Step 'ReportOnly: would ensure DX11Enabled=1 and BootVersionCheckMode=1.'
        return
    }

    if ($PSCmdlet.ShouldProcess($bootPath, 'Apply FFXIV boot comfort settings')) {
        $backupPath = "$bootPath.bak-comfort-$(Get-Date -Format yyyyMMdd-HHmmss)"
        Copy-Item -LiteralPath $bootPath -Destination $backupPath -Force
        [System.IO.File]::WriteAllText($bootPath, ($lines -join "`r`n"), $read.Encoding)
        Write-Step "Boot config backup: $backupPath"
        Write-Step 'Ensured DX11Enabled=1 and BootVersionCheckMode=1.'
    }
}

function Invoke-ComfortScript {
    param(
        [string]$ScriptName,
        [hashtable]$Arguments,
        [string]$Action
    )

    $scriptPath = Join-Path $PSScriptRoot $ScriptName
    if (-not (Test-Path -LiteralPath $scriptPath)) {
        throw "Missing helper script: $scriptPath"
    }

    if ($ReportOnly -and $ScriptName -eq 'Optimize-FFXIVGShade.ps1') {
        Write-Step 'ReportOnly: skipped GShade file changes.'
        return
    }

    if ($PSCmdlet.ShouldProcess($scriptPath, $Action)) {
        & $scriptPath @Arguments
    }
}

function Test-ComfortEndpoint {
    param(
        [string]$HostName,
        [int]$Port
    )

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
        $ok = Test-NetConnection $HostName -Port $Port -InformationLevel Quiet
        if ($ok) {
            Write-Step "TCP OK: $($HostName):$Port"
        } else {
            Write-Warning "TCP failed: $($HostName):$Port"
        }
    } catch {
        Write-Warning "TCP check failed: $($HostName):$Port ($($_.Exception.Message))"
    }
}

function Invoke-NetworkComfort {
    if ($FlushDns -and -not $ReportOnly) {
        if ($PSCmdlet.ShouldProcess('DNS resolver cache', 'Flush DNS cache')) {
            ipconfig /flushdns | Out-Null
            Write-Step 'Flushed DNS resolver cache.'
        }
    } elseif ($FlushDns -and $ReportOnly) {
        Write-Step 'ReportOnly: would flush DNS resolver cache.'
    }

    Test-ComfortEndpoint -HostName 'frontier.ffxiv.com' -Port 443
    Test-ComfortEndpoint -HostName 'patch-bootver.ffxiv.com' -Port 80
    Test-ComfortEndpoint -HostName 'patch-gamever.ffxiv.com' -Port 80
    Test-ComfortEndpoint -HostName 'kamori.goats.dev' -Port 443
}

function Set-GamePriority {
    $processes = Get-Process -Name 'ffxiv_dx11' -ErrorAction SilentlyContinue
    if (-not $processes) {
        Write-Step 'FFXIV is not running; process priority was not changed.'
        return
    }

    foreach ($process in $processes) {
        try {
            $process.PriorityClass = 'AboveNormal'
            Write-Step "Set ffxiv_dx11.exe pid=$($process.Id) priority to AboveNormal."
        } catch {
            Write-Warning "Could not set priority for pid=$($process.Id): $($_.Exception.Message)"
        }
    }
}

function Wait-ForGameProcess {
    param([int]$TimeoutSeconds)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $process = Get-Process -Name 'ffxiv_dx11' -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($process) {
            Write-Step "Detected ffxiv_dx11.exe pid=$($process.Id)."
            return $true
        }

        Start-Sleep -Seconds 2
    }

    Write-Warning "ffxiv_dx11.exe was not detected within $TimeoutSeconds seconds."
    return $false
}

function Start-XivLauncherComfort {
    $running = Get-Process | Where-Object { $_.ProcessName -like 'XIVLauncher*' } | Select-Object -First 1
    if ($running) {
        Write-Step "XIVLauncher is already running: pid=$($running.Id) title='$($running.MainWindowTitle)'"
        return
    }

    $launcherPath = Resolve-XivLauncherPath -OverridePath $XivLauncherPath
    Write-Step "XIVLauncher: $launcherPath"

    if ($PSCmdlet.ShouldProcess($launcherPath, 'Start XIVLauncher')) {
        if ($launcherPath -like '*.lnk') {
            Start-Process -FilePath $launcherPath
        } else {
            Start-Process -FilePath $launcherPath -WorkingDirectory (Split-Path -Parent $launcherPath)
        }
        Write-Step 'Started XIVLauncher.'
    }
}

$resolvedConfigDir = Resolve-FFXIVConfigDir -OverridePath $ConfigDir
$resolvedGamePath = Resolve-ConfiguredGamePath -OverridePath $GamePath

Write-Step "Profile: $Profile"
Write-Step "Config dir: $resolvedConfigDir"
Write-Step "Game path: $resolvedGamePath"

if (-not $SkipNetworkCheck) {
    Invoke-NetworkComfort
} else {
    Write-Step 'Skipped network checks.'
}

if (-not $SkipFFXIVConfig) {
    $ffxivArgs = @{
        Profile = $Profile
        ConfigDir = $resolvedConfigDir
    }

    if ($DisableGameDvr) {
        $ffxivArgs.DisableGameDvr = $true
    }
    if ($ReportOnly) {
        $ffxivArgs.ReportOnly = $true
    }

    Invoke-ComfortScript -ScriptName 'Optimize-FFXIV.ps1' -Arguments $ffxivArgs -Action "Apply FFXIV $Profile comfort profile"
} else {
    Write-Step 'Skipped FFXIV config optimization.'
}

if (-not $SkipBootFix) {
    Set-FFXIVBootComfort -ConfigDirectory $resolvedConfigDir
} else {
    Write-Step 'Skipped boot config comfort fix.'
}

if (-not $SkipGShade) {
    $gshadeArgs = @{
        Profile = $Profile
        GamePath = $resolvedGamePath
    }

    if ($OptimizePreset) {
        $gshadeArgs.OptimizePreset = $true
    }
    if ($QuietStartup) {
        $gshadeArgs.QuietStartup = $true
    }
    if ($ShowActiveEffects) {
        $gshadeArgs.ShowActiveEffects = $true
    }

    Invoke-ComfortScript -ScriptName 'Optimize-FFXIVGShade.ps1' -Arguments $gshadeArgs -Action "Apply GShade $Profile comfort profile"
} else {
    Write-Step 'Skipped GShade optimization.'
}

if ($NoLaunch) {
    Write-Step 'NoLaunch was set; XIVLauncher was not started.'
} else {
    Start-XivLauncherComfort
}

if ($WaitForGame) {
    $detected = Wait-ForGameProcess -TimeoutSeconds $WaitTimeoutSeconds
    if ($detected -and $SetProcessPriority) {
        Set-GamePriority
    }
} elseif ($SetProcessPriority) {
    Set-GamePriority
}

Write-Step 'Done.'
