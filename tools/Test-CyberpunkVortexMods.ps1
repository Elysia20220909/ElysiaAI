#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$StagingPath = (Join-Path $env:APPDATA 'Vortex\cyberpunk2077\mods'),
    [string]$GamePath,
    [string]$ReportPath,
    [switch]$IncludeConflictHashes,
    [switch]$SkipGameLogs,
    [ValidateRange(5, 200)]
    [int]$MaxSamples = 30
)

$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "[CP2077 Vortex] $Message"
}

function ConvertTo-RelativePath {
    param(
        [Parameter(Mandatory = $true)][string]$BasePath,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd('\', '/') + '\'
    $full = [System.IO.Path]::GetFullPath($Path)
    if ($full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $full.Substring($base.Length)
    }

    return $Path
}

function Read-BigEndianUInt {
    param(
        [byte[]]$Bytes,
        [ref]$Offset,
        [int]$Length,
        [switch]$Signed
    )

    if (($Offset.Value + $Length) -gt $Bytes.Length) {
        throw 'Unexpected end of msgpack data.'
    }

    $slice = New-Object byte[] $Length
    [Array]::Copy($Bytes, $Offset.Value, $slice, 0, $Length)
    [Array]::Reverse($slice)
    $Offset.Value += $Length

    switch ($Length) {
        1 {
            if ($Signed) { return [sbyte]$slice[0] }
            return [byte]$slice[0]
        }
        2 {
            if ($Signed) { return [BitConverter]::ToInt16($slice, 0) }
            return [BitConverter]::ToUInt16($slice, 0)
        }
        4 {
            if ($Signed) { return [BitConverter]::ToInt32($slice, 0) }
            return [BitConverter]::ToUInt32($slice, 0)
        }
        8 {
            if ($Signed) { return [BitConverter]::ToInt64($slice, 0) }
            return [BitConverter]::ToUInt64($slice, 0)
        }
        default { throw "Unsupported integer length: $Length" }
    }
}

function Read-MsgPackString {
    param(
        [byte[]]$Bytes,
        [ref]$Offset,
        [int]$Length
    )

    if (($Offset.Value + $Length) -gt $Bytes.Length) {
        throw 'Unexpected end of msgpack string.'
    }

    $value = [Text.Encoding]::UTF8.GetString($Bytes, $Offset.Value, $Length)
    $Offset.Value += $Length
    return $value
}

function Read-MsgPackValue {
    param(
        [byte[]]$Bytes,
        [ref]$Offset
    )

    if ($Offset.Value -ge $Bytes.Length) {
        throw 'Unexpected end of msgpack data.'
    }

    $marker = $Bytes[$Offset.Value]
    $Offset.Value++

    if ($marker -le 0x7f) { return [int]$marker }
    if ($marker -ge 0xe0) { return ([int]$marker - 256) }

    if (($marker -band 0xf0) -eq 0x80) {
        $count = $marker -band 0x0f
        $map = [ordered]@{}
        for ($i = 0; $i -lt $count; $i++) {
            $key = Read-MsgPackValue -Bytes $Bytes -Offset $Offset
            $value = Read-MsgPackValue -Bytes $Bytes -Offset $Offset
            $map[[string]$key] = $value
        }
        return $map
    }

    if (($marker -band 0xf0) -eq 0x90) {
        $count = $marker -band 0x0f
        $items = [System.Collections.Generic.List[object]]::new()
        for ($i = 0; $i -lt $count; $i++) {
            $items.Add((Read-MsgPackValue -Bytes $Bytes -Offset $Offset)) | Out-Null
        }
        return $items.ToArray()
    }

    if (($marker -band 0xe0) -eq 0xa0) {
        return Read-MsgPackString -Bytes $Bytes -Offset $Offset -Length ($marker -band 0x1f)
    }

    switch ($marker) {
        0xc0 { return $null }
        0xc2 { return $false }
        0xc3 { return $true }
        0xcc { return Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 1 }
        0xcd { return Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 2 }
        0xce { return Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 4 }
        0xcf { return Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 8 }
        0xd0 { return Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 1 -Signed }
        0xd1 { return Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 2 -Signed }
        0xd2 { return Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 4 -Signed }
        0xd3 { return Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 8 -Signed }
        0xd9 {
            $length = Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 1
            return Read-MsgPackString -Bytes $Bytes -Offset $Offset -Length $length
        }
        0xda {
            $length = Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 2
            return Read-MsgPackString -Bytes $Bytes -Offset $Offset -Length $length
        }
        0xdb {
            $length = Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 4
            return Read-MsgPackString -Bytes $Bytes -Offset $Offset -Length $length
        }
        0xdc {
            $count = Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 2
            $items = [System.Collections.Generic.List[object]]::new()
            for ($i = 0; $i -lt $count; $i++) {
                $items.Add((Read-MsgPackValue -Bytes $Bytes -Offset $Offset)) | Out-Null
            }
            return $items.ToArray()
        }
        0xdd {
            $count = Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 4
            $items = [System.Collections.Generic.List[object]]::new()
            for ($i = 0; $i -lt $count; $i++) {
                $items.Add((Read-MsgPackValue -Bytes $Bytes -Offset $Offset)) | Out-Null
            }
            return $items.ToArray()
        }
        0xde {
            $count = Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 2
            $map = [ordered]@{}
            for ($i = 0; $i -lt $count; $i++) {
                $key = Read-MsgPackValue -Bytes $Bytes -Offset $Offset
                $value = Read-MsgPackValue -Bytes $Bytes -Offset $Offset
                $map[[string]$key] = $value
            }
            return $map
        }
        0xdf {
            $count = Read-BigEndianUInt -Bytes $Bytes -Offset $Offset -Length 4
            $map = [ordered]@{}
            for ($i = 0; $i -lt $count; $i++) {
                $key = Read-MsgPackValue -Bytes $Bytes -Offset $Offset
                $value = Read-MsgPackValue -Bytes $Bytes -Offset $Offset
                $map[[string]$key] = $value
            }
            return $map
        }
        default {
            throw ("Unsupported msgpack marker 0x{0:x2} at offset {1}" -f $marker, ($Offset.Value - 1))
        }
    }
}

function ConvertFrom-MsgPackFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    $bytes = [IO.File]::ReadAllBytes($Path)
    $offset = 0
    $value = Read-MsgPackValue -Bytes $bytes -Offset ([ref]$offset)
    if ($offset -ne $bytes.Length) {
        Write-Warning "Msgpack parser left $($bytes.Length - $offset) trailing bytes."
    }
    return $value
}

function Initialize-FileIdentityReader {
    if ('Elysia.FileIdentity' -as [type]) {
        return
    }

    Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

namespace Elysia {
    [StructLayout(LayoutKind.Sequential)]
    public struct BY_HANDLE_FILE_INFORMATION {
        public uint FileAttributes;
        public System.Runtime.InteropServices.ComTypes.FILETIME CreationTime;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastAccessTime;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWriteTime;
        public uint VolumeSerialNumber;
        public uint FileSizeHigh;
        public uint FileSizeLow;
        public uint NumberOfLinks;
        public uint FileIndexHigh;
        public uint FileIndexLow;
    }

    public static class FileIdentity {
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool GetFileInformationByHandle(
            SafeFileHandle hFile,
            out BY_HANDLE_FILE_INFORMATION lpFileInformation
        );

        public static string GetIdentity(string path) {
            using (FileStream fs = File.Open(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete)) {
                BY_HANDLE_FILE_INFORMATION info;
                if (!GetFileInformationByHandle(fs.SafeFileHandle, out info)) {
                    throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
                }
                return info.VolumeSerialNumber.ToString("X8") + ":" + info.FileIndexHigh.ToString("X8") + ":" + info.FileIndexLow.ToString("X8");
            }
        }
    }
}
'@
}

function Get-FileIdentitySafe {
    param([string]$Path)

    try {
        Initialize-FileIdentityReader
        return [Elysia.FileIdentity]::GetIdentity($Path)
    } catch {
        return $null
    }
}

function Get-LatestLog {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Filter
    )

    if (-not (Test-Path -LiteralPath $Root)) {
        return $null
    }

    return Get-ChildItem -LiteralPath $Root -Recurse -File -Filter $Filter -ErrorAction SilentlyContinue |
        Where-Object { $_.Length -gt 0 } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

function Search-Log {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [int]$Max = 40
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return @()
    }

    return @(
        Select-String -LiteralPath $Path -Pattern 'error|failed|fail|warn|exception|fatal|invalid|could not|missing|conflict|c0000005' -CaseSensitive:$false -ErrorAction SilentlyContinue |
            Select-Object -Last $Max |
            ForEach-Object {
                [pscustomobject]@{
                    Line = $_.LineNumber
                    Text = $_.Line.Trim()
                }
            }
    )
}

