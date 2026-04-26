param(
    [int]$Port = 3000,
    [int]$FastApiPort = 8000,
    [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root

try {
    Write-Host "Starting the unified ElysiaAI stack..."
    & (Join-Path $PSScriptRoot "boot.ps1") -Port $Port -FastApiPort $FastApiPort -HostName $HostName
}
finally {
    Pop-Location
}
