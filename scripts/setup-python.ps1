# Python environment setup script for Windows PowerShell

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root

try {
    Write-Host "Setting up Python environment..."

    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        throw "python was not found. Please install Python 3.11+."
    }

    if (-not (Test-Path ".venv\Scripts\python.exe")) {
        Write-Host "Creating .venv..."
        python -m venv .venv
    }

    $python = Join-Path $root ".venv\Scripts\python.exe"

    Write-Host "Installing Python dependencies from requirements.txt..."
    & $python -m pip install -U pip
    & $python -m pip install -r requirements.txt

    Write-Host "Python environment ready."
    Write-Host "Activate with: .\.venv\Scripts\Activate.ps1"
}
finally {
    Pop-Location
}