function Get-LatestProfileState {
    param([string]$VortexRoot)

    $logs = Get-ChildItem -LiteralPath $VortexRoot -File -Filter 'vortex*.log' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending

    foreach ($log in $logs) {
        try {
            $line = Get-Content -LiteralPath $log.FullName -ErrorAction Stop |
                Where-Object { $_ -like '*refresh profile*' -and $_ -like '*"gameId":"cyberpunk2077"*' -and $_ -like '*"modState"*' } |
                Select-Object -Last 1

            if (-not $line) {
                continue
            }

            $json = ($line -split 'refresh profile ', 2)[1].Trim()
            $payload = $json | ConvertFrom-Json -ErrorAction Stop
            $profile = $payload.profile
            $modState = $profile.modState
            $enabled = [System.Collections.Generic.List[string]]::new()
            $disabled = [System.Collections.Generic.List[string]]::new()
            $malformed = [System.Collections.Generic.List[string]]::new()

            foreach ($prop in $modState.PSObject.Properties) {
                if ($null -ne $prop.Value.enabled) {
                    if ($prop.Value.enabled) {
                        $enabled.Add($prop.Name) | Out-Null
                    } else {
                        $disabled.Add($prop.Name) | Out-Null
                    }
                } else {
                    $malformed.Add($prop.Name) | Out-Null
                }
            }

            return [pscustomobject]@{
                SourceLog = $log.FullName
                ProfileName = $profile.name
                ProfileId = $profile.id
                EnabledCount = $enabled.Count
                DisabledCount = $disabled.Count
                DisabledMods = @($disabled | Sort-Object)
                MalformedStateEntries = @($malformed | Sort-Object)
            }
        } catch {
            continue
        }
    }

    return $null
}

