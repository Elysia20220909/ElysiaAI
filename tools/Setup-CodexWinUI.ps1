#Requires -Version 5.1
<#
.SYNOPSIS
Checks or installs the local Codex/Copilot WinUI development prerequisites.

.DESCRIPTION
Default mode is report-only. Add -Apply to install missing tools and enable
Developer Mode when this shell has administrator rights.

The script keeps setup local-first and operator-friendly:
- Installs GitHub Copilot CLI with winget when missing.
- Installs the winui@awesome-copilot plugin when missing.
- Installs .NET 10 SDK, Windows App Development CLI, and WinUI templates.
- Enables Developer Mode only when running as Administrator.
- Does not read .env files, secrets, or project credentials.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\tools\Setup-CodexWinUI.ps1

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\tools\Setup-CodexWinUI.ps1 -Apply

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\tools\Setup-CodexWinUI.ps1 -Apply -RunWinUISetupSkill
#>

[CmdletBinding()]
param(
    [switch]$Apply,
    [switch]$RunWinUISetupSkill,
    [switch]$SkipDeveloperMode
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:CopilotPackagePath = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages\GitHub.Copilot_Microsoft.Winget.Source_8wekyb3d8bbwe\copilot.exe"
$script:DeveloperModePath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock"

function Write-SetupLog {
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

function Get-CommandPath {
    param([Parameter(Mandatory)][string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        return $null
    }

    return $command.Source
}

function Invoke-External {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [string[]]$Arguments = @(),
        [switch]$AllowFailure
    )

    $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0 -and -not $AllowFailure) {
        throw "$FilePath $($Arguments -join ' ') failed with exit code $($process.ExitCode)."
    }

    return $process.ExitCode
}

function Get-CopilotPath {
    $pathCommand = Get-CommandPath -Name "copilot"
    if ($pathCommand) {
        return $pathCommand
    }

    if (Test-Path -LiteralPath $script:CopilotPackagePath) {
        return $script:CopilotPackagePath
    }

    $wingetPackagesRoot = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    if (Test-Path -LiteralPath $wingetPackagesRoot) {
        $candidate = Get-ChildItem -Path $wingetPackagesRoot -Recurse -Filter "copilot.exe" -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -like "*GitHub.Copilot*" } |
            Select-Object -First 1
        if ($candidate) {
            return $candidate.FullName
        }
    }

    return $null
}

function Test-WinGetPackageInstalled {
    param([Parameter(Mandatory)][string]$PackageId)

    $winget = Get-CommandPath -Name "winget"
    if (-not $winget) {
        return $false
    }

    & $winget list --id $PackageId --exact --accept-source-agreements *> $null
    return $LASTEXITCODE -eq 0
}

function Install-WinGetPackage {
    param(
        [Parameter(Mandatory)][string]$PackageId,
        [string]$DisplayName = $PackageId,
        [string]$CommandName = ""
    )

    if ($CommandName -and (Get-CommandPath -Name $CommandName)) {
        Write-SetupLog "$DisplayName command is already available." "OK"
        return
    }

    $winget = Get-CommandPath -Name "winget"
    if (-not $winget) {
        throw "winget is required but was not found."
    }

    if (Test-WinGetPackageInstalled -PackageId $PackageId) {
        Write-SetupLog "$DisplayName is already installed." "OK"
        return
    }

    if (-not $Apply) {
        Write-SetupLog "Would install $DisplayName with winget." "DRYRUN"
        return
    }

    Write-SetupLog "Installing $DisplayName with winget..."
    Invoke-External -FilePath $winget -Arguments @(
        "install",
        "--id", $PackageId,
        "--source", "winget",
        "--exact",
        "--silent",
        "--accept-package-agreements",
        "--accept-source-agreements"
    ) | Out-Null
    Write-SetupLog "$DisplayName installed." "OK"
}

function Test-DotNetSdkMajorInstalled {
    param([Parameter(Mandatory)][string]$Major)

    $dotnet = Get-CommandPath -Name "dotnet"
    if (-not $dotnet) {
        return $false
    }

    $sdks = & $dotnet --list-sdks 2>$null
    if ($LASTEXITCODE -ne 0) {
        return $false
    }

    return (($sdks -join "`n") -match ("^" + [regex]::Escape($Major) + "\."))
}

function Ensure-DotNet10Sdk {
    if (Test-DotNetSdkMajorInstalled -Major "10") {
        Write-SetupLog ".NET 10 SDK is already installed." "OK"
        return
    }

    Install-WinGetPackage -PackageId "Microsoft.DotNet.SDK.10" -DisplayName ".NET 10 SDK"
}

function Ensure-CopilotCli {
    Install-WinGetPackage -PackageId "GitHub.Copilot" -DisplayName "GitHub Copilot CLI"

    $copilot = Get-CopilotPath
    if (-not $copilot) {
        if ($Apply) {
            throw "GitHub Copilot CLI was installed, but copilot.exe was not found in this shell. Open a new PowerShell session or set PATH."
        }

        Write-SetupLog "GitHub Copilot CLI is not visible yet." "WARN"
        return $null
    }

    Write-SetupLog "GitHub Copilot CLI found: $copilot" "OK"
    return $copilot
}

function Test-CopilotPluginInstalled {
    param(
        [Parameter(Mandatory)][string]$CopilotPath,
        [Parameter(Mandatory)][string]$PluginName
    )

    $output = & $CopilotPath plugin list 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to list Copilot plugins: $output"
    }

    return ($output -join "`n") -match [regex]::Escape($PluginName)
}

