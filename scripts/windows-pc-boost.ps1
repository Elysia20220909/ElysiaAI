#Requires -Version 5.1
<#
.SYNOPSIS
Safe Windows tune-up script for cleanup, developer setup, gaming/FPS tuning, and security checks.

.DESCRIPTION
The default mode is report-only. Add -Apply to make changes.
The script avoids risky "debloat" changes, does not disable Windows Defender,
does not create restore points unless -CreateRestorePoint is supplied,
and only changes settings that are easy to understand or reverse.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\scripts\windows-pc-boost.ps1

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\scripts\windows-pc-boost.ps1 -Mode Clean,Gaming -Apply

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\scripts\windows-pc-boost.ps1 -Mode Dev -Apply -SetupThisRepo

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\scripts\windows-pc-boost.ps1 -Mode Security
#>

[CmdletBinding()]
param(
    [string[]]$Mode = @("Report"),

    [switch]$Apply,
    [switch]$CreateRestorePoint,
    [switch]$SkipRestorePoint,
    [switch]$RunHealthChecks,
    [switch]$ClearRecycleBin,
    [switch]$KeepGameDvr,
    [switch]$EnableHardwareGpuScheduling,
    [switch]$ReduceAnimations,
    [switch]$SetupThisRepo,
    [switch]$UpdateDefenderSignatures,
    [switch]$RunDefenderQuickScan,

    [string[]]$DevPackages = @(
        "Microsoft.WindowsTerminal",
        "Microsoft.PowerShell",
        "Git.Git",
        "GitHub.cli",
        "Microsoft.VisualStudioCode",
        "OpenJS.NodeJS.LTS",
        "Python.Python.3.12",
        "Oven-sh.Bun",
        "Rustlang.Rustup",
        "Docker.DockerDesktop",
        "Ollama.Ollama"
    )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:RepoRoot = Split-Path -Parent $script:ScriptDir
$script:LogDir = Join-Path $script:RepoRoot "logs"
$script:LogPath = Join-Path $script:LogDir ("windows_pc_boost_{0}_{1}.log" -f (Get-Date -Format "yyyyMMdd_HHmmss"), $PID)

function New-SafeDirectory {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

New-SafeDirectory -Path $script:LogDir

function Write-Log {
    param(
        [Parameter(Mandatory)][string]$Message,
        [ValidateSet("INFO", "OK", "WARN", "ERROR", "DRYRUN")]
        [string]$Level = "INFO"
    )

    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    Write-Host $line
    try {
        Add-Content -LiteralPath $script:LogPath -Value $line -Encoding UTF8
    }
    catch {
        Write-Warning "Could not write to log file $script:LogPath: $($_.Exception.Message)"
    }
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

$script:IsAdmin = Test-IsAdmin

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

    try {
        Write-Log $Description "INFO"
        & $Action
        Write-Log "$Description completed." "OK"
    }
    catch {
        Write-Log "$Description failed: $($_.Exception.Message)" "ERROR"
    }
}

function Invoke-Native {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [string[]]$Arguments = @()
    )

    $output = & $FilePath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    if ($null -ne $output) {
        foreach ($line in $output) {
            Write-Log ("  {0}" -f $line.ToString()) "INFO"
        }
    }
    if ($exitCode -ne 0) {
        throw "$FilePath exited with code $exitCode"
    }
}

function Get-SelectedModes {
    $selected = New-Object System.Collections.Generic.HashSet[string]
    $validModes = @{
        "report" = "Report"
        "clean" = "Clean"
        "dev" = "Dev"
        "gaming" = "Gaming"
        "security" = "Security"
        "all" = "All"
    }

    foreach ($item in $Mode) {
        foreach ($part in ($item -split ",")) {
            $key = $part.Trim().ToLowerInvariant()
            if ([string]::IsNullOrWhiteSpace($key)) {
                continue
            }
            if (-not $validModes.ContainsKey($key)) {
                throw "Invalid mode '$part'. Use Report, Clean, Dev, Gaming, Security, or All."
            }

            $modeName = $validModes[$key]
            if ($modeName -eq "All") {
                [void]$selected.Add("Report")
                [void]$selected.Add("Clean")
                [void]$selected.Add("Dev")
                [void]$selected.Add("Gaming")
                [void]$selected.Add("Security")
            }
            else {
                [void]$selected.Add($modeName)
            }
        }
    }
    return $selected
}

function Get-BytesText {
    param([double]$Bytes)
    if ($Bytes -ge 1TB) { return "{0:N2} TB" -f ($Bytes / 1TB) }
    if ($Bytes -ge 1GB) { return "{0:N2} GB" -f ($Bytes / 1GB) }
    if ($Bytes -ge 1MB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
    if ($Bytes -ge 1KB) { return "{0:N2} KB" -f ($Bytes / 1KB) }
    return "{0:N0} B" -f $Bytes
}

function Write-SystemReport {
    Write-Log "Writing system report."
    Write-Log "Administrator: $script:IsAdmin"
    Write-Log "Apply changes: $Apply"

    try {
        $os = Get-CimInstance Win32_OperatingSystem
        Write-Log ("OS: {0} build {1}" -f $os.Caption, $os.BuildNumber)
        Write-Log ("RAM: {0}" -f (Get-BytesText -Bytes ([double]$os.TotalVisibleMemorySize * 1KB)))
    }
    catch {
        Write-Log "OS report failed: $($_.Exception.Message)" "WARN"
    }

    try {
        $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
        Write-Log ("CPU: {0} ({1} cores / {2} logical)" -f $cpu.Name.Trim(), $cpu.NumberOfCores, $cpu.NumberOfLogicalProcessors)
    }
    catch {
        Write-Log "CPU report failed: $($_.Exception.Message)" "WARN"
    }

    try {
        $gpus = Get-CimInstance Win32_VideoController | Where-Object { $_.Name } | Select-Object -ExpandProperty Name
        foreach ($gpu in $gpus) {
            Write-Log "GPU: $gpu"
        }
    }
    catch {
        Write-Log "GPU report failed: $($_.Exception.Message)" "WARN"
    }

    try {
        Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
            Write-Log ("Disk {0}: {1} free of {2}" -f $_.DeviceID, (Get-BytesText -Bytes $_.FreeSpace), (Get-BytesText -Bytes $_.Size))
        }
    }
    catch {
        Write-Log "Disk report failed: $($_.Exception.Message)" "WARN"
    }

    try {
        $activePlan = (& powercfg /GETACTIVESCHEME 2>&1) -join " "
        Write-Log "Power plan: $activePlan"
    }
    catch {
        Write-Log "Power plan report failed: $($_.Exception.Message)" "WARN"
    }
}

function New-RestorePointIfNeeded {
    if (-not $Apply) {
        return
    }
    if (-not $CreateRestorePoint) {
        Write-Log "Restore point creation is disabled by default. Add -CreateRestorePoint to enable it." "INFO"
        return
    }
    if ($SkipRestorePoint) {
        Write-Log "Restore point skipped by -SkipRestorePoint." "WARN"
        return
    }
    if (-not $script:IsAdmin) {
        Write-Log "Restore point skipped because this shell is not running as Administrator." "WARN"
        return
    }

    try {
        Write-Log "Creating restore point before system changes."
        Checkpoint-Computer -Description "Codex Windows PC Boost" -RestorePointType "MODIFY_SETTINGS"
        Write-Log "Restore point created." "OK"
    }
    catch {
        Write-Log "Restore point failed: $($_.Exception.Message)" "WARN"
    }
}

function Get-CleanupTargets {
    $targets = @(
        [pscustomobject]@{ Name = "User temp"; Path = $env:TEMP; MinAgeHours = 24; RequiresAdmin = $false },
        [pscustomobject]@{ Name = "Windows temp"; Path = (Join-Path $env:WINDIR "Temp"); MinAgeHours = 24; RequiresAdmin = $true },
        [pscustomobject]@{ Name = "DirectX shader cache"; Path = (Join-Path $env:LOCALAPPDATA "D3DSCache"); MinAgeHours = 0; RequiresAdmin = $false },
        [pscustomobject]@{ Name = "NVIDIA DX cache"; Path = (Join-Path $env:LOCALAPPDATA "NVIDIA\DXCache"); MinAgeHours = 0; RequiresAdmin = $false },
        [pscustomobject]@{ Name = "NVIDIA GL cache"; Path = (Join-Path $env:LOCALAPPDATA "NVIDIA\GLCache"); MinAgeHours = 0; RequiresAdmin = $false }
    )
    return $targets
}

function Get-ChildItemsForCleanup {
    param(
        [Parameter(Mandatory)][string]$Path,
        [int]$MinAgeHours
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return @()
    }

    $cutoff = (Get-Date).AddHours(-1 * $MinAgeHours)
    return @(Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue | Where-Object {
        $_.LastWriteTime -lt $cutoff
    })
}

function Invoke-Cleanup {
    Write-Log "Starting cleanup mode."

    foreach ($target in Get-CleanupTargets) {
        if ($target.RequiresAdmin -and -not $script:IsAdmin) {
            Write-Log "$($target.Name) skipped because this shell is not running as Administrator." "WARN"
            continue
        }

        $items = Get-ChildItemsForCleanup -Path $target.Path -MinAgeHours $target.MinAgeHours
        Write-Log ("{0}: {1} candidate item(s) in {2}" -f $target.Name, $items.Count, $target.Path)

        if ($items.Count -eq 0) {
            continue
        }

        Invoke-Change -Description "Clean $($target.Name)" -RequiresAdmin:([bool]$target.RequiresAdmin) -Action {
            foreach ($item in $items) {
                try {
                    Remove-Item -LiteralPath $item.FullName -Recurse -Force -ErrorAction Stop
                }
                catch {
                    Write-Log "  Could not remove $($item.FullName): $($_.Exception.Message)" "WARN"
                }
            }
        }
    }

    if ($ClearRecycleBin) {
        Invoke-Change -Description "Clear recycle bin" -Action {
            Clear-RecycleBin -Force -ErrorAction Stop
        }
    }
    else {
        Write-Log "Recycle bin left untouched. Add -ClearRecycleBin to empty it." "INFO"
    }

    if ($RunHealthChecks) {
        Invoke-Change -Description "Run DISM component cleanup" -RequiresAdmin -Action {
            Invoke-Native -FilePath "Dism.exe" -Arguments @("/Online", "/Cleanup-Image", "/StartComponentCleanup")
        }
        Invoke-Change -Description "Run SFC system file check" -RequiresAdmin -Action {
            Invoke-Native -FilePath "sfc.exe" -Arguments @("/scannow")
        }
    }
    else {
        Write-Log "Health checks skipped. Add -RunHealthChecks for DISM and SFC." "INFO"
    }
}

function Test-CommandExists {
    param([Parameter(Mandatory)][string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-WingetPackageInstalled {
    param([Parameter(Mandatory)][string]$PackageId)

    $output = & winget list --id $PackageId --exact 2>$null
    $text = ($output | Out-String)
    return ($LASTEXITCODE -eq 0 -and $text -match [regex]::Escape($PackageId))
}

function Install-WingetPackage {
    param([Parameter(Mandatory)][string]$PackageId)

    if (Test-WingetPackageInstalled -PackageId $PackageId) {
        Write-Log "$PackageId is already installed." "OK"
        return
    }

    Invoke-Change -Description "Install $PackageId with winget" -Action {
        Invoke-Native -FilePath "winget" -Arguments @(
            "install",
            "--id", $PackageId,
            "--exact",
            "--source", "winget",
            "--accept-package-agreements",
            "--accept-source-agreements",
            "--silent"
        )
    }
}

function Invoke-DevSetup {
    Write-Log "Starting developer setup mode."

    if (-not (Test-CommandExists -Name "winget")) {
        Write-Log "winget was not found. Install App Installer from Microsoft Store, then rerun this mode." "ERROR"
        return
    }

    foreach ($package in $DevPackages) {
        Install-WingetPackage -PackageId $package
    }

    if ($SetupThisRepo) {
        Invoke-RepoSetup
    }
    else {
        Write-Log "Repository dependency setup skipped. Add -SetupThisRepo to install this repo's dependencies." "INFO"
    }
}

function Invoke-RepoSetup {
    Write-Log "Starting repository setup for $script:RepoRoot."

    $envExample = Join-Path $script:RepoRoot ".env.example"
    $envFile = Join-Path $script:RepoRoot ".env"
    if ((Test-Path -LiteralPath $envExample) -and -not (Test-Path -LiteralPath $envFile)) {
        Invoke-Change -Description "Create .env from .env.example" -Action {
            Copy-Item -LiteralPath $envExample -Destination $envFile -Force
        }
    }

    if (Test-Path -LiteralPath (Join-Path $script:RepoRoot "package.json")) {
        if (Test-CommandExists -Name "bun") {
            Invoke-Change -Description "Run bun install" -Action {
                Push-Location $script:RepoRoot
                try {
                    Invoke-Native -FilePath "bun" -Arguments @("install")
                }
                finally {
                    Pop-Location
                }
            }
        }
        else {
            Write-Log "bun was not found in this shell. Reopen the terminal after winget installs it, then rerun -SetupThisRepo." "WARN"
        }
    }

    $requirements = Join-Path $script:RepoRoot "requirements.txt"
    if (Test-Path -LiteralPath $requirements) {
        $venvPython = Join-Path $script:RepoRoot ".venv\Scripts\python.exe"
        if (-not (Test-Path -LiteralPath $venvPython)) {
            Invoke-Change -Description "Create Python virtual environment" -Action {
                Invoke-Native -FilePath "python" -Arguments @("-m", "venv", (Join-Path $script:RepoRoot ".venv"))
            }
        }

        if (Test-Path -LiteralPath $venvPython) {
            Invoke-Change -Description "Install Python requirements" -Action {
                Invoke-Native -FilePath $venvPython -Arguments @("-m", "pip", "install", "--upgrade", "pip")
                Invoke-Native -FilePath $venvPython -Arguments @("-m", "pip", "install", "-r", $requirements)
            }
        }
        else {
            Write-Log "Python virtual environment is not available yet. Reopen the terminal and rerun -SetupThisRepo." "WARN"
        }
    }
}

function Set-RegistryDword {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][int]$Value,
        [switch]$RequiresAdmin
    )

    Invoke-Change -Description "Set $Path $Name=$Value" -RequiresAdmin:$RequiresAdmin -Action {
        if (-not (Test-Path -LiteralPath $Path)) {
            New-Item -Path $Path -Force | Out-Null
        }
        New-ItemProperty -Path $Path -Name $Name -PropertyType DWord -Value $Value -Force | Out-Null
    }
}

function Set-RegistryString {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Value,
        [switch]$RequiresAdmin
    )

    Invoke-Change -Description "Set $Path $Name=$Value" -RequiresAdmin:$RequiresAdmin -Action {
        if (-not (Test-Path -LiteralPath $Path)) {
            New-Item -Path $Path -Force | Out-Null
        }
        New-ItemProperty -Path $Path -Name $Name -PropertyType String -Value $Value -Force | Out-Null
    }
}

function Invoke-GamingTuning {
    Write-Log "Starting gaming/FPS tuning mode."

    Invoke-Change -Description "Set active power plan to High performance" -RequiresAdmin -Action {
        Invoke-Native -FilePath "powercfg" -Arguments @("/setactive", "SCHEME_MIN")
        Invoke-Native -FilePath "powercfg" -Arguments @("/setacvalueindex", "SCHEME_CURRENT", "SUB_PROCESSOR", "PROCTHROTTLEMIN", "100")
        Invoke-Native -FilePath "powercfg" -Arguments @("/setacvalueindex", "SCHEME_CURRENT", "SUB_PROCESSOR", "PROCTHROTTLEMAX", "100")
        Invoke-Native -FilePath "powercfg" -Arguments @("/setactive", "SCHEME_CURRENT")
    }

    Set-RegistryDword -Path "HKCU:\Software\Microsoft\GameBar" -Name "AllowAutoGameMode" -Value 1
    Set-RegistryDword -Path "HKCU:\Software\Microsoft\GameBar" -Name "AutoGameModeEnabled" -Value 1

    if ($KeepGameDvr) {
        Write-Log "Game DVR capture settings left untouched by -KeepGameDvr." "INFO"
    }
    else {
        Set-RegistryDword -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Value 0
        Set-RegistryDword -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -Value 0
        if ($Apply) {
            Write-Log "Game DVR background capture disabled. Add -KeepGameDvr next time if you use Windows recording." "INFO"
        }
        else {
            Write-Log "Game DVR background capture would be disabled with -Apply. Add -KeepGameDvr if you use Windows recording." "INFO"
        }
    }

    if ($EnableHardwareGpuScheduling) {
        Set-RegistryDword -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "HwSchMode" -Value 2 -RequiresAdmin
        Write-Log "Hardware GPU scheduling requires a restart and may vary by GPU/driver." "WARN"
    }
    else {
        Write-Log "Hardware GPU scheduling left untouched. Add -EnableHardwareGpuScheduling to enable it." "INFO"
    }

    if ($ReduceAnimations) {
        Set-RegistryDword -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" -Name "VisualFXSetting" -Value 2
        Set-RegistryString -Path "HKCU:\Control Panel\Desktop\WindowMetrics" -Name "MinAnimate" -Value "0"
        Write-Log "Reduced animation settings may require sign out or restart." "WARN"
    }
    else {
        Write-Log "Desktop animation settings left untouched. Add -ReduceAnimations to reduce them." "INFO"
    }
}

$script:SecurityWarningCount = 0
$script:SecurityErrorCount = 0

function Get-ObjectPropertyValue {
    param(
        [Parameter(Mandatory)]$InputObject,
        [Parameter(Mandatory)][string]$Name
    )

    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }
    return $property.Value
}