Write-Step "Staging path: $StagingPath"
if (-not (Test-Path -LiteralPath $StagingPath)) {
    throw "Staging path was not found: $StagingPath"
}

$stagingItem = Get-Item -LiteralPath $StagingPath -Force
$stagingRoot = $stagingItem.FullName.TrimEnd('\', '/')
$vortexGameRoot = Split-Path -Parent $stagingRoot
$vortexRoot = Split-Path -Parent $vortexGameRoot
$deploymentPath = Join-Path $stagingRoot 'vortex.deployment.msgpack'

$deployment = $null
$deploymentError = $null
if (Test-Path -LiteralPath $deploymentPath) {
    try {
        $deployment = ConvertFrom-MsgPackFile -Path $deploymentPath
        if (-not $GamePath -and $deployment.targetPath) {
            $GamePath = [string]$deployment.targetPath
        }
    } catch {
        $deploymentError = $_.Exception.Message
    }
}

if (-not $GamePath) {
    $GamePath = 'C:\Program Files (x86)\Steam\steamapps\common\Cyberpunk 2077'
}

Write-Step "Game path: $GamePath"

$allItems = @(Get-ChildItem -LiteralPath $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue)
$files = @($allItems | Where-Object { -not $_.PSIsContainer })
$dirs = @($allItems | Where-Object { $_.PSIsContainer })
$totalBytes = [int64](($files | Measure-Object -Property Length -Sum).Sum)

$zeroByte = @($files | Where-Object { $_.Length -eq 0 })
$zeroNeedsReview = @($zeroByte | Where-Object { $_.Name -notin @('.placeholder', '.keep', 'null.txt') })
$emptyDirs = @($dirs | Where-Object { @(Get-ChildItem -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue).Count -eq 0 })
$reparsePoints = @($allItems | Where-Object { ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 })
$long240 = @($allItems | Where-Object { $_.FullName.Length -ge 240 })
$long260 = @($allItems | Where-Object { $_.FullName.Length -ge 260 })

$topDirs = @(Get-ChildItem -LiteralPath $stagingRoot -Directory -Force -ErrorAction SilentlyContinue)
$knownRootNames = @('archive', 'r6', 'bin', 'engine', 'red4ext', 'mods', 'tools')
$looseGameFolders = @($topDirs | Where-Object { $knownRootNames -contains $_.Name.ToLowerInvariant() })

$deployEntries = [System.Collections.Generic.List[object]]::new()
foreach ($file in $files) {
    $relative = ConvertTo-RelativePath -BasePath $stagingRoot -Path $file.FullName
    $parts = $relative -split '[\\/]', 2
    if ($parts.Count -lt 2) {
        continue
    }
    $deployEntries.Add([pscustomobject]@{
        Mod = $parts[0]
        DeployRel = $parts[1]
        FullName = $file.FullName
        Length = [int64]$file.Length
    }) | Out-Null
}

$duplicateGroups = @($deployEntries | Group-Object DeployRel | Where-Object { $_.Count -gt 1 } | Sort-Object Count -Descending)
$duplicateDetails = foreach ($group in $duplicateGroups) {
    $groupItems = @($group.Group | Sort-Object Mod)
    $mods = foreach ($item in $groupItems) {
        $hash = $null
        try {
            $hash = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256 -ErrorAction Stop).Hash.Substring(0, 16)
        } catch {
            $hash = '<hash-error>'
        }
        [pscustomobject]@{
            Mod = $item.Mod
            Bytes = $item.Length
            Sha256_16 = $hash
        }
    }

    [pscustomobject]@{
        DeployRel = $group.Name
        Count = $group.Count
        UniqueSizeCount = @($groupItems | Select-Object -ExpandProperty Length -Unique).Count
        UniqueHashCount = @($mods | Select-Object -ExpandProperty Sha256_16 -Unique).Count
        Mods = @($mods)
    }
}

