#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet('Balanced', 'Performance', 'Ultra')]
    [string]$Profile = 'Performance',

    [string]$ConfigDir,
    [switch]$SetProcessPriority,
    [switch]$DisableGameDvr,
    [switch]$ReportOnly
)

$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "[FFXIV Optimize] $Message"
}

function Resolve-FFXIVConfigDir {
    param([string]$OverridePath)

    if ($OverridePath) {
        return $OverridePath
    }

    $documents = [Environment]::GetFolderPath('MyDocuments')
    return (Join-Path $documents 'My Games\FINAL FANTASY XIV - A Realm Reborn')
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

function Write-TextPreservingEncoding {
    param(
        [string]$Path,
        [string]$Text,
        [System.Text.Encoding]$Encoding
    )

    [System.IO.File]::WriteAllText($Path, $Text, $Encoding)
}

function Split-ConfigLines {
    param([string]$Text)
    $list = [System.Collections.Generic.List[string]]::new()
    $list.AddRange([string[]]([regex]::Split($Text, "\r?\n")))
    return ,$list
}

function Join-ConfigLines {
    param([System.Collections.Generic.List[string]]$Lines)
    return ($Lines -join "`r`n")
}

function Set-FFXIVConfigValue {
    param(
        [System.Collections.Generic.List[string]]$Lines,
        [string]$Section,
        [string]$Key,
        [string]$Value
    )

    $sectionPattern = '^\s*<' + [regex]::Escape($Section) + '>\s*$'
    $nextSectionPattern = '^\s*<[^>]+>\s*$'
    $keyPattern = '^\s*' + [regex]::Escape($Key) + '\s+'
    $sectionIndex = -1

    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -match $sectionPattern) {
            $sectionIndex = $i
            break
        }
    }

    if ($sectionIndex -lt 0) {
        if ($Lines.Count -gt 0 -and $Lines[$Lines.Count - 1].Trim().Length -ne 0) {
            $Lines.Add('')
        }
        $Lines.Add("<$Section>")
        $Lines.Add("$Key`t$Value")
        return
    }

    $insertIndex = $Lines.Count
    for ($i = $sectionIndex + 1; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -match $nextSectionPattern) {
            $insertIndex = $i
            break
        }

        if ($Lines[$i] -match $keyPattern) {
            $Lines[$i] = "$Key`t$Value"
            return
        }
    }

    $Lines.Insert($insertIndex, "$Key`t$Value")
}

function Get-FFXIVConfigValue {
    param(
        [System.Collections.Generic.List[string]]$Lines,
        [string]$Section,
        [string]$Key
    )

    $sectionPattern = '^\s*<' + [regex]::Escape($Section) + '>\s*$'
    $nextSectionPattern = '^\s*<[^>]+>\s*$'
    $keyPattern = '^\s*' + [regex]::Escape($Key) + '\s+(.+?)\s*$'
    $inSection = $false

    foreach ($line in $Lines) {
        if ($line -match $sectionPattern) {
            $inSection = $true
            continue
        }

        if ($inSection -and $line -match $nextSectionPattern) {
            break
        }

        if ($inSection -and $line -match $keyPattern) {
            return $Matches[1]
        }
    }

    return $null
}

