#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$GamePath,

    [ValidateSet('Balanced', 'Performance', 'Ultra')]
    [string]$Profile = 'Performance',

    [switch]$OptimizePreset,
    [switch]$QuietStartup,
    [switch]$ShowActiveEffects
)

$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "[FFXIV GShade] $Message"
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

function Set-IniValue {
    param(
        [string[]]$Lines,
        [string]$Section,
        [string]$Key,
        [string]$Value
    )

    $list = [System.Collections.Generic.List[string]]::new()
    $list.AddRange([string[]]$Lines)

    $sectionPattern = '^\s*\[' + [regex]::Escape($Section) + '\]\s*$'
    $keyPattern = '^\s*' + [regex]::Escape($Key) + '\s*='
    $sectionIndex = -1

    for ($i = 0; $i -lt $list.Count; $i++) {
        if ($list[$i] -match $sectionPattern) {
            $sectionIndex = $i
            break
        }
    }

    if ($sectionIndex -lt 0) {
        if ($list.Count -gt 0 -and $list[$list.Count - 1].Trim().Length -ne 0) {
            $list.Add('')
        }
        $list.Add("[$Section]")
        $list.Add("$Key=$Value")
        return [string[]]$list
    }

    $insertIndex = $list.Count
    for ($i = $sectionIndex + 1; $i -lt $list.Count; $i++) {
        if ($list[$i] -match '^\s*\[.+\]\s*$') {
            $insertIndex = $i
            break
        }

        if ($list[$i] -match $keyPattern) {
            $list[$i] = "$Key=$Value"
            return [string[]]$list
        }
    }

    $list.Insert($insertIndex, "$Key=$Value")
    return [string[]]$list
}

function Get-IniValue {
    param(
        [string[]]$Lines,
        [string]$Key
    )

    $pattern = '^\s*' + [regex]::Escape($Key) + '\s*=(.*)$'
    foreach ($line in $Lines) {
        if ($line -match $pattern) {
            return $Matches[1].Trim()
        }
    }

    return $null
}

function Resolve-PresetPath {
    param(
        [string]$RawPath,
        [string]$GameDir
    )

    if (-not $RawPath) {
        return $null
    }

    if ([System.IO.Path]::IsPathRooted($RawPath)) {
        return $RawPath
    }

    return [System.IO.Path]::GetFullPath((Join-Path $GameDir $RawPath))
}

function Get-TechniqueId {
    param([string]$Technique)

    if ($Technique -match '^([^@]+)@') {
        return $Matches[1]
    }

    return $Technique
}

function Optimize-PresetTechniques {
    param(
        [string]$PresetPath,
        [string]$Profile
    )

    if (-not $PresetPath -or -not (Test-Path -LiteralPath $PresetPath)) {
        Write-Warning "Preset file not found: $PresetPath"
        return
    }

    $presetBackup = "$PresetPath.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
    Copy-Item -LiteralPath $PresetPath -Destination $presetBackup -Force
    Write-Step "Preset backup: $presetBackup"

    $presetLines = Get-Content -LiteralPath $PresetPath
    $list = [System.Collections.Generic.List[string]]::new()
    $list.AddRange([string[]]$presetLines)

    $techLineIndex = -1
    for ($i = 0; $i -lt $list.Count; $i++) {
        if ($list[$i] -match '^\s*Techniques\s*=') {
            $techLineIndex = $i
            break
        }
    }

    if ($techLineIndex -lt 0) {
        Write-Warning 'No Techniques= line found in the active preset.'
        return
    }

    $raw = $list[$techLineIndex] -replace '^\s*Techniques\s*=', ''
    $techniques = @($raw -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })

    $balancedHeavy = '(?i)(DOF|MXAO|qMXAO|SSAO|RayAO|HBAO|SSGI|SSR|MotionBlur|LongExposure|GaussianBlur)'
    $performanceHeavy = '(?i)(DOF|MXAO|qMXAO|SSAO|RayAO|HBAO|SSGI|SSR|MotionBlur|LongExposure|GaussianBlur|AmbientLight|Bloom|Lens|GI)'
    $ultraAllow = '(?i)^(FFKeepUI|FFRestoreUI|KeepUI|RestoreUI|FXAA|SMAA|FilmicPass|MultiLUT|LUT|Clarity|Vibrance|Tonemap|Levels|Curves|Lightroom)@?'

    $removed = @()
    $kept = @()

    foreach ($technique in $techniques) {
        $id = Get-TechniqueId -Technique $technique
        $remove = $false

        switch ($Profile) {
            'Balanced' {
                $remove = ($technique -match $balancedHeavy -or $id -match $balancedHeavy)
            }
            'Performance' {
                $remove = ($technique -match $performanceHeavy -or $id -match $performanceHeavy)
            }
            'Ultra' {
                $remove = -not ($technique -match $ultraAllow -or $id -match $ultraAllow)
            }
        }

        if ($remove) {
            $removed += $technique
        } else {
            $kept += $technique
        }
    }

    if ($kept.Count -eq 0 -and $techniques.Count -gt 0) {
        Write-Warning 'Optimization would remove every active technique, so the preset was left unchanged.'
        return
    }

    $list[$techLineIndex] = 'Techniques=' + ($kept -join ',')
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllLines($PresetPath, [string[]]$list, $utf8NoBom)

    if ($removed.Count -gt 0) {
        Write-Step ('Disabled preset effects: ' + ($removed -join ', '))
    } else {
        Write-Step 'No heavy active preset effects matched this profile.'
    }

    Write-Step ('Remaining active effects: ' + ($kept -join ', '))
}

