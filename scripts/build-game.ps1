# Elysia AI Game - Cross-Platform Build Script
# Supports: macOS (Intel/ARM), Windows (x64/ia32), Linux (x64)

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("all", "mac", "mac-intel", "mac-arm",
        "win", "win-x64", "win-ia32",
        "linux", "standalone")]
    [string]$Platform = "all"
)

$ErrorActionPreference = "Stop"

Write-Host "🎮 Elysia AI Game - Cross-Platform Builder" -ForegroundColor Cyan
Write-Host "Platform: $Platform" -ForegroundColor Yellow
Write-Host ""

# Navigate to game directory
$GameDir = Join-Path $PSScriptRoot ".." "ElysiaAI" "game"
if (-not (Test-Path $GameDir)) {
    $GameDir = Join-Path $PSScriptRoot ".." "game"
}

if (-not (Test-Path $GameDir)) {
    Write-Host "❌ Game directory not found!" -ForegroundColor Red
    exit 1
}

Set-Location $GameDir

# Check if bun is installed
if (!(Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Bun is not installed. Please install Bun first." -ForegroundColor Red
    Write-Host "Install: https://bun.sh/" -ForegroundColor Yellow
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Green
bun install

# Create dist directory
$DistDir = Join-Path $GameDir "dist"
if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
}

# Build based on platform selection
Write-Host ""
Write-Host "🔨 Building for: $Platform" -ForegroundColor Green

switch ($Platform) {
    "all" {
        Write-Host "Building for ALL platforms..." -ForegroundColor Cyan
        bun run build:all
    }
    "mac" {
        Write-Host "Building for macOS (Intel + ARM)..." -ForegroundColor Cyan
        bun run build:mac
    }
    "mac-intel" {
        Write-Host "Building for macOS Intel (x64)..." -ForegroundColor Cyan
        bun run build:mac:intel
    }
    "mac-arm" {
        Write-Host "Building for macOS Apple Silicon (ARM64)..." -ForegroundColor Cyan
        bun run build:mac:arm
    }
    "win" {
        Write-Host "Building for Windows (x64)..." -ForegroundColor Cyan
        bun run build:win
    }
    "win-x64" {
        Write-Host "Building for Windows 64-bit..." -ForegroundColor Cyan
        bun run build:win:x64
    }
    "win-ia32" {
        Write-Host "Building for Windows 32-bit..." -ForegroundColor Cyan
        bun run build:win:ia32
    }
    "linux" {
        Write-Host "Building for Linux x64..." -ForegroundColor Cyan
        bun run build:linux
    }
    "standalone" {
        Write-Host "Building standalone executable..." -ForegroundColor Cyan
        bun run build:standalone
    }
}

Write-Host ""
Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host "📁 Output directory: $DistDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Available builds:" -ForegroundColor Cyan
Get-ChildItem -Path $DistDir -ErrorAction SilentlyContinue | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  - $($_.Name) ($size MB)" -ForegroundColor White
}

Write-Host ""
Write-Host "🚀 To run the game server:" -ForegroundColor Green
Write-Host "  Windows: .\dist\elysia-game-win-x64.exe" -ForegroundColor Yellow
Write-Host "  macOS:   ./dist/elysia-game-mac-intel (or -arm64)" -ForegroundColor Yellow
Write-Host "  Linux:   ./dist/elysia-game-linux" -ForegroundColor Yellow
