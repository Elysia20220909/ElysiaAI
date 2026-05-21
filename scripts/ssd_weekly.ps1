[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $env:USERPROFILE "ssd_logs")
)

$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)

    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function New-SafeDirectory {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    New-Item -Force -ItemType Directory -Path $Path | Out-Null
}

function Get-DiskInventory {
    $disks = Get-Disk | Select-Object `
        Number,
        FriendlyName,
        SerialNumber,
        HealthStatus,
        OperationalStatus,
        BusType,
        PartitionStyle,
        Size

    $physicalDisks = Get-PhysicalDisk | Select-Object `
        FriendlyName,
        MediaType,
        BusType,
        HealthStatus,
        OperationalStatus,
        Size

    $volumes = Get-Volume | Select-Object `
        DriveLetter,
        FileSystemLabel,
        FileSystem,
        HealthStatus,
        OperationalStatus,
        SizeRemaining,
        Size

    return [pscustomobject]@{
        Disks = $disks
        PhysicalDisks = $physicalDisks
        Volumes = $volumes
    }
}

function Get-ReliabilityRows {
    $isAdmin = Test-IsAdministrator

    try {
        $rows = Get-PhysicalDisk | ForEach-Object {
            $disk = $_
            $counter = $disk | Get-StorageReliabilityCounter

            [pscustomobject]@{
                FriendlyName = $disk.FriendlyName
                Wear = $counter.Wear
                Temperature = $counter.Temperature
                ReadErrorsTotal = $counter.ReadErrorsTotal
                WriteErrorsTotal = $counter.WriteErrorsTotal
                ReliabilityAvailable = $true
                ReliabilityError = ""
                IsAdministrator = $isAdmin
            }
        }

        return $rows
    }
    catch {
        return [pscustomobject]@{
            FriendlyName = ""
            Wear = $null
            Temperature = $null
            ReadErrorsTotal = $null
            WriteErrorsTotal = $null
            ReliabilityAvailable = $false
            ReliabilityError = $_.Exception.Message
            IsAdministrator = $isAdmin
        }
    }
}

function Write-RawLog {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [object]$Inventory,

        [Parameter(Mandatory)]
        [object]$ReliabilityRows
    )

    $lines = @(
        "Timestamp: $(Get-Date -Format o)"
        "IsAdministrator: $(Test-IsAdministrator)"
        ""
        "[Get-Disk]"
        ($Inventory.Disks | Format-Table -AutoSize | Out-String)
        "[Get-PhysicalDisk]"
        ($Inventory.PhysicalDisks | Format-Table -AutoSize | Out-String)
        "[Get-Volume]"
        ($Inventory.Volumes | Format-Table -AutoSize | Out-String)
        "[Get-StorageReliabilityCounter]"
        ($ReliabilityRows | Format-List * | Out-String)
    )

    $lines | Set-Content -Encoding UTF8 -Path $Path
}

New-SafeDirectory -Path $OutputDirectory

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$rawPath = Join-Path $OutputDirectory "ssd-health-$timestamp.txt"
$csvPath = Join-Path $OutputDirectory "ssd_health_summary.csv"

$inventory = Get-DiskInventory
$reliabilityRows = Get-ReliabilityRows

Write-RawLog -Path $rawPath -Inventory $inventory -ReliabilityRows $reliabilityRows

$summaryRows = $inventory.Disks | ForEach-Object {
    $disk = $_
    $matchedReliability = $reliabilityRows |
        Where-Object { $_.FriendlyName -and $_.FriendlyName -eq $disk.FriendlyName } |
        Select-Object -First 1

    if (-not $matchedReliability) {
        $matchedReliability = $reliabilityRows | Select-Object -First 1
    }

    [pscustomobject]@{
        Timestamp = Get-Date -Format s
        Number = $disk.Number
        FriendlyName = $disk.FriendlyName
        SerialNumber = $disk.SerialNumber
        HealthStatus = $disk.HealthStatus
        OperationalStatus = ($disk.OperationalStatus -join ";")
        BusType = $disk.BusType
        Size = $disk.Size
        Wear = $matchedReliability.Wear
        Temperature = $matchedReliability.Temperature
        ReadErrorsTotal = $matchedReliability.ReadErrorsTotal
        WriteErrorsTotal = $matchedReliability.WriteErrorsTotal
        ReliabilityAvailable = $matchedReliability.ReliabilityAvailable
        ReliabilityError = $matchedReliability.ReliabilityError
        IsAdministrator = $matchedReliability.IsAdministrator
    }
}

$summaryRows | Export-Csv -NoTypeInformation -Encoding UTF8 -Append -Path $csvPath

Write-Host "logged: $rawPath"
Write-Host "summary: $csvPath"
