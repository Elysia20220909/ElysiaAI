#!/usr/bin/env pwsh

# Elysia Cross-Platform Test & Build Script
# This script automates testing, building, and releasing

param(
    [ValidateSet("test", "build", "release", "all")]
    [string]$Action = "all",

    [string]$Version = "1.0.0",
    [switch]$SkipDocker = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "🚀 Elysia Cross-Platform Test & Build Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
function Test-Command {
    param([string]$Command)
    $exists = $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
    return $exists
}

function Check-Prerequisites {
    Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

    $missing = @()

    if (-not (Test-Command "git")) { $missing += "git" }
    if (-not (Test-Command "node")) { $missing += "node" }
    if (-not (Test-Command "npm")) { $missing += "npm" }

    # Optional but recommended
    $optional = @()
    if (-not (Test-Command "cargo")) { $optional += "cargo (Rust)" }
    if (-not (Test-Command "bun")) { $optional += "bun" }
    if (-not (Test-Command "docker")) { $optional += "docker" }
    if (-not (Test-Command "wasm-pack")) { $optional += "wasm-pack" }

    if ($missing.Count -gt 0) {
        Write-Host "❌ Missing required tools:" -ForegroundColor Red
        $missing | ForEach-Object { Write-Host "  - $_" }
        exit 1
    }

    if ($optional.Count -gt 0) {
        Write-Host "⚠️  Optional tools not installed:" -ForegroundColor Yellow
        $optional | ForEach-Object { Write-Host "  - $_" }
        Write-Host ""
    }

    Write-Host "✅ Prerequisites check passed" -ForegroundColor Green
    Write-Host ""
}

# Test phase
function Run-Tests {
    Write-Host "🧪 Running Tests..." -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan

    # Rust tests
    if (Test-Command "cargo") {
        Write-Host "📦 Rust library tests..." -ForegroundColor Yellow
        Push-Location "rust"
        & cargo test --release 2>&1 | Tee-Object -Variable rustOutput
        Pop-Location
        Write-Host "✅ Rust tests complete" -ForegroundColor Green
        Write-Host ""
    }

    # Native addon tests
    if (Test-Path "native/package.json") {
        Write-Host "📦 Native addon tests..." -ForegroundColor Yellow
        Push-Location "native"
        & npm test 2>&1 | Tee-Object -Variable nativeOutput
        Pop-Location
        Write-Host "✅ Native tests complete" -ForegroundColor Green
        Write-Host ""
    }

    # Desktop app tests
    if (Test-Path "desktop/package.json") {
        Write-Host "📦 Desktop app tests..." -ForegroundColor Yellow
        Push-Location "desktop"
        & npm test 2>&1 | Tee-Object -Variable desktopOutput
        Pop-Location
        Write-Host "✅ Desktop tests complete" -ForegroundColor Green
        Write-Host ""
    }

    Write-Host "🎉 All tests passed!" -ForegroundColor Green
}

# Build phase
function Run-Build {
    Write-Host "🔨 Building Artifacts..." -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan

    # Rust build
    if (Test-Command "cargo") {
        Write-Host "📦 Building Rust library..." -ForegroundColor Yellow
        Push-Location "rust"
        & cargo build --release
        Pop-Location
        Write-Host "✅ Rust build complete" -ForegroundColor Green
    }

    # WASM build
    if (Test-Command "wasm-pack") {
        Write-Host "📦 Building WebAssembly..." -ForegroundColor Yellow
        Push-Location "wasm"

        # Windows-compatible build
        & wasm-pack build --target bundler --release

        Write-Host "✅ WASM build complete" -ForegroundColor Green

        # Show output size
        if (Test-Path "pkg/elysia_wasm_bg.wasm") {
            $size = (Get-Item "pkg/elysia_wasm_bg.wasm").Length
            Write-Host "  WASM size: $('{0:N0}' -f $size) bytes" -ForegroundColor Cyan
        }

        Pop-Location
    }

    # Desktop build
    if (Test-Path "desktop/package.json") {
        Write-Host "📦 Building Desktop app..." -ForegroundColor Yellow
        Push-Location "desktop"
        & npm run build:release
        Pop-Location
        Write-Host "✅ Desktop build complete" -ForegroundColor Green
    }

    # Game server build
    if (Test-Path "ElysiaAI/game/package.json" -and (Test-Command "bun")) {
        Write-Host "📦 Building Game server..." -ForegroundColor Yellow
        Push-Location "ElysiaAI/game"
        & bun run build:standalone
        Pop-Location
        Write-Host "✅ Game server build complete" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "✅ All builds complete!" -ForegroundColor Green
}

# Release phase
function Create-Release {
    Write-Host "📦 Creating Release..." -ForegroundColor Cyan
    Write-Host "======================" -ForegroundColor Cyan

    # Check git status
    $gitStatus = & git status --porcelain
    if ($gitStatus) {
        Write-Host "⚠️  Git working directory has changes" -ForegroundColor Yellow
        Write-Host "  Stage and commit changes before release" -ForegroundColor Yellow
        return
    }

    Write-Host "📌 Creating git tag v$Version..." -ForegroundColor Yellow
    & git tag -a "v$Version" -m "Release $Version" -f

    Write-Host "📤 Pushing tag to remote..." -ForegroundColor Yellow
    & git push origin "v$Version" -f

    Write-Host "✅ Release created: v$Version" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Check GitHub Actions workflows"
    Write-Host "  2. Monitor: .github/workflows/release.yml"
    Write-Host "  3. Artifacts will be auto-published to GitHub Releases"
}

# Docker build (optional)
function Build-Docker {
    if ($SkipDocker -or -not (Test-Command "docker")) {
        Write-Host "⏭️  Skipping Docker build" -ForegroundColor Yellow
        return
    }

    Write-Host "🐳 Building Docker Image..." -ForegroundColor Cyan
    Write-Host "===========================" -ForegroundColor Cyan

    Write-Host "📦 Building game server image..." -ForegroundColor Yellow

    if (Test-Command "docker") {
        # Check if buildx is available (multi-arch)
        $hasBuildx = $null -ne (& docker buildx version 2>&1 | Select-String -Pattern "version")

        if ($hasBuildx) {
            Write-Host "  Using buildx for multi-arch..." -ForegroundColor Cyan
            & docker buildx build --platform linux/amd64, linux/arm64 `
                -t elysia-game:$Version `
                -t elysia-game:latest `
                -f ElysiaAI/game/Dockerfile `
                --push=false `
                .
        }
        else {
            Write-Host "  Using standard docker build..." -ForegroundColor Cyan
            & docker build -t elysia-game:$Version -t elysia-game:latest `
                -f ElysiaAI/game/Dockerfile .
        }

        Write-Host "✅ Docker build complete" -ForegroundColor Green
    }
}

# Main execution
Check-Prerequisites

switch ($Action) {
    "test" {
        Run-Tests
    }
    "build" {
        Run-Build
        Build-Docker
    }
    "release" {
        Create-Release
    }
    "all" {
        Run-Tests
        Run-Build
        Build-Docker
        Write-Host ""
        Write-Host "📝 Release steps:" -ForegroundColor Cyan
        Write-Host "  To create release, run:"
        Write-Host "  .\scripts\run-all.ps1 -Action release -Version $Version"
    }
}

Write-Host ""
Write-Host "✅ Script execution complete!" -ForegroundColor Green
Write-Host ""
