#!/bin/bash

# Elysia Rust Cross-Platform Build Script

set -e

PLATFORM="${1:-all}"
BUILD_TYPE="${2:-release}"

echo "🦀 Elysia Rust Build Script"
echo "=============================="
echo "Platform: $PLATFORM"
echo "Build Type: $BUILD_TYPE"
echo ""

# Ensure Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo not found. Install Rust from https://rustup.rs/"
    exit 1
fi

# macOS builds
if [ "$PLATFORM" = "mac" ] || [ "$PLATFORM" = "all" ]; then
    echo "📦 Building for macOS (x86_64)..."
    cargo build --target x86_64-apple-darwin --release

    echo "📦 Building for macOS (ARM64)..."
    cargo build --target aarch64-apple-darwin --release

    if command -v lipo &> /dev/null; then
        echo "📦 Creating Universal Binary..."
        mkdir -p target/release
        lipo -create \
            target/x86_64-apple-darwin/release/libelysia_rust.dylib \
            target/aarch64-apple-darwin/release/libelysia_rust.dylib \
            -output target/release/libelysia_rust.dylib
        echo "✅ Universal Binary created"
    fi
fi

# Windows builds
if [ "$PLATFORM" = "win" ] || [ "$PLATFORM" = "all" ]; then
    if command -v cargo-xwin &> /dev/null || [ "$OS" = "Windows_NT" ]; then
        echo "📦 Building for Windows (x64)..."
        cargo build --target x86_64-pc-windows-msvc --release

        echo "📦 Building for Windows (ia32)..."
        cargo build --target i686-pc-windows-msvc --release 2>/dev/null || echo "⚠️  32-bit build skipped"
    else
        echo "⚠️  Windows target requires Windows or cargo-xwin"
    fi
fi

# Linux builds
if [ "$PLATFORM" = "linux" ] || [ "$PLATFORM" = "all" ]; then
    echo "📦 Building for Linux (x64)..."
    cargo build --target x86_64-unknown-linux-gnu --release

    if command -v aarch64-linux-gnu-gcc &> /dev/null; then
        echo "📦 Building for Linux (ARM64)..."
        cargo build --target aarch64-unknown-linux-gnu --release
    fi
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Output binaries:"
echo "  - target/release/ (native binaries)"
echo "  - target/*/release/ (cross-compiled binaries)"
echo ""
echo "🧪 Run tests:"
echo "  cargo test --release"
echo ""
echo "📚 View documentation:"
echo "  cargo doc --open"