function Get-ProfileUpdates {
    param([string]$ProfileName)

    $common = @(
        @{ Section = 'Display Settings'; Key = 'FPSInActive'; Value = '1'; Note = 'inactive fps reduction' },
        @{ Section = 'Graphics Settings DX11'; Key = 'DepthOfField_DX11'; Value = '0'; Note = 'depth of field off' },
        @{ Section = 'Graphics Settings DX11'; Key = 'RadialBlur_DX11'; Value = '0'; Note = 'radial blur off' },
        @{ Section = 'Graphics Settings DX11'; Key = 'Vignetting_DX11'; Value = '0'; Note = 'vignette off' },
        @{ Section = 'Graphics Settings DX11'; Key = 'OcclusionCulling_DX11'; Value = '1'; Note = 'occlusion culling on' },
        @{ Section = 'Graphics Settings DX11'; Key = 'ShadowLOD_DX11'; Value = '1'; Note = 'shadow lod on' },
        @{ Section = 'Graphics Settings DX11'; Key = 'ParallaxOcclusion_DX11'; Value = '0'; Note = 'parallax off' },
        @{ Section = 'Graphics Settings DX11'; Key = 'GrassEnableDynamicInterference'; Value = '0'; Note = 'grass interaction off' },
        @{ Section = 'Graphics Settings DX11'; Key = 'DynamicRezoEnableCutScene'; Value = '1'; Note = 'cutscene dynamic res enabled' },
        @{ Section = 'UI Settings'; Key = 'FPSDownAFK'; Value = '1'; Note = 'afk fps reduction' }
    )

    switch ($ProfileName) {
        'Balanced' {
            return $common + @(
                @{ Section = 'Graphics Settings DX11'; Key = 'SSAO_DX11'; Value = '1'; Note = 'lighter ssao' },
                @{ Section = 'Graphics Settings DX11'; Key = 'Glare_DX11'; Value = '1'; Note = 'lighter glare' },
                @{ Section = 'Graphics Settings DX11'; Key = 'DistortionWater_DX11'; Value = '1'; Note = 'lighter water distortion' },
                @{ Section = 'Graphics Settings DX11'; Key = 'GrassQuality_DX11'; Value = '2'; Note = 'medium grass' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowSoftShadowType_DX11'; Value = '0'; Note = 'simple shadows' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowTextureSizeType_DX11'; Value = '1'; Note = 'medium shadow map' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowCascadeCountType_DX11'; Value = '1'; Note = 'normal cascade count' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ReflectionType_DX11'; Value = '1'; Note = 'lighter reflections' },
                @{ Section = 'GamePad Settings'; Key = 'DisplayObjectLimitType'; Value = '2'; Note = 'normal object quantity' },
                @{ Section = 'Graphics Settings DX11'; Key = 'DisplayObjectLimitType2'; Value = '2'; Note = 'normal object quantity' },
                @{ Section = 'Graphics Settings DX11'; Key = 'DisplayHouseIndoorPcLimitType'; Value = '2'; Note = 'normal indoor pc quantity' }
            )
        }
        'Performance' {
            return $common + @(
                @{ Section = 'Graphics Settings DX11'; Key = 'SSAO_DX11'; Value = '0'; Note = 'ssao off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'Glare_DX11'; Value = '1'; Note = 'low glare' },
                @{ Section = 'Graphics Settings DX11'; Key = 'DistortionWater_DX11'; Value = '0'; Note = 'water distortion off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'GrassQuality_DX11'; Value = '1'; Note = 'low grass' },
                @{ Section = 'Graphics Settings DX11'; Key = 'TranslucentQuality_DX11'; Value = '0'; Note = 'low translucent quality' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowSoftShadowType_DX11'; Value = '0'; Note = 'simple shadows' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowTextureSizeType_DX11'; Value = '1'; Note = 'medium shadow map' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowCascadeCountType_DX11'; Value = '0'; Note = 'low cascade count' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowVisibilityTypeParty_DX11'; Value = '0'; Note = 'party shadows off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowVisibilityTypeOther_DX11'; Value = '0'; Note = 'other shadows off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowVisibilityTypeEnemy_DX11'; Value = '0'; Note = 'enemy shadows off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'PhysicsTypeParty_DX11'; Value = '0'; Note = 'party physics low' },
                @{ Section = 'Graphics Settings DX11'; Key = 'PhysicsTypeOther_DX11'; Value = '0'; Note = 'other physics low' },
                @{ Section = 'Graphics Settings DX11'; Key = 'PhysicsTypeEnemy_DX11'; Value = '0'; Note = 'enemy physics low' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ReflectionType_DX11'; Value = '0'; Note = 'reflections off' },
                @{ Section = 'GamePad Settings'; Key = 'DisplayObjectLimitType'; Value = '3'; Note = 'low object quantity' },
                @{ Section = 'Graphics Settings DX11'; Key = 'DisplayObjectLimitType2'; Value = '3'; Note = 'low object quantity' },
                @{ Section = 'Graphics Settings DX11'; Key = 'DisplayHouseIndoorPcLimitType'; Value = '3'; Note = 'low indoor pc quantity' }
            )
        }
        'Ultra' {
            return $common + @(
                @{ Section = 'Graphics Settings DX11'; Key = 'SSAO_DX11'; Value = '0'; Note = 'ssao off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'Glare_DX11'; Value = '0'; Note = 'glare off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'DistortionWater_DX11'; Value = '0'; Note = 'water distortion off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'GrassQuality_DX11'; Value = '0'; Note = 'minimum grass' },
                @{ Section = 'Graphics Settings DX11'; Key = 'TranslucentQuality_DX11'; Value = '0'; Note = 'low translucent quality' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowSoftShadowType_DX11'; Value = '0'; Note = 'simple shadows' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowTextureSizeType_DX11'; Value = '0'; Note = 'low shadow map' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowCascadeCountType_DX11'; Value = '0'; Note = 'low cascade count' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowVisibilityTypeSelf_DX11'; Value = '0'; Note = 'self shadows off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowVisibilityTypeParty_DX11'; Value = '0'; Note = 'party shadows off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowVisibilityTypeOther_DX11'; Value = '0'; Note = 'other shadows off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowVisibilityTypeEnemy_DX11'; Value = '0'; Note = 'enemy shadows off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'PhysicsTypeSelf_DX11'; Value = '1'; Note = 'self physics medium' },
                @{ Section = 'Graphics Settings DX11'; Key = 'PhysicsTypeParty_DX11'; Value = '0'; Note = 'party physics low' },
                @{ Section = 'Graphics Settings DX11'; Key = 'PhysicsTypeOther_DX11'; Value = '0'; Note = 'other physics low' },
                @{ Section = 'Graphics Settings DX11'; Key = 'PhysicsTypeEnemy_DX11'; Value = '0'; Note = 'enemy physics low' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ReflectionType_DX11'; Value = '0'; Note = 'reflections off' },
                @{ Section = 'Graphics Settings DX11'; Key = 'ShadowLightValidType'; Value = '0'; Note = 'extra shadow lights off' },
                @{ Section = 'GamePad Settings'; Key = 'DisplayObjectLimitType'; Value = '4'; Note = 'minimum object quantity' },
                @{ Section = 'Graphics Settings DX11'; Key = 'DisplayObjectLimitType2'; Value = '4'; Note = 'minimum object quantity' },
                @{ Section = 'Graphics Settings DX11'; Key = 'DisplayHouseIndoorPcLimitType'; Value = '4'; Note = 'minimum indoor pc quantity' }
            )
        }
    }
}

function Set-FFXIVProcessPriority {
    $processes = Get-Process -Name 'ffxiv_dx11' -ErrorAction SilentlyContinue
    if (-not $processes) {
        Write-Step 'FFXIV is not running; process priority was not changed.'
        return
    }

    foreach ($process in $processes) {
        try {
            $process.PriorityClass = 'AboveNormal'
            Write-Step "Set process priority: ffxiv_dx11.exe pid=$($process.Id) AboveNormal"
        } catch {
            Write-Warning "Could not set priority for pid=$($process.Id): $($_.Exception.Message)"
        }
    }
}

function Disable-GameDvrCapture {
    $paths = @(
        'HKCU:\System\GameConfigStore',
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR'
    )

    foreach ($path in $paths) {
        if (-not (Test-Path -LiteralPath $path)) {
            New-Item -Path $path -Force | Out-Null
        }
    }

    New-ItemProperty -LiteralPath 'HKCU:\System\GameConfigStore' -Name 'GameDVR_Enabled' -PropertyType DWord -Value 0 -Force | Out-Null
    New-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'AppCaptureEnabled' -PropertyType DWord -Value 0 -Force | Out-Null
    Write-Step 'Disabled Windows Game DVR capture for the current user.'
}

$resolvedConfigDir = Resolve-FFXIVConfigDir -OverridePath $ConfigDir
$configPath = Join-Path $resolvedConfigDir 'FFXIV.cfg'
$bootConfigPath = Join-Path $resolvedConfigDir 'FFXIV_BOOT.cfg'

Write-Step "Profile: $Profile"
Write-Step "Config dir: $resolvedConfigDir"

if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Could not find FFXIV.cfg at: $configPath"
}

$read = Read-TextPreservingEncoding -Path $configPath
$lines = Split-ConfigLines -Text $read.Text
$updates = Get-ProfileUpdates -ProfileName $Profile

Write-Step 'Planned changes:'
foreach ($update in $updates) {
    $old = Get-FFXIVConfigValue -Lines $lines -Section $update.Section -Key $update.Key
    Write-Host ("  {0}.{1}: {2} -> {3} ({4})" -f $update.Section, $update.Key, $(if ($null -eq $old) { '<missing>' } else { $old }), $update.Value, $update.Note)
}

if (-not $ReportOnly) {
    $backupPath = "$configPath.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
    Copy-Item -LiteralPath $configPath -Destination $backupPath -Force
    Write-Step "Backup: $backupPath"

    foreach ($update in $updates) {
        Set-FFXIVConfigValue -Lines $lines -Section $update.Section -Key $update.Key -Value $update.Value
    }

    if ($PSCmdlet.ShouldProcess($configPath, "Apply FFXIV $Profile optimization profile")) {
        Write-TextPreservingEncoding -Path $configPath -Text (Join-ConfigLines -Lines $lines) -Encoding $read.Encoding
    }

    if (Test-Path -LiteralPath $bootConfigPath) {
        $bootRead = Read-TextPreservingEncoding -Path $bootConfigPath
        $bootLines = Split-ConfigLines -Text $bootRead.Text
        $bootBackupPath = "$bootConfigPath.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
        Copy-Item -LiteralPath $bootConfigPath -Destination $bootBackupPath -Force
        Set-FFXIVConfigValue -Lines $bootLines -Section 'Version' -Key 'DX11Enabled' -Value '1'
        Write-TextPreservingEncoding -Path $bootConfigPath -Text (Join-ConfigLines -Lines $bootLines) -Encoding $bootRead.Encoding
        Write-Step "Boot config backup: $bootBackupPath"
        Write-Step 'Ensured DX11Enabled=1'
    }
}

if ($SetProcessPriority) {
    Set-FFXIVProcessPriority
}

if ($DisableGameDvr) {
    Disable-GameDvrCapture
}

if ($ReportOnly) {
    Write-Step 'Report only; no files were changed.'
} else {
    Write-Step 'Done. Restart FFXIV to fully apply file-based settings.'
}