function Get-RegistryValue {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $item = Get-ItemProperty -LiteralPath $Path -ErrorAction Stop
    $property = $item.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }
    return $property.Value
}

function Write-SecurityCheck {
    param(
        [ValidateSet("OK", "INFO", "WARN", "ERROR")]
        [string]$Status,
        [Parameter(Mandatory)][string]$Message,
        [string]$Recommendation
    )

    if ($Status -eq "WARN") {
        $script:SecurityWarningCount++
    }
    elseif ($Status -eq "ERROR") {
        $script:SecurityErrorCount++
    }

    Write-Log "[Security][$Status] $Message" $Status
    if (-not [string]::IsNullOrWhiteSpace($Recommendation)) {
        Write-Log "  Recommendation: $Recommendation" "INFO"
    }
}

function Invoke-DefenderSecurityAudit {
    if (-not (Test-CommandExists -Name "Get-MpComputerStatus")) {
        Write-SecurityCheck -Status "WARN" -Message "Microsoft Defender PowerShell cmdlets were not found." -Recommendation "Open Windows Security and confirm antivirus protection is active."
        return
    }

    try {
        $status = Get-MpComputerStatus
        $antivirusEnabled = [bool](Get-ObjectPropertyValue -InputObject $status -Name "AntivirusEnabled")
        $realtimeEnabled = [bool](Get-ObjectPropertyValue -InputObject $status -Name "RealTimeProtectionEnabled")
        $behaviorMonitorEnabled = [bool](Get-ObjectPropertyValue -InputObject $status -Name "BehaviorMonitorEnabled")
        $signatureAge = Get-ObjectPropertyValue -InputObject $status -Name "AntivirusSignatureAge"
        $quickScanAge = Get-ObjectPropertyValue -InputObject $status -Name "QuickScanAge"
        $fullScanAge = Get-ObjectPropertyValue -InputObject $status -Name "FullScanAge"

        if ($antivirusEnabled) {
            Write-SecurityCheck -Status "OK" -Message "Microsoft Defender antivirus is enabled."
        }
        else {
            Write-SecurityCheck -Status "ERROR" -Message "Microsoft Defender antivirus is not enabled." -Recommendation "Enable antivirus protection or verify that another trusted antivirus is active."
        }

        if ($realtimeEnabled) {
            Write-SecurityCheck -Status "OK" -Message "Real-time protection is enabled."
        }
        else {
            Write-SecurityCheck -Status "ERROR" -Message "Real-time protection is disabled." -Recommendation "Enable real-time protection in Windows Security."
        }

        if ($behaviorMonitorEnabled) {
            Write-SecurityCheck -Status "OK" -Message "Behavior monitoring is enabled."
        }
        else {
            Write-SecurityCheck -Status "WARN" -Message "Behavior monitoring is not enabled or could not be confirmed." -Recommendation "Check Windows Security protection settings."
        }

        if ($null -ne $signatureAge -and [uint64]$signatureAge -le 3) {
            Write-SecurityCheck -Status "OK" -Message "Defender antivirus signatures are $signatureAge day(s) old."
        }
        else {
            Write-SecurityCheck -Status "WARN" -Message "Defender antivirus signatures appear stale or unknown." -Recommendation "Run with -Apply -UpdateDefenderSignatures, or update from Windows Security."
        }

        if ($null -ne $quickScanAge -and [uint64]$quickScanAge -le 14) {
            Write-SecurityCheck -Status "OK" -Message "Last Defender quick scan was $quickScanAge day(s) ago."
        }
        else {
            Write-SecurityCheck -Status "WARN" -Message "No recent Defender quick scan was found." -Recommendation "Run with -Apply -RunDefenderQuickScan."
        }

        if ($null -ne $fullScanAge -and [uint64]$fullScanAge -le 60) {
            Write-SecurityCheck -Status "OK" -Message "Last Defender full scan was $fullScanAge day(s) ago."
        }
        else {
            Write-SecurityCheck -Status "INFO" -Message "A recent full scan was not confirmed."
        }
    }
    catch {
        Write-SecurityCheck -Status "WARN" -Message "Defender status check failed: $($_.Exception.Message)" -Recommendation "Open Windows Security and confirm protection status manually."
    }

    if (Test-CommandExists -Name "Get-MpPreference") {
        try {
            $preference = Get-MpPreference
            $exclusions = @()
            $exclusionReadRestricted = $false
            foreach ($name in @("ExclusionPath", "ExclusionProcess", "ExclusionExtension", "ExclusionIpAddress")) {
                $value = Get-ObjectPropertyValue -InputObject $preference -Name $name
                if ($null -ne $value) {
                    foreach ($entry in @($value)) {
                        $entryText = [string]$entry
                        if ($entryText -like "N/A:*") {
                            $exclusionReadRestricted = $true
                            continue
                        }
                        if (-not [string]::IsNullOrWhiteSpace($entryText)) {
                            $exclusions += "$name=$entryText"
                        }
                    }
                }
            }

            if ($exclusions.Count -eq 0) {
                if ($exclusionReadRestricted) {
                    Write-SecurityCheck -Status "INFO" -Message "Defender exclusions require Administrator rights to view."
                }
                else {
                    Write-SecurityCheck -Status "OK" -Message "No Defender exclusions were reported."
                }
            }
            else {
                Write-SecurityCheck -Status "WARN" -Message "Defender has $($exclusions.Count) exclusion(s)." -Recommendation "Review exclusions and remove entries you do not explicitly trust."
                $exclusions | Select-Object -First 20 | ForEach-Object {
                    Write-Log "  Exclusion: $_" "INFO"
                }
            }
        }
        catch {
            Write-SecurityCheck -Status "WARN" -Message "Defender preference check failed: $($_.Exception.Message)"
        }
    }

    if ($UpdateDefenderSignatures) {
        Invoke-Change -Description "Update Microsoft Defender signatures" -Action {
            Update-MpSignature
        }
    }

    if ($RunDefenderQuickScan) {
        Invoke-Change -Description "Run Microsoft Defender quick scan" -Action {
            Start-MpScan -ScanType QuickScan
        }
    }
}

