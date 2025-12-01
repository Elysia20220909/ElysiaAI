$ErrorActionPreference = 'Stop'

Write-Host "🚀 Setting up CUDA GPU acceleration..." -ForegroundColor Cyan

# Check for CUDA
try {
    $cudaVersion = nvcc --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ CUDA Toolkit found" -ForegroundColor Green
        Write-Host $cudaVersion
    }
} catch {
    Write-Warning "CUDA Toolkit not found. GPU acceleration will be disabled."
    Write-Host "Install from: https://developer.nvidia.com/cuda-downloads"
    exit 0
}

# Check for Visual Studio
$vsPath = & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" `
    -latest -property installationPath 2>$null

if (-not $vsPath) {
    Write-Warning "Visual Studio not found. CUDA module cannot be built."
    exit 0
}

Write-Host "✅ Visual Studio found" -ForegroundColor Green

Set-Location (Join-Path $PSScriptRoot '..' 'cuda')

if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm install
    node build.js
    Write-Host "✅ CUDA module built!" -ForegroundColor Green
} else {
    Write-Error "npm not found"
    exit 1
}
