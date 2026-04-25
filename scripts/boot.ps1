param(
    [int]$Port = 3000,
    [int]$FastApiPort = 8000,
    [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path $PSScriptRoot -Parent
Push-Location $root

try {
    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        throw "Bun is not installed or is not available on PATH."
    }

    $env:PORT = [string]$Port
    $env:FASTAPI_PORT = [string]$FastApiPort
    $env:BIND_HOST = $HostName
    $env:HEALTH_HOST = if ($HostName -eq "0.0.0.0") { "127.0.0.1" } else { $HostName }
    $env:FASTAPI_BASE_URL = "http://$($env:HEALTH_HOST):$FastApiPort"
    $env:PYTHONUTF8 = "1"

    Write-Host "Booting ElysiaAI stack on http://$($env:HEALTH_HOST):$Port ..."
    bun run boot
}
finally {
    Pop-Location
}
