<#
.SYNOPSIS
  Safely asks common keyboard lighting software to stop or turn lighting off.

.DESCRIPTION
  This helper is intentionally conservative. It does not flash firmware, edit drivers,
  or change Windows registry keys. It can either preview matching lighting processes
  or stop known vendor lighting apps so the keyboard LED turns off or freezes dark,
  depending on the device firmware.

  For the most reliable permanent result, set the vendor app profile to:
  Brightness = 0%, Lighting = Off, or Static Black.

.EXAMPLE
  .\tools\keyboard-led-off.ps1
  Preview detected lighting processes.

.EXAMPLE
  .\tools\keyboard-led-off.ps1 -Apply
  Stop detected lighting processes after confirmation.

.EXAMPLE
  .\tools\keyboard-led-off.ps1 -Apply -Force
  Stop detected lighting processes without an interactive confirmation.
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [switch]$Apply,
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$LightingProcessPatterns = @(
  'Razer Synapse',
  'RazerSynapse',
  'Razer Central',
  'RazerCentral',
  'lghub',
  'LGHUB',
  'iCUE',
  'Corsair.Service',
  'SteelSeriesGG',
  'SteelSeriesEngine',
  'LightingService',
  'ArmouryCrate',
  'AuraService',
  'MysticLight',
  'OpenRGB',
  'SignalRGB'
)

function Get-LightingProcess {
  $processes = Get-Process -ErrorAction SilentlyContinue

  foreach ($process in $processes) {
    foreach ($pattern in $LightingProcessPatterns) {
      if ($process.ProcessName -like "*$pattern*") {
        [PSCustomObject]@{
          Id = $process.Id
          ProcessName = $process.ProcessName
          Pattern = $pattern
        }
        break
      }
    }
  }
}

$matches = @(Get-LightingProcess | Sort-Object ProcessName, Id -Unique)

if ($matches.Count -eq 0) {
  Write-Host 'No known keyboard lighting control processes were detected.'
  Write-Host 'Tip: use your keyboard vendor app and set Brightness to 0%, Lighting to Off, or Static Black.'
  exit 0
}

Write-Host 'Detected possible keyboard lighting control processes:'
$matches | Format-Table -AutoSize

if (-not $Apply) {
  Write-Host ''
  Write-Host 'Preview only. Re-run with -Apply to stop these processes.'
  exit 0
}

if (-not $Force) {
  $answer = Read-Host 'Stop these lighting control processes now? Type YES to continue'
  if ($answer -ne 'YES') {
    Write-Host 'Cancelled. Nothing was changed.'
    exit 1
  }
}

foreach ($match in $matches) {
  if ($PSCmdlet.ShouldProcess($match.ProcessName, 'Stop process')) {
    try {
      Stop-Process -Id $match.Id -Force -ErrorAction Stop
      Write-Host "Stopped: $($match.ProcessName) [$($match.Id)]"
    }
    catch {
      Write-Warning "Failed to stop $($match.ProcessName) [$($match.Id)]: $($_.Exception.Message)"
    }
  }
}

Write-Host ''
Write-Host 'Done. LED behavior depends on the keyboard firmware and vendor profile.'
Write-Host 'For a persistent dark profile, set the vendor app to Brightness 0%, Lighting Off, or Static Black.'
