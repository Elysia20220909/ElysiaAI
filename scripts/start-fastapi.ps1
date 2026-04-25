param(
    [int]$Port = 8000,
    [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root

try {
    $env:PYTHONPATH = $root
    $env:PYTHONUTF8 = "1"

    $pythonCandidates = @(
        (Join-Path $root ".venv\Scripts\python.exe"),
        (Join-Path $root "python\venv\Scripts\python.exe")
    )

    $python = $pythonCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $python) {
        $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
        if (-not $pythonCommand) {
            throw "Python is not installed or is not available on PATH."
        }
        $python = $pythonCommand.Source
    }

    Write-Host "Starting FastAPI kernel on http://${HostName}:$Port ..."
    & $python -m uvicorn python.fastapi_server:app --host $HostName --port $Port
}
finally {
    Pop-Location
}
