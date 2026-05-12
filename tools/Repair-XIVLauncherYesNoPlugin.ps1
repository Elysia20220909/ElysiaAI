#requires -Version 5.1
<#
.SYNOPSIS
Checks and repairs the XIVLauncher/Dalamud YesAlready yes/no plugin setup.

.DESCRIPTION
Manual operator tool for local XIVLauncher files.

This script does not click game UI, send keyboard/mouse input, install hotkeys,
or run any background automation. It only reads local XIVLauncher configuration
and, in Repair/ResetConfig modes, writes local config after making backups.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet('Status', 'Repair', 'ResetConfig')]
    [string]$Mode = 'Status',

    [string]$XivLauncherRoot = (Join-Path $env:APPDATA 'XIVLauncher'),
    [string]$PluginInternalName = 'YesAlready',
    [string]$RequiredRepositoryUrl = 'https://love.puni.sh/ment.json',

    [switch]$EnablePlugin,
    [switch]$AddRepository,
    [switch]$EnableAutoUpdate,
    [switch]$CheckRepository,
    [switch]$OpenConfigFolder,
    [switch]$ForceWhenRunning
)

$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "[XIVLauncher YesNo] $Message"
}

function Write-Ok {
    param([string]$Message)
    Write-Host "[OK] $Message"
}

function Write-Warn {
    param([string]$Message)
    Write-Warning $Message
}

function Get-RelatedProcess {
    $names = @('ffxiv_dx11', 'ffxiv', 'XIVLauncher', 'Dalamud')
    @(Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $processName = $_.ProcessName
        $names | Where-Object { $processName -like "$_*" }
    })
}

function Assert-CanWriteConfig {
    $running = @(Get-RelatedProcess)
    if ($running.Count -eq 0) {
        return
    }

    $summary = ($running | Select-Object -First 8 | ForEach-Object {
        "$($_.ProcessName):$($_.Id)"
    }) -join ', '

    if (-not $ForceWhenRunning) {
        throw "XIVLauncher/FFXIV is running ($summary). Close it first, then rerun. Use -ForceWhenRunning only if you intentionally accept overwrite risk."
    }

    Write-Warn "Editing while related processes are running: $summary"
}

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    try {
        Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    } catch {
        throw "Could not parse JSON: $Path ($($_.Exception.Message))"
    }
}

function Write-JsonFile {
    param(
        [string]$Path,
        [object]$Value
    )

    $json = $Value | ConvertTo-Json -Depth 100
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, ($json + [Environment]::NewLine), $utf8)
}

function Set-JsonProperty {
    param(
        [object]$Object,
        [string]$Name,
        [object]$Value
    )

    if ($Object.PSObject.Properties.Name -contains $Name) {
        $Object.$Name = $Value
    } else {
        $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
    }
}

function New-BackupDirectory {
    $path = Join-Path (Join-Path $XivLauncherRoot 'backups') (
        'yesno-plugin-{0}' -f (Get-Date -Format 'yyyyMMdd-HHmmss')
    )

    if ($PSCmdlet.ShouldProcess($path, 'Create backup directory')) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }

    $path
}

