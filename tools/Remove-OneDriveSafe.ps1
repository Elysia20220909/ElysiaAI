#Requires -Version 5.1
<#
.SYNOPSIS
Safely reports on or removes Microsoft OneDrive from a Windows user profile.

.DESCRIPTION
The default mode is report-only. Add -Apply to make changes.

This script is intentionally conservative:
- It does not delete the user's OneDrive folder unless -RemoveUserFolder is used.
- Deleting the user's OneDrive folder also requires -ConfirmUserDataDelete DELETE-ONEDRIVE-DATA.
- Machine-wide registry cleanup requires Administrator rights and -RemoveMachineRegistry.
- Every directory removal is constrained to explicit known OneDrive/cache paths.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\tools\Remove-OneDriveSafe.ps1

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\tools\Remove-OneDriveSafe.ps1 -Apply

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\tools\Remove-OneDriveSafe.ps1 -Apply -PurgeInstallerCaches

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\tools\Remove-OneDriveSafe.ps1 -Apply -RemoveUserFolder -ConfirmUserDataDelete DELETE-ONEDRIVE-DATA

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\tools\Remove-OneDriveSafe.ps1 -Apply -RemoveMachineRegistry
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$Apply,
    [switch]$RemoveUserFolder,
    [string]$ConfirmUserDataDelete,
    [switch]$PurgeInstallerCaches,
    [switch]$RemoveMachineRegistry,
    [switch]$CreateRestorePoint,
    [switch]$SkipExplorerRestart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:IsAdmin = $false
$script:OneDriveClsid = "{018D5C66-4533-4307-9B53-224DE2ED1FE6}"

function Write-Log {
    param(
        [Parameter(Mandatory)][string]$Message,
        [ValidateSet("INFO", "OK", "WARN", "ERROR", "DRYRUN")]
        [string]$Level = "INFO"
    )

    Write-Host ("[{0}] {1}" -f $Level, $Message)
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-FullPathSafe {
    param([Parameter(Mandatory)][string]$Path)

    return [System.IO.Path]::GetFullPath($Path).TrimEnd([char]92)
}

function Test-PathUnderRoot {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string[]]$AllowedRoots
    )

    $fullPath = Get-FullPathSafe -Path $Path
    foreach ($root in $AllowedRoots) {
        $fullRoot = Get-FullPathSafe -Path $root
        if ($fullPath.Equals($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
        if ($fullPath.StartsWith($fullRoot + "\", [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }

    return $false
}

function Invoke-Change {
    param(
        [Parameter(Mandatory)][string]$Description,
        [Parameter(Mandatory)][scriptblock]$Action,
        [switch]$RequiresAdmin
    )

    if ($RequiresAdmin -and -not $script:IsAdmin) {
        Write-Log "$Description skipped because this shell is not running as Administrator." "WARN"
        return
    }

    if (-not $Apply) {
        Write-Log $Description "DRYRUN"
        return
    }

    if (-not $PSCmdlet.ShouldProcess($Description, "Apply OneDrive cleanup step")) {
        return
    }

    try {
        & $Action
        Write-Log "$Description completed." "OK"
    }
    catch {
        Write-Log "$Description failed: $($_.Exception.Message)" "ERROR"
    }
}

function Invoke-NativeProcess {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [string[]]$Arguments = @()
    )

    $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "$FilePath exited with code $($process.ExitCode)."
    }
}

function Get-DirectorySummary {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return [pscustomobject]@{
            Path = $Path
            Exists = $false
            Files = 0
            Directories = 0
            Bytes = 0
        }
    }

    $items = Get-ChildItem -LiteralPath $Path -Force -Recurse -ErrorAction SilentlyContinue
    $files = @($items | Where-Object { -not $_.PSIsContainer })
    $directories = @($items | Where-Object { $_.PSIsContainer })
    $bytes = ($files | Measure-Object -Property Length -Sum).Sum
    if ($null -eq $bytes) {
        $bytes = 0
    }

    return [pscustomobject]@{
        Path = (Resolve-Path -LiteralPath $Path).Path
        Exists = $true
        Files = $files.Count
        Directories = $directories.Count
        Bytes = [int64]$bytes
    }
}

function Format-Bytes {
    param([double]$Bytes)

    if ($Bytes -ge 1TB) { return "{0:N2} TB" -f ($Bytes / 1TB) }
    if ($Bytes -ge 1GB) { return "{0:N2} GB" -f ($Bytes / 1GB) }
    if ($Bytes -ge 1MB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
    if ($Bytes -ge 1KB) { return "{0:N2} KB" -f ($Bytes / 1KB) }
    return "{0:N0} B" -f $Bytes
}

function Get-ObjectPropertyValue {
    param(
        [Parameter(Mandatory)][object]$InputObject,
        [Parameter(Mandatory)][string]$Name
    )

    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Remove-SafeDirectory {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string[]]$AllowedRoots,
        [Parameter(Mandatory)][string]$Description
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Log "$Description not found: $Path" "INFO"
        return
    }

    $resolved = (Resolve-Path -LiteralPath $Path).Path
    $fullPath = Get-FullPathSafe -Path $resolved
    if (-not (Test-PathUnderRoot -Path $fullPath -AllowedRoots $AllowedRoots)) {
        throw "Refusing to remove path outside approved roots: $fullPath"
    }

    Remove-Item -LiteralPath $fullPath -Recurse -Force
}

function Remove-RegistryTree {
    param([Parameter(Mandatory)][string]$Path)

    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
}

function Remove-RegistryValueIfPresent {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )

    $value = Get-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue
    if ($null -ne $value) {
        Remove-ItemProperty -Path $Path -Name $Name -ErrorAction Stop
    }
}

