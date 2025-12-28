#!/usr/bin/env bash
# Elysia AI - Cross-Platform Build Script
# Supports: macOS (Intel/ARM), Windows (x64/ia32), Linux (x64)

set -e

PLATFORM="${1:-all}"

echo "🚀 Elysia AI - Cross-Platform Builder"
echo "Platform: $PLATFORM"
echo ""

# Navigate to desktop directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$SCRIPT_DIR/../desktop"
cd "$DESKTOP_DIR"

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build based on platform selection
echo ""
echo "🔨 Building for: $PLATFORM"

case $PLATFORM in
    all)
        echo "Building for ALL platforms (macOS, Windows, Linux)..."
        bun run build:all
        ;;
    mac)
        echo "Building for macOS (Intel, ARM, Universal)..."
        bun run build:mac
        ;;
    mac-intel)
        echo "Building for macOS Intel (x64)..."
        bun run build:mac:intel
        ;;
    mac-arm)
        echo "Building for macOS Apple Silicon (ARM64)..."
        bun run build:mac:arm
        ;;
    mac-universal)
        echo "Building for macOS Universal (Intel + ARM)..."
        bun run build:mac:universal
        ;;
    win)
        echo "Building for Windows (x64 + ia32)..."
        bun run build:win
        ;;
    win-x64)
        echo "Building for Windows 64-bit..."
        bun run build:win:x64
        ;;
    win-ia32)
        echo "Building for Windows 32-bit..."
        bun run build:win:ia32
        ;;
    linux|linux-x64)
        echo "Building for Linux x64..."
        bun run build:linux
        ;;
    *)
        echo "❌ Unknown platform: $PLATFORM"
        echo "Usage: $0 {all|mac|mac-intel|mac-arm|mac-universal|win|win-x64|win-ia32|linux}"
        exit 1
        ;;
esac

echo ""
echo "✅ Build completed successfully!"
echo "📁 Output directory: $DESKTOP_DIR/dist"
echo ""
echo "Available builds:"
ls -lh "$DESKTOP_DIR/dist" 2>/dev/null || echo "  (no builds found)"
