param(
    [int]$Port = 3000,
    [string]$FastApiBaseUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root

try {
    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        throw "Bun is not installed or is not available on PATH."
    }

    $env:PORT = [string]$Port
    $env:FASTAPI_BASE_URL = $FastApiBaseUrl

    Write-Host "Starting Elysia server on http://127.0.0.1:$Port ..."
    bun run start
}
finally {
    Pop-Location
}
