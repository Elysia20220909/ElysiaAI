#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet('Balanced', 'Performance', 'Ultra')]
    [string]$Profile = 'Performance',

    [string]$GamePath,
    [string]$XivLauncherPath,

    [switch]$SkipGShadeOptimization,
    [switch]$OptimizePreset,
    [switch]$QuietStartup,
    [switch]$ShowActiveEffects,

    [switch]$NoLaunch,
    [switch]$WaitForGame,
    [switch]$SetProcessPriority,

    [ValidateRange(5, 600)]
    [int]$WaitTimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "[FFXIV Launcher] $Message"
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

function Invoke-GShadeOptimization {
    $scriptPath = Join-Path $PSScriptRoot 'Optimize-FFXIVGShade.ps1'
    if (-not (Test-Path -LiteralPath $scriptPath)) {
        throw "Missing helper script: $scriptPath"
    }

    $gshadeArgs = @{
        Profile = $Profile
    }

    if ($GamePath) {
        $gshadeArgs.GamePath = $GamePath
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

    Write-Step "Applying GShade profile: $Profile"
    if ($PSCmdlet.ShouldProcess($scriptPath, "Run GShade optimization profile $Profile")) {
        & $scriptPath @gshadeArgs
    }
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

if (-not $SkipGShadeOptimization) {
    Invoke-GShadeOptimization
} else {
    Write-Step 'Skipped GShade optimization.'
}

if ($NoLaunch) {
    Write-Step 'NoLaunch was set; XIVLauncher was not started.'
} else {
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

if ($WaitForGame) {
    $detected = Wait-ForGameProcess -TimeoutSeconds $WaitTimeoutSeconds
    if ($detected -and $SetProcessPriority) {
        Set-GamePriority
    }
} elseif ($SetProcessPriority) {
    Set-GamePriority
}

Write-Step 'Done.'
