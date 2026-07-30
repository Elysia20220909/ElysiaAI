# ElysiaAI Python Sidecar Build Script (Windows / PowerShell)
# Builds python/fastapi_server.py into a standalone executable inside src-tauri/bin/

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path "$PSScriptRoot/.."
$PythonDir = Join-Path $ProjectRoot "python"
$ServerScript = Join-Path $PythonDir "fastapi_server.py"
$TauriBinDir = Join-Path $ProjectRoot "src-tauri/bin"

Write-Host "[Elysia OS] Resolving python dependencies..." -ForegroundColor Cyan

# Verify PyInstaller is installed
& python -m pip show pyinstaller > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[Elysia OS] Installing PyInstaller..." -ForegroundColor Yellow
    & python -m pip install pyinstaller
}

# Ensure output directory exists
if (-not (Test-Path $TauriBinDir)) {
    New-Item -ItemType Directory -Path $TauriBinDir | Out-Null
}

$TargetTriple = "x86_64-pc-windows-msvc"
$TargetName = "fastapi_server-$TargetTriple"

Write-Host "[Elysia OS] Compiling Python server with PyInstaller..." -ForegroundColor Cyan
& pyinstaller --onefile --noconfirm --clean `
    --exclude-module pandas `
    --exclude-module scipy `
    --exclude-module matplotlib `
    --exclude-module torch `
    --exclude-module torchvision `
    --exclude-module torchaudio `
    --exclude-module tkinter `
    --distpath $TauriBinDir `
    --name $TargetName `
    $ServerScript

# Cleanup build artifacts
Write-Host "[Elysia OS] Cleaning up build artifacts..." -ForegroundColor Cyan
if (Test-Path "$ProjectRoot/build") { Remove-Item -Recurse -Force "$ProjectRoot/build" }
if (Test-Path "$ProjectRoot/$TargetName.spec") { Remove-Item -Force "$ProjectRoot/$TargetName.spec" }

$ExecutablePath = Join-Path $TauriBinDir "$TargetName.exe"
if (Test-Path $ExecutablePath) {
    Write-Host "[Elysia OS] Python Sidecar successfully created at: $ExecutablePath" -ForegroundColor Green
} else {
    Write-Error "[Elysia OS] Build failed. Output executable not found."
}