function Backup-File {
    param(
        [string]$Path,
        [string]$BackupDirectory
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $root = (Resolve-Path -LiteralPath $XivLauncherRoot).Path.TrimEnd('\')
    $resolved = (Resolve-Path -LiteralPath $Path).Path
    if ($resolved.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relative = $resolved.Substring($root.Length).TrimStart('\')
    } else {
        $relative = Split-Path -Path $Path -Leaf
    }

    $backupPath = Join-Path $BackupDirectory $relative
    $parent = Split-Path -Path $backupPath -Parent

    if ($PSCmdlet.ShouldProcess($Path, "Back up to $backupPath")) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
        Copy-Item -LiteralPath $Path -Destination $backupPath -Force
    }

    $backupPath
}

function Get-RepositoryEntries {
    param([object]$DalamudConfig)

    if (-not $DalamudConfig -or -not $DalamudConfig.ThirdRepoList) {
        return @()
    }

    $values = $DalamudConfig.ThirdRepoList.'$values'
    if ($null -eq $values) {
        return @()
    }

    @($values)
}

function Ensure-RepositoryList {
    param([object]$DalamudConfig)

    if (-not $DalamudConfig.ThirdRepoList) {
        $repoList = [pscustomobject][ordered]@{
            '$type' = 'System.Collections.Generic.List`1[[Dalamud.Configuration.ThirdPartyRepoSettings, Dalamud]], System.Private.CoreLib'
            '$values' = @()
        }
        $DalamudConfig | Add-Member -NotePropertyName 'ThirdRepoList' -NotePropertyValue $repoList
    }

    if ($null -eq $DalamudConfig.ThirdRepoList.'$values') {
        $DalamudConfig.ThirdRepoList | Add-Member -NotePropertyName '$values' -NotePropertyValue @()
    }
}

function Add-RepositoryEntry {
    param(
        [object]$DalamudConfig,
        [string]$Url
    )

    Ensure-RepositoryList -DalamudConfig $DalamudConfig
    $values = @(Get-RepositoryEntries -DalamudConfig $DalamudConfig)
    $values += [pscustomobject][ordered]@{
        '$type' = 'Dalamud.Configuration.ThirdPartyRepoSettings, Dalamud'
        Url = $Url
        IsEnabled = $true
    }
    $DalamudConfig.ThirdRepoList.'$values' = $values
}

function Get-PluginInstallInfo {
    $root = Join-Path (Join-Path $XivLauncherRoot 'installedPlugins') $PluginInternalName
    if (-not (Test-Path -LiteralPath $root)) {
        return $null
    }

    $versionDir = Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $versionDir) {
        return [pscustomobject]@{
            Root = $root
            VersionDirectory = $null
            ManifestPath = $null
            DllPath = $null
            Manifest = $null
        }
    }

    $manifestPath = Join-Path $versionDir.FullName "$PluginInternalName.json"
    [pscustomobject]@{
        Root = $root
        VersionDirectory = $versionDir.FullName
        ManifestPath = $manifestPath
        DllPath = Join-Path $versionDir.FullName "$PluginInternalName.dll"
        Manifest = Read-JsonFile -Path $manifestPath
    }
}

function Test-Repository {
    param([string]$Url)

    if (-not $CheckRepository) {
        return
    }

    try {
        $response = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing -TimeoutSec 15
        Write-Ok "Repository reachable: $Url (HTTP $([int]$response.StatusCode))"
    } catch {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 15
            Write-Ok "Repository reachable: $Url (HTTP $([int]$response.StatusCode))"
        } catch {
            Write-Warn "Repository check failed: $Url ($($_.Exception.Message))"
        }
    }
}

function Show-LogHints {
    foreach ($log in @('dalamud.log', 'output.log')) {
        $path = Join-Path $XivLauncherRoot $log
        if (-not (Test-Path -LiteralPath $path)) {
            continue
        }

        $matches = @(Get-Content -LiteralPath $path -Tail 1000 -ErrorAction SilentlyContinue |
            Where-Object {
                $_ -match [regex]::Escape($PluginInternalName) -and
                $_ -match '(?i)(error|fail|exception|crash|unable|api|load)'
            } |
            Select-Object -Last 5)

        if ($matches.Count -gt 0) {
            Write-Step "Recent $PluginInternalName log hints from ${log}:"
            $matches | ForEach-Object { Write-Host "  $_" }
        }
    }
}