function Set-ExplorerNamespaceHiddenForCurrentUser {
    $paths = @(
        "HKCU:\Software\Classes\CLSID\$script:OneDriveClsid",
        "HKCU:\Software\Classes\Wow6432Node\CLSID\$script:OneDriveClsid"
    )

    foreach ($path in $paths) {
        New-Item -Path $path -Force | Out-Null
        New-ItemProperty -Path $path -Name "System.IsPinnedToNameSpaceTree" -PropertyType DWord -Value 0 -Force | Out-Null
    }
}

function Get-OneDriveSetupCandidates {
    $candidates = @(
        (Join-Path $env:SystemRoot "System32\OneDriveSetup.exe"),
        (Join-Path $env:SystemRoot "SysWOW64\OneDriveSetup.exe"),
        (Join-Path $env:LocalAppData "Microsoft\OneDrive\OneDriveSetup.exe")
    )

    return @($candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) })
}

function Write-OneDriveReport {
    Write-Log "OneDrive cleanup report"
    Write-Log "Administrator: $script:IsAdmin"
    Write-Log "Apply changes: $Apply"
    Write-Log "Remove user folder: $RemoveUserFolder"
    Write-Log "Purge installer caches: $PurgeInstallerCaches"
    Write-Log "Remove machine registry: $RemoveMachineRegistry"

    $processes = @(Get-Process OneDrive -ErrorAction SilentlyContinue)
    if ($processes.Count -gt 0) {
        foreach ($process in $processes) {
            Write-Log ("Process found: {0} pid {1}" -f $process.ProcessName, $process.Id) "WARN"
        }
    }
    else {
        Write-Log "No OneDrive process found." "OK"
    }

    $setupCandidates = @(Get-OneDriveSetupCandidates)
    if ($setupCandidates.Count -gt 0) {
        foreach ($setup in $setupCandidates) {
            Write-Log "Uninstaller candidate: $setup"
        }
    }
    else {
        Write-Log "No OneDriveSetup.exe candidate found." "OK"
    }

    $userOneDrive = Join-Path $env:UserProfile "OneDrive"
    $summary = Get-DirectorySummary -Path $userOneDrive
    if ($summary.Exists) {
        Write-Log ("User OneDrive folder: {0}; files={1}; directories={2}; size={3}" -f $summary.Path, $summary.Files, $summary.Directories, (Format-Bytes -Bytes $summary.Bytes)) "WARN"
    }
    else {
        Write-Log "User OneDrive folder not found." "OK"
    }

    $targets = Get-KnownOneDrivePaths
    foreach ($target in $targets) {
        $exists = Test-Path -LiteralPath $target.Path
        Write-Log ("{0}: {1} exists={2}" -f $target.Kind, $target.Path, $exists)
    }

    if ($WhatIfPreference) {
        Write-Log "Appx package query skipped during -WhatIf to keep the dry run quiet."
    }
    else {
        $appx = @(Get-AppxPackage -Name "*OneDrive*" -ErrorAction SilentlyContinue)
        if ($appx.Count -gt 0) {
            foreach ($package in $appx) {
                Write-Log ("Appx package found: {0}" -f $package.PackageFullName) "WARN"
            }
        }
        else {
            Write-Log "No OneDrive Appx package found." "OK"
        }
    }

    $uninstallEntries = @(Get-ItemProperty -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
            "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue |
        Where-Object {
            $displayName = Get-ObjectPropertyValue -InputObject $_ -Name "DisplayName"
            $displayName -like "*OneDrive*"
        })
    if ($uninstallEntries.Count -gt 0) {
        foreach ($entry in $uninstallEntries) {
            $displayName = Get-ObjectPropertyValue -InputObject $entry -Name "DisplayName"
            $displayVersion = Get-ObjectPropertyValue -InputObject $entry -Name "DisplayVersion"
            Write-Log ("Uninstall entry found: {0} {1}" -f $displayName, $displayVersion) "WARN"
        }
    }
    else {
        Write-Log "No OneDrive uninstall entry found." "OK"
    }
}

function Get-KnownOneDrivePaths {
    $items = @(
        [pscustomobject]@{
            Kind = "Local app data"
            Path = (Join-Path $env:LocalAppData "Microsoft\OneDrive")
            AllowedRoots = @((Join-Path $env:LocalAppData "Microsoft"))
        },
        [pscustomobject]@{
            Kind = "ProgramData cache"
            Path = (Join-Path $env:ProgramData "Microsoft OneDrive")
            AllowedRoots = @($env:ProgramData)
        },
        [pscustomobject]@{
            Kind = "System temp"
            Path = (Join-Path $env:SystemDrive "OneDriveTemp")
            AllowedRoots = @($env:SystemDrive)
        }
    )

    return $items
}