function Ensure-WinUIPlugin {
    param([Parameter(Mandatory)][string]$CopilotPath)

    if (Test-CopilotPluginInstalled -CopilotPath $CopilotPath -PluginName "winui@awesome-copilot") {
        Write-SetupLog "winui@awesome-copilot is already installed." "OK"
        return
    }

    if (-not $Apply) {
        Write-SetupLog "Would install winui@awesome-copilot." "DRYRUN"
        return
    }

    Write-SetupLog "Installing winui@awesome-copilot..."
    Invoke-External -FilePath $CopilotPath -Arguments @("plugin", "install", "winui@awesome-copilot") | Out-Null
    Write-SetupLog "winui@awesome-copilot installed." "OK"
}

function Ensure-WinUITemplates {
    $dotnet = Get-CommandPath -Name "dotnet"
    if (-not $dotnet) {
        if ($Apply) {
            throw ".NET SDK should be installed but dotnet is not visible in PATH. Open a new PowerShell session and re-run this script."
        }

        Write-SetupLog ".NET SDK is not visible yet." "WARN"
        return
    }

    $templates = & $dotnet new list winui 2>&1
    if ($LASTEXITCODE -eq 0 -and (($templates -join "`n") -match "winui-mvvm")) {
        Write-SetupLog "WinUI templates are already installed." "OK"
        return
    }

    if (-not $Apply) {
        Write-SetupLog "Would install Microsoft.WindowsAppSDK.WinUI.CSharp.Templates." "DRYRUN"
        return
    }

    Write-SetupLog "Installing WinUI templates..."
    Invoke-External -FilePath $dotnet -Arguments @(
        "new",
        "install",
        "Microsoft.WindowsAppSDK.WinUI.CSharp.Templates"
    ) | Out-Null
    Write-SetupLog "WinUI templates installed." "OK"
}

function Ensure-DeveloperMode {
    if ($SkipDeveloperMode) {
        Write-SetupLog "Developer Mode check skipped by request." "INFO"
        return
    }

    $enabled = $false
    if (Test-Path -LiteralPath $script:DeveloperModePath) {
        $settings = Get-ItemProperty -Path $script:DeveloperModePath
        $enabled = $settings.PSObject.Properties["AllowDevelopmentWithoutDevLicense"] -and
            $settings.AllowDevelopmentWithoutDevLicense -eq 1
    }

    if ($enabled) {
        Write-SetupLog "Developer Mode is enabled." "OK"
        return
    }

    if (-not $Apply) {
        Write-SetupLog "Would enable Developer Mode when running as Administrator." "DRYRUN"
        return
    }

    if (-not (Test-IsAdmin)) {
        Write-SetupLog "Developer Mode requires Administrator rights. Open Settings > System > For developers and turn Developer Mode on." "WARN"
        return
    }

    New-Item -Path $script:DeveloperModePath -Force | Out-Null
    New-ItemProperty -Path $script:DeveloperModePath -Name "AllowDevelopmentWithoutDevLicense" -PropertyType DWord -Value 1 -Force | Out-Null
    Write-SetupLog "Developer Mode enabled." "OK"
}

function Invoke-WinUISetupSkill {
    param([Parameter(Mandatory)][string]$CopilotPath)

    if (-not $RunWinUISetupSkill) {
        Write-SetupLog "Skipping /winui-setup skill. Add -RunWinUISetupSkill to run it." "INFO"
        return
    }

    if (-not $Apply) {
        Write-SetupLog "Would run Copilot CLI /winui-setup skill." "DRYRUN"
        return
    }

    Write-SetupLog "Running Copilot CLI /winui-setup skill..."
    Invoke-External -FilePath $CopilotPath -Arguments @(
        "-C", (Get-Location).Path,
        "-p", "/winui-setup",
        "--allow-all",
        "--no-ask-user",
        "--no-auto-update"
    ) | Out-Null
    Write-SetupLog "/winui-setup skill completed." "OK"
}

function Write-Summary {
    param([string]$CopilotPath)

    $codexPath = $env:ELYSIA_CODEX_BIN
    if (-not $codexPath) {
        $codexPath = Get-CommandPath -Name "codex"
    }

    Write-SetupLog "Summary"
    Write-SetupLog "Apply changes: $Apply"
    Write-SetupLog "Administrator: $(Test-IsAdmin)"
    Write-SetupLog "codex: $codexPath"
    if (-not $codexPath) {
        Write-SetupLog "Codex CLI is not on PATH. The Codex desktop app can still run this script; set ELYSIA_CODEX_BIN for Workbench launch integration." "WARN"
    }
    Write-SetupLog "winget: $(Get-CommandPath -Name 'winget')"
    Write-SetupLog "copilot: $CopilotPath"
    Write-SetupLog "dotnet: $(Get-CommandPath -Name 'dotnet')"
    Write-SetupLog "winapp: $(Get-CommandPath -Name 'winapp')"
}

Write-SetupLog "Codex/Copilot WinUI setup check started."
Ensure-DotNet10Sdk
Install-WinGetPackage -PackageId "Microsoft.WinAppCli" -DisplayName "Windows App Development CLI" -CommandName "winapp"
$copilotPath = Ensure-CopilotCli
if ($copilotPath) {
    Ensure-WinUIPlugin -CopilotPath $copilotPath
    Invoke-WinUISetupSkill -CopilotPath $copilotPath
}
Ensure-WinUITemplates
Ensure-DeveloperMode
Write-Summary -CopilotPath $copilotPath
Write-SetupLog "Codex/Copilot WinUI setup check finished." "OK"
