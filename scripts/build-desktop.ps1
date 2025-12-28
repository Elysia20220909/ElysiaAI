# Elysia AI - Cross-Platform Build Script
# Supports: macOS (Intel/ARM), Windows (x64/ia32), Linux (x64)

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("all", "mac", "mac-intel", "mac-arm", "mac-universal",
        "win", "win-x64", "win-ia32",
        "linux", "linux-x64")]
    [string]$Platform = "all"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Elysia AI - Cross-Platform Builder" -ForegroundColor Cyan
Write-Host "Platform: $Platform" -ForegroundColor Yellow
Write-Host ""

# Navigate to desktop directory
$DesktopDir = Join-Path $PSScriptRoot ".." "desktop"
Set-Location $DesktopDir

# Check if bun is installed
if (!(Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Bun is not installed. Please install Bun first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Green
bun install

# Build based on platform selection
Write-Host ""
Write-Host "🔨 Building for: $Platform" -ForegroundColor Green

switch ($Platform) {
    "all" {
        Write-Host "Building for ALL platforms (macOS, Windows, Linux)..." -ForegroundColor Cyan
        bun run build:all
    }
    "mac" {
        Write-Host "Building for macOS (Intel, ARM, Universal)..." -ForegroundColor Cyan
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
    "mac-universal" {
        Write-Host "Building for macOS Universal (Intel + ARM)..." -ForegroundColor Cyan
        bun run build:mac:universal
    }
    "win" {
        Write-Host "Building for Windows (x64 + ia32)..." -ForegroundColor Cyan
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
    "linux-x64" {
        Write-Host "Building for Linux x64..." -ForegroundColor Cyan
        bun run build:linux
    }
}

Write-Host ""
Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host "📁 Output directory: $DesktopDir\dist" -ForegroundColor Yellow
Write-Host ""
Write-Host "Available builds:" -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $DesktopDir "dist") -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor White
}
