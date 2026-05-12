#requires -Version 5.1
<#
.SYNOPSIS
Diagnoses and safely repairs the XIVLauncher/Dalamud YesAlready yes/no plugin state.

.DESCRIPTION
Manual operator tool for XIVLauncher plugin health checks.

This script does not click game UI, send keyboard/mouse input, install hotkeys,
or start any background automation. It only inspects local XIVLauncher files and,
in repair modes, updates local configuration after creating backups.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\tools\Repair-XIVLauncherYesNoPlugin.ps1

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\tools\Repair-XIVLauncherYesNoPlugin.ps1 -Mode Repair -EnablePlugin -AddRepository -EnableAutoUpdate

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\tools\Repair-XIVLauncherYesNoPlugin.ps1 -Mode ResetConfig
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

function Test-ProcessRunning {
    $names = @('ffxiv_dx11', 'ffxiv', 'XIVLauncher', 'Dalamud')
    return @(Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $processName = $_.ProcessName
        $names | Where-Object { $processName -like "$_*" }
    })
}

function Assert-CanWriteXivLauncherConfig {
    $running = @(Test-ProcessRunning)
    if ($running.Count -eq 0) {
        return
    }

    $summary = ($running | Select-Object -First 6 | ForEach-Object { "$($_.ProcessName):$($_.Id)" }) -join ', '
    if (-not $ForceWhenRunning) {
        throw "XIVLauncher/FFXIV appears to be running ($summary). Close it first, or pass -ForceWhenRunning if you intentionally want to edit config while it is open."
    }

    Write-Warn "Editing while related processes are running: $summary"
}

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    try {
        return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
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

function New-BackupDirectory {
    $backupRoot = Join-Path $XivLauncherRoot 'backups'
    $backupDir = Join-Path $backupRoot ("yesno-plugin-{0}" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))

    if ($PSCmdlet.ShouldProcess($backupDir, 'Create backup directory')) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }

    return $backupDir
}