function Show-Status {
    Write-Step "Mode: Status"
    Write-Step "XIVLauncher root: $XivLauncherRoot"

    if (-not (Test-Path -LiteralPath $XivLauncherRoot)) {
        Write-Warn 'XIVLauncher root was not found.'
        return
    }

    $running = @(Get-RelatedProcess)
    if ($running.Count -gt 0) {
        $summary = ($running | Select-Object -First 8 | ForEach-Object {
            "$($_.ProcessName):$($_.Id)"
        }) -join ', '
        Write-Step "Related processes: $summary"
    } else {
        Write-Ok 'XIVLauncher/FFXIV processes are not running.'
    }

    $dalamudConfigPath = Join-Path $XivLauncherRoot 'dalamudConfig.json'
    $pluginConfigPath = Join-Path (Join-Path $XivLauncherRoot 'pluginConfigs') "$PluginInternalName.json"
    $dalamudConfig = Read-JsonFile -Path $dalamudConfigPath

    if ($dalamudConfig) {
        Write-Ok "Dalamud config found: $dalamudConfigPath"
        Write-Step "PluginSafeMode: $($dalamudConfig.PluginSafeMode)"
        Write-Step "AutoUpdatePlugins: $($dalamudConfig.AutoUpdatePlugins)"

        $repo = @(Get-RepositoryEntries -DalamudConfig $dalamudConfig) |
            Where-Object { $_.Url -eq $RequiredRepositoryUrl } |
            Select-Object -First 1

        if ($repo) {
            Write-Ok "Required repository is present. IsEnabled=$($repo.IsEnabled)"
        } else {
            Write-Warn "Required repository is missing: $RequiredRepositoryUrl"
        }
    } else {
        Write-Warn "Dalamud config not found: $dalamudConfigPath"
    }

    $pluginInfo = Get-PluginInstallInfo
    if ($pluginInfo) {
        Write-Ok "Installed plugin folder found: $($pluginInfo.Root)"
        Write-Step "Latest installed version directory: $($pluginInfo.VersionDirectory)"
        if ($pluginInfo.Manifest) {
            Write-Step "Manifest version: $($pluginInfo.Manifest.AssemblyVersion)"
            Write-Step "Manifest disabled: $($pluginInfo.Manifest.Disabled)"
            Write-Step "Installed from: $($pluginInfo.Manifest.InstalledFromUrl)"
        }
        if (Test-Path -LiteralPath $pluginInfo.DllPath) {
            Write-Ok "Plugin DLL found: $($pluginInfo.DllPath)"
        } else {
            Write-Warn "Plugin DLL missing: $($pluginInfo.DllPath)"
        }
    } else {
        Write-Warn "Installed plugin folder was not found for: $PluginInternalName"
    }

    $pluginConfig = Read-JsonFile -Path $pluginConfigPath
    if ($pluginConfig) {
        Write-Ok "Plugin config found: $pluginConfigPath"
        Write-Step "Plugin config Enabled: $($pluginConfig.Enabled)"
        Write-Step "Plugin config Version: $($pluginConfig.Version)"
        Write-Step "CustomCallbacks: $(@($pluginConfig.CustomCallbacks).Count)"
    } else {
        Write-Warn "Plugin config not found yet: $pluginConfigPath"
    }

    Test-Repository -Url $RequiredRepositoryUrl
    Show-LogHints

    if ($OpenConfigFolder) {
        Start-Process -FilePath (Join-Path $XivLauncherRoot 'pluginConfigs')
    }
}

