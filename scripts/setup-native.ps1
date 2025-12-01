$ErrorActionPreference = 'Stop'

Write-Host "⚡ Setting up Native C++ module..." -ForegroundColor Cyan

# Check for Visual Studio
$vsPath = & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" `
    -latest -property installationPath 2>$null

if (-not $vsPath) {
    Write-Warning "Visual Studio not found. C++ module will use JS fallback."
    Write-Host "Install Visual Studio with C++ tools for native performance."
    exit 0
}

Write-Host "✅ Visual Studio found: $vsPath" -ForegroundColor Green

Set-Location (Join-Path $PSScriptRoot '..' 'native')

if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm install
    Write-Host "✅ Native module built!" -ForegroundColor Green
} else {
    Write-Error "npm not found"
    exit 1
}