$duplicateDetails = @(
    $duplicateDetails |
        Sort-Object @{ Expression = { $_.UniqueHashCount -gt 1 }; Descending = $true },
                    @{ Expression = { $_.UniqueSizeCount -gt 1 }; Descending = $true },
                    DeployRel
)

$deploymentCheck = [ordered]@{
    Parsed = [bool]$deployment
    Error = $deploymentError
    Method = $null
    GameId = $null
    DeploymentTimeLocal = $null
    RecordedFiles = 0
    UniqueSourceMods = 0
    MissingSourceCount = $null
    MissingTargetCount = $null
    SizeMismatchCount = $null
    NotHardlinkedCount = $null
    DuplicateRelPathsInsideRecord = $null
    ExtraStagingFilesNotInDeploymentCount = $null
    MissingSourceSample = @()
    MissingTargetSample = @()
    SizeMismatchSample = @()
    NotHardlinkedSample = @()
    ExtraStagingSample = @()
}

if ($deployment) {
    $deploymentCheck.Method = $deployment.deploymentMethod
    $deploymentCheck.GameId = $deployment.gameId
    if ($deployment.deploymentTime) {
        $deploymentCheck.DeploymentTimeLocal = ([DateTimeOffset]::FromUnixTimeMilliseconds([int64]$deployment.deploymentTime)).LocalDateTime.ToString('yyyy-MM-dd HH:mm:ss')
    }

    $recordedFiles = @($deployment.files)
    $deploymentCheck.RecordedFiles = $recordedFiles.Count
    $deploymentCheck.UniqueSourceMods = @($recordedFiles | ForEach-Object { $_.source } | Sort-Object -Unique).Count

    $missingSource = [System.Collections.Generic.List[string]]::new()
    $missingTarget = [System.Collections.Generic.List[string]]::new()
    $sizeMismatch = [System.Collections.Generic.List[object]]::new()
    $notHardlinked = [System.Collections.Generic.List[object]]::new()
    $recordedPairs = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $relPathCounts = @{}

    foreach ($entry in $recordedFiles) {
        $relPath = [string]$entry.relPath
        $sourceName = [string]$entry.source
        $targetRel = if ($entry.target) { [string]$entry.target } else { $relPath }
        $sourcePath = Join-Path (Join-Path $stagingRoot $sourceName) $relPath
        $targetPath = Join-Path $GamePath $targetRel
        $recordedPairs.Add(($sourceName + '|' + $relPath)) | Out-Null
        $relPathKey = $relPath.ToLowerInvariant()
        if (-not $relPathCounts.ContainsKey($relPathKey)) { $relPathCounts[$relPathKey] = 0 }
        $relPathCounts[$relPathKey]++

        if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
            $missingSource.Add((ConvertTo-RelativePath -BasePath $stagingRoot -Path $sourcePath)) | Out-Null
            continue
        }
        if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
            $missingTarget.Add($targetPath) | Out-Null
            continue
        }

        $sourceItem = Get-Item -LiteralPath $sourcePath -Force
        $targetItem = Get-Item -LiteralPath $targetPath -Force
        if ($sourceItem.Length -ne $targetItem.Length) {
            $sizeMismatch.Add([pscustomobject]@{
                RelPath = $relPath
                Source = $sourceName
                SourceBytes = [int64]$sourceItem.Length
                TargetBytes = [int64]$targetItem.Length
            }) | Out-Null
        }

        $sourceId = Get-FileIdentitySafe -Path $sourcePath
        $targetId = Get-FileIdentitySafe -Path $targetPath
        if ($sourceId -and $targetId -and $sourceId -ne $targetId) {
            $notHardlinked.Add([pscustomobject]@{
                RelPath = $relPath
                Source = $sourceName
            }) | Out-Null
        }
    }

    $extra = [System.Collections.Generic.List[object]]::new()
    foreach ($entry in $deployEntries) {
        $key = $entry.Mod + '|' + $entry.DeployRel
        if (-not $recordedPairs.Contains($key)) {
            $extra.Add([pscustomobject]@{
                Mod = $entry.Mod
                RelPath = $entry.DeployRel
            }) | Out-Null
        }
    }

    $deploymentCheck.MissingSourceCount = $missingSource.Count
    $deploymentCheck.MissingTargetCount = $missingTarget.Count
    $deploymentCheck.SizeMismatchCount = $sizeMismatch.Count
    $deploymentCheck.NotHardlinkedCount = $notHardlinked.Count
    $deploymentCheck.DuplicateRelPathsInsideRecord = @($relPathCounts.GetEnumerator() | Where-Object { $_.Value -gt 1 }).Count
    $deploymentCheck.ExtraStagingFilesNotInDeploymentCount = $extra.Count
    $deploymentCheck.MissingSourceSample = @($missingSource | Select-Object -First $MaxSamples)
    $deploymentCheck.MissingTargetSample = @($missingTarget | Select-Object -First $MaxSamples)
    $deploymentCheck.SizeMismatchSample = @($sizeMismatch | Select-Object -First $MaxSamples)
    $deploymentCheck.NotHardlinkedSample = @($notHardlinked | Select-Object -First $MaxSamples)
    $deploymentCheck.ExtraStagingSample = @($extra | Select-Object -First $MaxSamples)
}