function Invoke-FirewallSecurityAudit {
    if (-not (Test-CommandExists -Name "Get-NetFirewallProfile")) {
        Write-SecurityCheck -Status "WARN" -Message "Firewall profile cmdlets were not found."
        return
    }

    try {
        Get-NetFirewallProfile | ForEach-Object {
            if ($_.Enabled) {
                Write-SecurityCheck -Status "OK" -Message "Windows Firewall profile '$($_.Name)' is enabled."
            }
            else {
                Write-SecurityCheck -Status "ERROR" -Message "Windows Firewall profile '$($_.Name)' is disabled." -Recommendation "Enable the firewall profile unless another trusted firewall is managing this device."
            }

            if ($_.DefaultInboundAction -eq "Block") {
                Write-SecurityCheck -Status "OK" -Message "Firewall profile '$($_.Name)' blocks inbound connections by default."
            }
            elseif ($_.DefaultInboundAction -eq "NotConfigured") {
                Write-SecurityCheck -Status "INFO" -Message "Firewall profile '$($_.Name)' default inbound action is not explicitly configured."
            }
            else {
                Write-SecurityCheck -Status "WARN" -Message "Firewall profile '$($_.Name)' default inbound action is '$($_.DefaultInboundAction)'." -Recommendation "Use Block for inbound traffic unless this PC intentionally exposes services."
            }
        }
    }
    catch {
        Write-SecurityCheck -Status "WARN" -Message "Firewall check failed: $($_.Exception.Message)"
    }
}