$resolvedGamePath = Resolve-ConfiguredGamePath -OverridePath $GamePath
$gameDir = Join-Path $resolvedGamePath 'game'
$ffxivExe = Join-Path $gameDir 'ffxiv_dx11.exe'
$iniPath = Join-Path $gameDir 'GShade.ini'
$dxgiPath = Join-Path $gameDir 'dxgi.dll'

Write-Step "Profile: $Profile"
Write-Step "Game path: $resolvedGamePath"

if (-not (Test-Path -LiteralPath $ffxivExe)) {
    throw "Could not find ffxiv_dx11.exe at: $ffxivExe"
}

if (-not (Test-Path -LiteralPath $iniPath)) {
    throw "Could not find GShade.ini at: $iniPath"
}

if (Test-Path -LiteralPath $dxgiPath) {
    $hook = Get-Item -LiteralPath $dxgiPath -Force
    if ($hook.LinkType -eq 'SymbolicLink') {
        Write-Step "Hook: dxgi.dll -> $($hook.Target)"
    } elseif ($hook.Length -gt 0) {
        Write-Step "Hook: dxgi.dll present ($($hook.Length) bytes)"
    } else {
        Write-Warning "dxgi.dll is zero bytes and is not a symlink. Reinstall/repair GShade if it does not load."
    }
} else {
    Write-Warning "dxgi.dll hook is missing. Reinstall/repair GShade for this game folder."
}

$backupPath = "$iniPath.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
Copy-Item -LiteralPath $iniPath -Destination $backupPath -Force
Write-Step "GShade.ini backup: $backupPath"

$lines = Get-Content -LiteralPath $iniPath
$presetPath = Resolve-PresetPath -RawPath (Get-IniValue -Lines $lines -Key 'PresetPath') -GameDir $gameDir

$updates = @(
    @{ Section = 'INPUT'; Key = 'KeyOverlay'; Value = '36,0,0,0' },
    @{ Section = 'GENERAL'; Key = 'NoEffectCache'; Value = '0' },
    @{ Section = 'GENERAL'; Key = 'NoDebugInfo'; Value = '1' },
    @{ Section = 'GENERAL'; Key = 'SkipLoadingDisabledEffects'; Value = '1' },
    @{ Section = 'GENERAL'; Key = 'DisableEffectsOnInactiveWindow'; Value = '1' },
    @{ Section = 'OVERLAY'; Key = 'ShowFPS'; Value = '0' },
    @{ Section = 'OVERLAY'; Key = 'ShowFrameTime'; Value = '0' },
    @{ Section = 'OVERLAY'; Key = 'ShowClock'; Value = '0' },
    @{ Section = 'SCREENSHOT'; Key = 'SaveOverlayShot'; Value = '0' }
)

switch ($Profile) {
    'Balanced' {
        $updates += @{ Section = 'GENERAL'; Key = 'PerformanceMode'; Value = '0' }
        $updates += @{ Section = 'GENERAL'; Key = 'EffectFrameDelay'; Value = '500' }
    }
    'Performance' {
        $updates += @{ Section = 'GENERAL'; Key = 'PerformanceMode'; Value = '1' }
        $updates += @{ Section = 'GENERAL'; Key = 'EffectFrameDelay'; Value = '1000' }
    }
    'Ultra' {
        $updates += @{ Section = 'GENERAL'; Key = 'PerformanceMode'; Value = '1' }
        $updates += @{ Section = 'GENERAL'; Key = 'EffectFrameDelay'; Value = '1500' }
        $updates += @{ Section = 'GENERAL'; Key = 'UseDithering'; Value = '0' }
    }
}

if ($QuietStartup) {
    $updates += @{ Section = 'OVERLAY'; Key = 'ShowCompileSplash'; Value = '0' }
} else {
    $updates += @{ Section = 'OVERLAY'; Key = 'ShowCompileSplash'; Value = '1' }
}

foreach ($update in $updates) {
    $lines = Set-IniValue -Lines $lines -Section $update.Section -Key $update.Key -Value $update.Value
}

if ($PSCmdlet.ShouldProcess($iniPath, 'Apply GShade optimization settings')) {
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllLines($iniPath, [string[]]$lines, $utf8NoBom)
}

Write-Step 'Applied GShade.ini settings:'
$updates | ForEach-Object {
    Write-Host ("  {0}.{1}={2}" -f $_.Section, $_.Key, $_.Value)
}

if ($presetPath) {
    Write-Step "Active preset: $presetPath"
}

if ($OptimizePreset) {
    Optimize-PresetTechniques -PresetPath $presetPath -Profile $Profile
} elseif ($ShowActiveEffects -and $presetPath -and (Test-Path -LiteralPath $presetPath)) {
    $presetLines = Get-Content -LiteralPath $presetPath
    $active = Get-IniValue -Lines $presetLines -Key 'Techniques'
    Write-Step "Active effects: $active"
}

Write-Step 'Done. Restart FFXIV, then press Home in game to open GShade.'