function Backup-File {
    param(
        [string]$Path,
        [string]$BackupDirectory
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $resolvedRoot = (Resolve-Path -LiteralPath $XivLauncherRoot).Path.TrimEnd('\')
    $resolvedPath = (Resolve-Path -LiteralPath $Path).Path
    if ($resolvedPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relativePath = $resolvedPath.Substring($resolvedRoot.Length).TrimStart('\')
    } else {
        $relativePath = Split-Path -Path $Path -Leaf
    }

    $backupPath = Join-Path $BackupDirectory $relativePath
    $backupParent = Split-Path -Path $backupPath -Parent

    if ($PSCmdlet.ShouldProcess($Path, "Back up to $backupPath")) {
        New-Item -ItemType Directory -Path $backupParent -Force | Out-Null
        Copy-Item -LiteralPath $Path -Destination $backupPath -Force
    }

    return $backupPath
}

function Get-PluginInstallInfo {
    $pluginRoot = Join-Path (Join-Path $XivLauncherRoot 'installedPlugins') $PluginInternalName
    if (-not (Test-Path -LiteralPath $pluginRoot)) {
        return $null
    }

    $versionDirs = @(Get-ChildItem -LiteralPath $pluginRoot -Directory -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending)

    if ($versionDirs.Count -eq 0) {
        return [pscustomobject]@{
            Root = $pluginRoot
            VersionDirectory = $null
            ManifestPath = $null
            DllPath = $null
            Manifest = $null
        }
    }

    $versionDir = $versionDirs[0]
    $manifestPath = Join-Path $versionDir.FullName "$PluginInternalName.json"
    $dllPath = Join-Path $versionDir.FullName "$PluginInternalName.dll"
    $manifest = $null

    if (Test-Path -LiteralPath $manifestPath) {
        $manifest = Read-JsonFile -Path $manifestPath
    }

    return [pscustomobject]@{
        Root = $pluginRoot
        VersionDirectory = $versionDir.FullName
        ManifestPath = $manifestPath
        DllPath = $dllPath
        Manifest = $manifest
    }
}

function Get-RepositoryEntries {
    param([object]$DalamudConfig)

    if (-not $DalamudConfig) {
        return @()
    }

    $repoList = $DalamudConfig.ThirdRepoList
    if (-not $repoList) {
        return @()
    }

    $values = $repoList.'$values'
    if ($null -eq $values) {
        return @()
    }

    return @($values)
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

    $entry = [pscustomobject][ordered]@{
        '$type' = 'Dalamud.Configuration.ThirdPartyRepoSettings, Dalamud'
        Url = $Url
        IsEnabled = $true
    }

    $values = @(Get-RepositoryEntries -DalamudConfig $DalamudConfig)
    $values += $entry
    $DalamudConfig.ThirdRepoList.'$values' = $values
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

function Show-RepositoryStatus {
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
    $logs = @(
        (Join-Path $XivLauncherRoot 'dalamud.log'),
        (Join-Path $XivLauncherRoot 'output.log')
    )

    foreach ($log in $logs) {
        if (-not (Test-Path -LiteralPath $log)) {
            continue
        }

        $matches = @(Get-Content -LiteralPath $log -Tail 1000 -ErrorAction SilentlyContinue |
            Where-Object {
                $_ -match [regex]::Escape($PluginInternalName) -and
                $_ -match '(?i)(error|fail|exception|crash|unable|api|load)'
            } |
            Select-Object -Last 5)

        if ($matches.Count -gt 0) {
            Write-Step "Recent $PluginInternalName log hints from $(Split-Path -Path $log -Leaf):"
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

    $running = @(Test-ProcessRunning)
    if ($running.Count -gt 0) {
        $summary = ($running | Select-Object -First 6 | ForEach-Object { "$($_.ProcessName):$($_.Id)" }) -join ', '
        Write-Step "Related processes: $summary"
    } else {
        Write-Ok 'XIVLauncher/FFXIV processes are not running.'
    }

    $dalamudConfigPath = Join-Path $XivLauncherRoot 'dalamudConfig.json'
    $pluginConfigPath = Join-Path (Join-Path $XivLauncherRoot 'pluginConfigs') "$PluginInternalName.json"
    $pluginInfo = Get-PluginInstallInfo

    if (Test-Path -LiteralPath $dalamudConfigPath) {
        $dalamudConfig = Read-JsonFile -Path $dalamudConfigPath
        Write-Ok "Dalamud config found: $dalamudConfigPath"
        Write-Step "PluginSafeMode: $($dalamudConfig.PluginSafeMode)"
        Write-Step "AutoUpdatePlugins: $($dalamudConfig.AutoUpdatePlugins)"

        $repos = @(Get-RepositoryEntries -DalamudConfig $dalamudConfig)
        $repo = $repos | Where-Object { $_.Url -eq $RequiredRepositoryUrl } | Select-Object -First 1
        if ($repo) {
            Write-Ok "Required repository is present. IsEnabled=$($repo.IsEnabled)"
        } else {
            Write-Warn "Required repository is not present: $RequiredRepositoryUrl"
        }
    } else {
        Write-Warn "Dalamud config not found: $dalamudConfigPath"
    }

    if ($pluginInfo) {
        Write-Ok "Installed plugin folder found: $($pluginInfo.Root)"
        if ($pluginInfo.VersionDirectory) {
            Write-Step "Latest installed version directory: $($pluginInfo.VersionDirectory)"
        }

        if ($pluginInfo.Manifest) {
            Write-Step "Manifest version: $($pluginInfo.Manifest.AssemblyVersion)"
            Write-Step "Manifest disabled: $($pluginInfo.Manifest.Disabled)"
            Write-Step "Installed from: $($pluginInfo.Manifest.InstalledFromUrl)"
        } else {
            Write-Warn "Plugin manifest missing or unreadable: $($pluginInfo.ManifestPath)"
        }

        if (Test-Path -LiteralPath $pluginInfo.DllPath) {
            Write-Ok "Plugin DLL found: $($pluginInfo.DllPath)"
        } else {
            Write-Warn "Plugin DLL missing: $($pluginInfo.DllPath)"
        }
    } else {
        Write-Warn "Installed plugin folder was not found for: $PluginInternalName"
    }

    if (Test-Path -LiteralPath $pluginConfigPath) {
        $pluginConfig = Read-JsonFile -Path $pluginConfigPath
        Write-Ok "Plugin config found: $pluginConfigPath"
        Write-Step "Plugin config Enabled: $($pluginConfig.Enabled)"
        Write-Step "Plugin config Version: $($pluginConfig.Version)"
        Write-Step "CustomCallbacks: $(@($pluginConfig.CustomCallbacks).Count)"
    } else {
        Write-Warn "Plugin config not found yet: $pluginConfigPath"
    }

    Show-RepositoryStatus -Url $RequiredRepositoryUrl
    Show-LogHints

    if ($OpenConfigFolder) {
        Start-Process -FilePath (Join-Path $XivLauncherRoot 'pluginConfigs')
    }
}

function Invoke-Repair {
    Assert-CanWriteXivLauncherConfig

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
            Write-Ok "Created plugin config directory: $pluginConfigDir"
        }
    }

    if (Test-Path -LiteralPath $dalamudConfigPath) {
        Backup-File -Path $dalamudConfigPath -BackupDirectory $backupDir | Out-Null
        $dalamudConfig = Read-JsonFile -Path $dalamudConfigPath
        $changed = $false

        if ($dalamudConfig.PluginSafeMode -eq $true -and $EnablePlugin) {
            Set-JsonProperty -Object $dalamudConfig -Name 'PluginSafeMode' -Value $false
            Write-Step 'Will disable PluginSafeMode so plugins can load.'
            $changed = $true
        }

        if ($EnableAutoUpdate -and $dalamudConfig.AutoUpdatePlugins -ne $true) {
            Set-JsonProperty -Object $dalamudConfig -Name 'AutoUpdatePlugins' -Value $true
            Write-Step 'Will enable Dalamud plugin auto-update.'
            $changed = $true
        }

        $repos = @(Get-RepositoryEntries -DalamudConfig $dalamudConfig)
        $repo = $repos | Where-Object { $_.Url -eq $RequiredRepositoryUrl } | Select-Object -First 1
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
            Write-Warn "Required repository is missing. Re-run with -AddRepository if this is intentional: $RequiredRepositoryUrl"
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
    if ($pluginInfo -and $pluginInfo.ManifestPath -and (Test-Path -LiteralPath $pluginInfo.ManifestPath)) {
        Backup-File -Path $pluginInfo.ManifestPath -BackupDirectory $backupDir | Out-Null
        $manifest = Read-JsonFile -Path $pluginInfo.ManifestPath
        $manifestChanged = $false

        if ($EnablePlugin -and $manifest.Disabled -eq $true) {
            Set-JsonProperty -Object $manifest -Name 'Disabled' -Value $false
            Write-Step 'Will mark installed plugin manifest as enabled.'
            $manifestChanged = $true
        }

        if ($manifestChanged) {
            if ($PSCmdlet.ShouldProcess($pluginInfo.ManifestPath, 'Write repaired plugin manifest')) {
                Write-JsonFile -Path $pluginInfo.ManifestPath -Value $manifest
                Write-Ok 'Plugin manifest repaired.'
            }
        } else {
            Write-Ok 'Plugin manifest already looks usable.'
        }
    } else {
        Write-Warn "Installed plugin manifest was not found for: $PluginInternalName"
    }

    if (Test-Path -LiteralPath $pluginConfigPath) {
        Backup-File -Path $pluginConfigPath -BackupDirectory $backupDir | Out-Null
        $pluginConfig = Read-JsonFile -Path $pluginConfigPath
        $pluginConfigChanged = $false

        if ($EnablePlugin -and $pluginConfig.Enabled -ne $true) {
            Set-JsonProperty -Object $pluginConfig -Name 'Enabled' -Value $true
            Write-Step 'Will enable plugin config.'
            $pluginConfigChanged = $true
        }

        if ($pluginConfigChanged) {
            if ($PSCmdlet.ShouldProcess($pluginConfigPath, 'Write repaired plugin config')) {
                Write-JsonFile -Path $pluginConfigPath -Value $pluginConfig
                Write-Ok 'Plugin config repaired.'
            }
        } else {
            Write-Ok 'Plugin config already looks usable.'
        }
    } else {
        Write-Warn "Plugin config not found. Launch the game once with the plugin installed so Dalamud can create it: $pluginConfigPath"
    }

    Show-RepositoryStatus -Url $RequiredRepositoryUrl
}

function Invoke-ResetConfig {
    Assert-CanWriteXivLauncherConfig

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
        Write-Step 'Launch XIVLauncher/FFXIV manually and let the plugin create a fresh config.'
    }
}

switch ($Mode) {
    'Status' { Show-Status }
    'Repair' { Invoke-Repair }
    'ResetConfig' { Invoke-ResetConfig }
}