function Invoke-AccountSecurityAudit {
    if (-not (Test-CommandExists -Name "Get-LocalUser")) {
        Write-SecurityCheck -Status "WARN" -Message "Local user cmdlets were not found."
        return
    }

    try {
        $users = @(Get-LocalUser)
        $enabledUsers = @($users | Where-Object { $_.Enabled })
        Write-SecurityCheck -Status "INFO" -Message "Enabled local users: $($enabledUsers.Count)."
        foreach ($user in $enabledUsers) {
            Write-Log ("  User: {0} SID={1} LastLogon={2}" -f $user.Name, $user.SID.Value, $user.LastLogon) "INFO"
        }

        $builtInAdmin = $users | Where-Object { $_.SID.Value -match "-500$" } | Select-Object -First 1
        if ($builtInAdmin -and $builtInAdmin.Enabled) {
            Write-SecurityCheck -Status "WARN" -Message "The built-in Administrator account is enabled." -Recommendation "Disable it if you do not actively need it."
        }
        else {
            Write-SecurityCheck -Status "OK" -Message "The built-in Administrator account is disabled or not exposed."
        }

        $guest = $users | Where-Object { $_.SID.Value -match "-501$" } | Select-Object -First 1
        if ($guest -and $guest.Enabled) {
            Write-SecurityCheck -Status "WARN" -Message "The built-in Guest account is enabled." -Recommendation "Disable Guest access."
        }
        else {
            Write-SecurityCheck -Status "OK" -Message "The built-in Guest account is disabled or not exposed."
        }
    }
    catch {
        Write-SecurityCheck -Status "WARN" -Message "Local user check failed: $($_.Exception.Message)"
    }

    if (Test-CommandExists -Name "Get-LocalGroup") {
        try {
            $adminGroup = Get-LocalGroup | Where-Object { $_.SID.Value -match "-544$" } | Select-Object -First 1
            if ($adminGroup) {
                $members = @(Get-LocalGroupMember -Group $adminGroup.Name -ErrorAction Stop)
                Write-SecurityCheck -Status "INFO" -Message "Local Administrators group has $($members.Count) member(s)."
                foreach ($member in $members) {
                    Write-Log ("  Administrator member: {0} ({1})" -f $member.Name, $member.ObjectClass) "INFO"
                }
            }
        }
        catch {
            Write-SecurityCheck -Status "WARN" -Message "Local Administrators group check failed: $($_.Exception.Message)"
        }
    }
}