$profile = Get-LatestProfileState -VortexRoot $vortexRoot

$logReports = @()
if (-not $SkipGameLogs -and (Test-Path -LiteralPath $GamePath)) {
    $knownLogs = @(
        (Join-Path $GamePath 'bin\x64\plugins\cyber_engine_tweaks\cyber_engine_tweaks.log'),
        (Join-Path $GamePath 'bin\x64\plugins\cyber_engine_tweaks\scripting.log'),
        (Join-Path $GamePath 'bin\x64\plugins\cyber_engine_tweaks\gamelog.log'),
        (Join-Path $GamePath 'r6\logs\redscript_rCURRENT.log')
    )

    $red4extLog = Get-LatestLog -Root (Join-Path $GamePath 'red4ext\logs') -Filter 'red4ext-*.log'
    $archiveXlLog = Get-LatestLog -Root (Join-Path $GamePath 'red4ext\plugins\ArchiveXL') -Filter 'ArchiveXL-*.log'
    $tweakXlLog = Get-LatestLog -Root (Join-Path $GamePath 'red4ext\plugins\TweakXL') -Filter 'TweakXL-*.log'
    foreach ($candidate in @($red4extLog, $archiveXlLog, $tweakXlLog)) {
        if ($candidate) {
            $knownLogs += $candidate.FullName
        }
    }

    foreach ($logPath in @($knownLogs | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique)) {
        $matches = Search-Log -Path $logPath -Max $MaxSamples
        $logReports += [pscustomobject]@{
            Path = $logPath
            LastWriteTime = (Get-Item -LiteralPath $logPath).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
            Bytes = [int64](Get-Item -LiteralPath $logPath).Length
            MatchCount = @($matches).Count
            Matches = @($matches)
        }
    }
}