function Get-OneDriveCachePaths {
    return @(
        [pscustomobject]@{
            Kind = "WinGet OneDrive cache"
            Path = (Join-Path $env:LocalAppData "Temp\WinGet")
            Filter = "Microsoft.OneDrive*"
            AllowedRoots = @((Join-Path $env:LocalAppData "Temp\WinGet"))
        },
        [pscustomobject]@{
            Kind = "UniGetUI OneDrive cache"
            Path = (Join-Path $env:LocalAppData "UniGetUI\CachedMedia\Winget\Microsoft.OneDrive")
            Filter = $null
            AllowedRoots = @((Join-Path $env:LocalAppData "UniGetUI\CachedMedia\Winget"))
        }
    )
}

function Invoke-OneDriveRemoval {
    if ($CreateRestorePoint) {
        Invoke-Change -Description "Create system restore point" -RequiresAdmin -Action {
            Checkpoint-Computer -Description "Before OneDrive removal" -RestorePointType "MODIFY_SETTINGS"
        }
    }

    Invoke-Change -Description "Stop running OneDrive processes" -Action {
        Get-Process OneDrive -ErrorAction SilentlyContinue | Stop-Process -Force
    }

    $setupCandidates = @(Get-OneDriveSetupCandidates)
    if ($setupCandidates.Count -gt 0) {
        Invoke-Change -Description "Run OneDrive uninstaller" -Action {
            Invoke-NativeProcess -FilePath $setupCandidates[0] -Arguments @("/uninstall")
        }
    }
    else {
        Write-Log "OneDrive uninstaller was not found; uninstall step skipped." "WARN"
    }

    Invoke-Change -Description "Remove current-user OneDrive startup entry" -Action {
        Remove-RegistryValueIfPresent -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "OneDrive"
    }

    Invoke-Change -Description "Remove current-user OneDrive registry tree" -Action {
        Remove-RegistryTree -Path "HKCU:\Software\Microsoft\OneDrive"
    }

    Invoke-Change -Description "Hide OneDrive Explorer namespace for current user" -Action {
        Set-ExplorerNamespaceHiddenForCurrentUser
    }

    foreach ($target in Get-KnownOneDrivePaths) {
        Invoke-Change -Description ("Remove {0}" -f $target.Kind) -Action {
            Remove-SafeDirectory -Path $target.Path -AllowedRoots $target.AllowedRoots -Description $target.Kind
        }
    }

    if ($PurgeInstallerCaches) {
        foreach ($cache in Get-OneDriveCachePaths) {
            Invoke-Change -Description ("Remove {0}" -f $cache.Kind) -Action {
                if ($cache.Filter) {
                    if (Test-Path -LiteralPath $cache.Path) {
                        Get-ChildItem -LiteralPath $cache.Path -Directory -Filter $cache.Filter -ErrorAction SilentlyContinue |
                            ForEach-Object {
                                Remove-SafeDirectory -Path $_.FullName -AllowedRoots $cache.AllowedRoots -Description $cache.Kind
                            }
                    }
                }
                else {
                    Remove-SafeDirectory -Path $cache.Path -AllowedRoots $cache.AllowedRoots -Description $cache.Kind
                }
            }
        }
    }

    if ($RemoveUserFolder) {
        if ($ConfirmUserDataDelete -ne "DELETE-ONEDRIVE-DATA") {
            Write-Log "User OneDrive folder was not removed. Re-run with -ConfirmUserDataDelete DELETE-ONEDRIVE-DATA to allow it." "WARN"
        }
        else {
            $userOneDrive = Join-Path $env:UserProfile "OneDrive"
            Invoke-Change -Description "Remove user OneDrive folder" -Action {
                Remove-SafeDirectory -Path $userOneDrive -AllowedRoots @($env:UserProfile) -Description "User OneDrive folder"
            }
        }
    }

    if ($RemoveMachineRegistry) {
        $machineRegistryPaths = @(
            "HKLM:\SOFTWARE\Classes\CLSID\$script:OneDriveClsid",
            "HKLM:\SOFTWARE\Classes\Wow6432Node\CLSID\$script:OneDriveClsid"
        )
        foreach ($path in $machineRegistryPaths) {
            Invoke-Change -Description "Remove machine-wide OneDrive Explorer registry key: $path" -RequiresAdmin -Action {
                Remove-RegistryTree -Path $path
            }
        }
    }

    if (-not $SkipExplorerRestart) {
        Invoke-Change -Description "Restart Explorer to refresh namespace changes" -Action {
            $explorer = @(Get-Process explorer -ErrorAction SilentlyContinue)
            if ($explorer.Count -gt 0) {
                $explorer | Stop-Process -Force
            }
            Start-Process explorer.exe
        }
    }
}

$script:IsAdmin = Test-IsAdmin

Write-OneDriveReport
Invoke-OneDriveRemoval
Write-Log "Final report after requested steps:"
Write-OneDriveReport