function Invoke-RemoteAccessSecurityAudit {
    try {
        $rdpValue = Get-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server" -Name "fDenyTSConnections"
        if ($null -eq $rdpValue) {
            Write-SecurityCheck -Status "INFO" -Message "Remote Desktop registry state was not found."
        }
        elseif ([int]$rdpValue -eq 1) {
            Write-SecurityCheck -Status "OK" -Message "Remote Desktop is disabled."
        }
        else {
            Write-SecurityCheck -Status "WARN" -Message "Remote Desktop is enabled." -Recommendation "Keep RDP disabled unless needed, and require Network Level Authentication when enabled."
        }
    }
    catch {
        Write-SecurityCheck -Status "WARN" -Message "Remote Desktop check failed: $($_.Exception.Message)"
    }

    try {
        $winRm = Get-CimInstance Win32_Service -Filter "Name='WinRM'"
        if ($null -eq $winRm) {
            Write-SecurityCheck -Status "INFO" -Message "WinRM service was not found."
        }
        elseif ($winRm.State -eq "Running") {
            Write-SecurityCheck -Status "WARN" -Message "WinRM remote management service is running." -Recommendation "Leave WinRM off unless you intentionally manage this PC remotely."
        }
        else {
            Write-SecurityCheck -Status "OK" -Message "WinRM remote management service is not running."
        }
    }
    catch {
        Write-SecurityCheck -Status "WARN" -Message "WinRM check failed: $($_.Exception.Message)"
    }
}