function Invoke-Repair {
    Assert-CanWriteConfig

    if (-not (Test-Path -LiteralPath $XivLauncherRoot)) {
        throw "XIVLauncher root was not found: $XivLauncherRoot"
    }

    $backupDir = New-BackupDirectory
    Write-Step "Backup directory: $backupDir"

    $dalamudConfigPath = Join-Path $XivLauncherRoot 'dalamudConfig.json'
    $pluginConfigDir = Join-Path $XivLauncherRoot 'pluginConfigs'
    $pluginConfigPath = Join-Path $pluginConfigDir "$PluginInternalName.json"

    if (-not (Test-Path -LiteralPath $pluginConfigDir)) {
        if ($PSCmdlet.ShouldProcess($pluginConfigDir, 'Create plugin config directory')) {
            New-Item -ItemType Directory -Path $pluginConfigDir -Force | Out-Null
        }
    }

    $dalamudConfig = Read-JsonFile -Path $dalamudConfigPath
    if ($dalamudConfig) {
        Backup-File -Path $dalamudConfigPath -BackupDirectory $backupDir | Out-Null
        $changed = $false

        if ($EnablePlugin -and $dalamudConfig.PluginSafeMode -eq $true) {
            Set-JsonProperty -Object $dalamudConfig -Name 'PluginSafeMode' -Value $false
            Write-Step 'Will disable PluginSafeMode so plugins can load.'
            $changed = $true
        }

        if ($EnableAutoUpdate -and $dalamudConfig.AutoUpdatePlugins -ne $true) {
            Set-JsonProperty -Object $dalamudConfig -Name 'AutoUpdatePlugins' -Value $true
            Write-Step 'Will enable Dalamud plugin auto-update.'
            $changed = $true
        }

        $repo = @(Get-RepositoryEntries -DalamudConfig $dalamudConfig) |
            Where-Object { $_.Url -eq $RequiredRepositoryUrl } |
            Select-Object -First 1

        if ($repo) {
            if ($repo.IsEnabled -ne $true) {
                $repo.IsEnabled = $true
                Write-Step "Will enable required repository: $RequiredRepositoryUrl"
                $changed = $true
            }
        } elseif ($AddRepository) {
            Add-RepositoryEntry -DalamudConfig $dalamudConfig -Url $RequiredRepositoryUrl
            Write-Step "Will add required repository: $RequiredRepositoryUrl"
            $changed = $true
        } else {
            Write-Warn "Required repository is missing. Re-run with -AddRepository to add it."
        }

        if ($changed) {
            if ($PSCmdlet.ShouldProcess($dalamudConfigPath, 'Write repaired Dalamud config')) {
                Write-JsonFile -Path $dalamudConfigPath -Value $dalamudConfig
                Write-Ok 'Dalamud config repaired.'
            }
        } else {
            Write-Ok 'Dalamud config already looks usable.'
        }
    } else {
        Write-Warn "Dalamud config not found: $dalamudConfigPath"
    }

    $pluginInfo = Get-PluginInstallInfo
    if ($pluginInfo -and $pluginInfo.Manifest) {
        Backup-File -Path $pluginInfo.ManifestPath -BackupDirectory $backupDir | Out-Null
        if ($EnablePlugin -and $pluginInfo.Manifest.Disabled -eq $true) {
            Set-JsonProperty -Object $pluginInfo.Manifest -Name 'Disabled' -Value $false
            if ($PSCmdlet.ShouldProcess($pluginInfo.ManifestPath, 'Write repaired plugin manifest')) {
                Write-JsonFile -Path $pluginInfo.ManifestPath -Value $pluginInfo.Manifest
                Write-Ok 'Plugin manifest repaired.'
            }
        } else {
            Write-Ok 'Plugin manifest already looks usable.'
        }
    } else {
        Write-Warn "Installed plugin manifest was not found for: $PluginInternalName"
    }

    $pluginConfig = Read-JsonFile -Path $pluginConfigPath
    if ($pluginConfig) {
        Backup-File -Path $pluginConfigPath -BackupDirectory $backupDir | Out-Null
        if ($EnablePlugin -and $pluginConfig.Enabled -ne $true) {
            Set-JsonProperty -Object $pluginConfig -Name 'Enabled' -Value $true
            if ($PSCmdlet.ShouldProcess($pluginConfigPath, 'Write repaired plugin config')) {
                Write-JsonFile -Path $pluginConfigPath -Value $pluginConfig
                Write-Ok 'Plugin config repaired.'
            }
        } else {
            Write-Ok 'Plugin config already looks usable.'
        }
    } else {
        Write-Warn "Plugin config not found. Launch once with the plugin installed to create it."
    }

    Test-Repository -Url $RequiredRepositoryUrl
}

function Invoke-ResetConfig {
    Assert-CanWriteConfig

    $pluginConfigPath = Join-Path (Join-Path $XivLauncherRoot 'pluginConfigs') "$PluginInternalName.json"
    if (-not (Test-Path -LiteralPath $pluginConfigPath)) {
        Write-Warn "Plugin config does not exist: $pluginConfigPath"
        return
    }

    $backupDir = New-BackupDirectory
    $backupPath = Backup-File -Path $pluginConfigPath -BackupDirectory $backupDir
    $disabledPath = "$pluginConfigPath.disabled-$(Get-Date -Format yyyyMMdd-HHmmss)"

    if ($PSCmdlet.ShouldProcess($pluginConfigPath, "Move aside plugin config to $disabledPath")) {
        Move-Item -LiteralPath $pluginConfigPath -Destination $disabledPath
        Write-Ok "Plugin config moved aside: $disabledPath"
        Write-Step "Backup copy: $backupPath"
    }
}

switch ($Mode) {
    'Status' { Show-Status }
    'Repair' { Invoke-Repair }
    'ResetConfig' { Invoke-ResetConfig }
}