$vortexLogs = @()
foreach ($log in @(Get-ChildItem -LiteralPath $vortexRoot -File -Filter 'vortex*.log' -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 0 } | Sort-Object LastWriteTime -Descending | Select-Object -First 2)) {
    $matches = Search-Log -Path $log.FullName -Max $MaxSamples
    $vortexLogs += [pscustomobject]@{
        Path = $log.FullName
        LastWriteTime = $log.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
        Bytes = [int64]$log.Length
        MatchCount = @($matches).Count
        Matches = @($matches)
    }
}

$summary = [ordered]@{
    CreatedAt = (Get-Date).ToString('o')
    StagingPath = $stagingRoot
    GamePath = $GamePath
    Staging = [ordered]@{
        TopLevelDirectories = $topDirs.Count
        Files = $files.Count
        Directories = $dirs.Count
        TotalGiB = [math]::Round(($totalBytes / 1GB), 3)
        ZeroByteFiles = $zeroByte.Count
        ZeroByteNeedsReview = @($zeroNeedsReview | Select-Object -First $MaxSamples | ForEach-Object { ConvertTo-RelativePath -BasePath $stagingRoot -Path $_.FullName })
        EmptyDirectories = $emptyDirs.Count
        EmptyDirectorySample = @($emptyDirs | Select-Object -First $MaxSamples | ForEach-Object { ConvertTo-RelativePath -BasePath $stagingRoot -Path $_.FullName })
        ReparsePoints = $reparsePoints.Count
        LongPathsGE240 = $long240.Count
        LongPathsGE260 = $long260.Count
        LooseGameFoldersAtStagingRoot = @($looseGameFolders | ForEach-Object { $_.Name })
    }
    Deployment = $deploymentCheck
    Conflicts = [ordered]@{
        DuplicateDeployPathCount = $duplicateGroups.Count
        DuplicateDifferentSizeCount = @($duplicateDetails | Where-Object { $_.UniqueSizeCount -gt 1 }).Count
        DuplicateDifferentContentCount = @($duplicateDetails | Where-Object { $_.UniqueHashCount -gt 1 }).Count
        DuplicateDeployPathSample = @($duplicateDetails | Select-Object -First $MaxSamples)
    }
    Profile = $profile
    VortexLogs = $vortexLogs
    GameLogs = $logReports
}

Write-Host ''
Write-Host '=== Cyberpunk 2077 Vortex Mods Health ==='
Write-Host ("Staging files: {0}, dirs: {1}, size: {2} GiB" -f $summary.Staging.Files, $summary.Staging.Directories, $summary.Staging.TotalGiB)
Write-Host ("Deployment parsed: {0}, recorded files: {1}, missing source/target: {2}/{3}, size mismatch: {4}" -f $summary.Deployment.Parsed, $summary.Deployment.RecordedFiles, $summary.Deployment.MissingSourceCount, $summary.Deployment.MissingTargetCount, $summary.Deployment.SizeMismatchCount)
Write-Host ("Duplicate deploy paths: {0} ({1} with different content)" -f $summary.Conflicts.DuplicateDeployPathCount, $summary.Conflicts.DuplicateDifferentContentCount)
Write-Host ("Zero-byte files needing review: {0}" -f @($summary.Staging.ZeroByteNeedsReview).Count)
Write-Host ("Long paths >=260: {0}" -f $summary.Staging.LongPathsGE260)
if ($profile) {
    Write-Host ("Profile: {0} enabled, {1} disabled" -f $profile.EnabledCount, $profile.DisabledCount)
}
if ($logReports.Count -gt 0) {
    $logMatchCount = [int](($logReports | Measure-Object -Property MatchCount -Sum).Sum)
    Write-Host ("Game log warning/error samples: {0}" -f $logMatchCount)
}

if ($ReportPath) {
    $reportFullPath = [System.IO.Path]::GetFullPath($ReportPath)
    $reportDir = Split-Path -Parent $reportFullPath
    if ($reportDir -and -not (Test-Path -LiteralPath $reportDir)) {
        New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    }
    $summary | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $reportFullPath -Encoding UTF8
    Write-Step "Report written: $reportFullPath"
}

return [pscustomobject]$summary