function Invoke-WindowsHardeningAudit {
    try {
        $uac = Get-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA"
        if ($null -ne $uac -and [int]$uac -eq 1) {
            Write-SecurityCheck -Status "OK" -Message "UAC is enabled."
        }
        else {
            Write-SecurityCheck -Status "WARN" -Message "UAC is disabled or could not be confirmed." -Recommendation "Keep UAC enabled for daily use."
        }
    }
    catch {
        Write-SecurityCheck -Status "WARN" -Message "UAC check failed: $($_.Exception.Message)"
    }

    foreach ($serviceName in @("wuauserv", "UsoSvc", "BITS")) {
        try {
            $service = Get-CimInstance Win32_Service -Filter "Name='$serviceName'"
            if ($service -and $service.StartMode -ne "Disabled") {
                Write-SecurityCheck -Status "OK" -Message "Service '$serviceName' is not disabled."
            }
            else {
                Write-SecurityCheck -Status "WARN" -Message "Service '$serviceName' is disabled or missing." -Recommendation "Windows Update components should not be disabled on an internet-connected PC."
            }
        }
        catch {
            Write-SecurityCheck -Status "WARN" -Message "Service '$serviceName' check failed: $($_.Exception.Message)"
        }
    }

    if (Test-CommandExists -Name "Get-BitLockerVolume") {
        try {
            $bitLocker = Get-BitLockerVolume -MountPoint $env:SystemDrive -ErrorAction Stop
            if ($bitLocker.ProtectionStatus -eq "On") {
                Write-SecurityCheck -Status "OK" -Message "BitLocker protection is on for $env:SystemDrive."
            }
            else {
                Write-SecurityCheck -Status "WARN" -Message "BitLocker protection is not on for $env:SystemDrive." -Recommendation "Enable device encryption or BitLocker if available on this Windows edition."
            }
        }
        catch {
            Write-SecurityCheck -Status "INFO" -Message "BitLocker check could not complete: $($_.Exception.Message)"
        }
    }

    if (Test-CommandExists -Name "Get-WindowsOptionalFeature") {
        try {
            $smb1 = Get-WindowsOptionalFeature -Online -FeatureName "SMB1Protocol" -ErrorAction Stop
            if ($smb1.State -eq "Enabled") {
                Write-SecurityCheck -Status "WARN" -Message "SMBv1 optional feature is enabled." -Recommendation "Disable SMBv1 unless an old device absolutely requires it."
            }
            else {
                Write-SecurityCheck -Status "OK" -Message "SMBv1 optional feature is not enabled."
            }
        }
        catch {
            Write-SecurityCheck -Status "INFO" -Message "SMBv1 optional feature check could not complete: $($_.Exception.Message)"
        }
    }
}

