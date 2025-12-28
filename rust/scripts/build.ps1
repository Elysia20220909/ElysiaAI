# Elysia Rust Cross-Platform Build Script

param(
    [ValidateSet("all", "mac", "win", "linux")]
    [string]$Platform = "all",

    [ValidateSet("release", "debug")]
    [string]$BuildType = "release"
)

Write-Host "🦀 Elysia Rust Build Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Platform: $Platform"
Write-Host "Build Type: $BuildType"
Write-Host ""

# Check if Cargo is installed
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Cargo not found. Install Rust from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# Get build flags
$BuildFlags = @("--release")
if ($BuildType -eq "debug") {
    $BuildFlags = @()
}

# Function to build for a target
function Build-Target {
    param(
        [string]$Target,
        [string]$Description
    )

    Write-Host "📦 Building for $Description..." -ForegroundColor Yellow
    & cargo build --target $Target @BuildFlags
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $Description build successful" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  $Description build failed" -ForegroundColor Yellow
    }
}

# macOS builds
if ($Platform -eq "mac" -or $Platform -eq "all") {
    Build-Target "x86_64-apple-darwin" "macOS (Intel)"
    Build-Target "aarch64-apple-darwin" "macOS (Apple Silicon)"

    # Create Universal Binary if lipo is available
    if (Get-Command lipo -ErrorAction SilentlyContinue) {
        Write-Host "📦 Creating Universal Binary..." -ForegroundColor Yellow
        $x64 = "target/x86_64-apple-darwin/release/libelysia_rust.dylib"
        $arm64 = "target/aarch64-apple-darwin/release/libelysia_rust.dylib"
        $out = "target/release/libelysia_rust.dylib"

        if ((Test-Path $x64) -and (Test-Path $arm64)) {
            & lipo -create $x64 $arm64 -output $out
            Write-Host "✅ Universal Binary created" -ForegroundColor Green
        }
    }
}

# Windows builds
if ($Platform -eq "win" -or $Platform -eq "all") {
    Build-Target "x86_64-pc-windows-msvc" "Windows (x64)"
    Build-Target "i686-pc-windows-msvc" "Windows (ia32)"
}

# Linux builds
if ($Platform -eq "linux" -or $Platform -eq "all") {
    Build-Target "x86_64-unknown-linux-gnu" "Linux (x64)"
    Build-Target "aarch64-unknown-linux-gnu" "Linux (ARM64)"
}

Write-Host ""
Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Output binaries:" -ForegroundColor Cyan
Write-Host "  - target\release\ (native binaries)"
Write-Host "  - target\*\release\ (cross-compiled binaries)"
Write-Host ""
Write-Host "🧪 Run tests:" -ForegroundColor Cyan
Write-Host "  cargo test --release"
Write-Host ""
Write-Host "📚 View documentation:" -ForegroundColor Cyan
Write-Host "  cargo doc --open"