function Invoke-AutorunSecurityAudit {
    $autorunPaths = @(
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce",
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run",
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\RunOnce"
    )

    foreach ($path in $autorunPaths) {
        try {
            if (-not (Test-Path -LiteralPath $path)) {
                continue
            }

            $item = Get-ItemProperty -LiteralPath $path
            $entries = @($item.PSObject.Properties | Where-Object {
                $_.Name -notin @("PSPath", "PSParentPath", "PSChildName", "PSDrive", "PSProvider")
            })

            Write-SecurityCheck -Status "INFO" -Message "$path has $($entries.Count) autorun entr$(if ($entries.Count -eq 1) { 'y' } else { 'ies' })."
            foreach ($entry in $entries) {
                Write-Log ("  Autorun: {0} = {1}" -f $entry.Name, $entry.Value) "INFO"
            }
        }
        catch {
            Write-SecurityCheck -Status "WARN" -Message "Autorun check failed for ${path}: $($_.Exception.Message)"
        }
    }
}

function Invoke-AuditPolicyReport {
    if (-not (Test-CommandExists -Name "auditpol")) {
        Write-SecurityCheck -Status "INFO" -Message "auditpol.exe was not found."
        return
    }
    if (-not $script:IsAdmin) {
        Write-SecurityCheck -Status "INFO" -Message "Audit policy query requires an Administrator shell on this PC."
        return
    }

    try {
        Write-SecurityCheck -Status "INFO" -Message "Current Windows audit policy follows."
        Invoke-Native -FilePath "auditpol" -Arguments @("/get", "/category:*")
    }
    catch {
        Write-SecurityCheck -Status "WARN" -Message "Audit policy query failed: $($_.Exception.Message)"
    }
}

function Invoke-SecurityAudit {
    Write-Log "Starting security check mode."
    Write-Log "Security mode is read-only unless -Apply is combined with -UpdateDefenderSignatures or -RunDefenderQuickScan." "INFO"

    Invoke-DefenderSecurityAudit
    Invoke-FirewallSecurityAudit
    Invoke-AccountSecurityAudit
    Invoke-RemoteAccessSecurityAudit
    Invoke-WindowsHardeningAudit
    Invoke-AutorunSecurityAudit
    Invoke-AuditPolicyReport

    Write-Log "Security summary: $script:SecurityErrorCount error(s), $script:SecurityWarningCount warning(s)." "INFO"
}

function Write-FinalNotes {
    Write-Log "Log file: $script:LogPath"
    if (-not $Apply) {
        Write-Log "No changes were made. Rerun with -Apply to execute selected modes." "DRYRUN"
    }
    if ($Apply) {
        Write-Log "Restart Windows after Gaming mode or driver-related package installs." "INFO"
    }
}

$selectedModes = Get-SelectedModes
Write-Log "Selected modes: $($selectedModes -join ', ')"

if ($selectedModes.Contains("Report")) {
    Write-SystemReport
}

if ($selectedModes.Contains("Clean") -or $selectedModes.Contains("Dev") -or $selectedModes.Contains("Gaming")) {
    New-RestorePointIfNeeded
}

if ($selectedModes.Contains("Clean")) {
    Invoke-Cleanup
}

if ($selectedModes.Contains("Dev")) {
    Invoke-DevSetup
}

if ($selectedModes.Contains("Gaming")) {
    Invoke-GamingTuning
}

if ($selectedModes.Contains("Security")) {
    Invoke-SecurityAudit
}

Write-FinalNotes
