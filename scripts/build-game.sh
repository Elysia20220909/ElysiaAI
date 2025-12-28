#!/usr/bin/env bash
# Elysia AI Game - Cross-Platform Build Script
# Supports: macOS (Intel/ARM), Windows (x64/ia32), Linux (x64)

set -e

PLATFORM="${1:-all}"

echo "🎮 Elysia AI Game - Cross-Platform Builder"
echo "Platform: $PLATFORM"
echo ""

# Navigate to game directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME_DIR="$SCRIPT_DIR/../ElysiaAI/game"

if [ ! -d "$GAME_DIR" ]; then
    GAME_DIR="$SCRIPT_DIR/../game"
fi

if [ ! -d "$GAME_DIR" ]; then
    echo "❌ Game directory not found!"
    exit 1
fi

cd "$GAME_DIR"

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first."
    echo "Install: https://bun.sh/"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Create dist directory
mkdir -p dist

# Build based on platform selection
echo ""
echo "🔨 Building for: $PLATFORM"

case $PLATFORM in
    all)
        echo "Building for ALL platforms..."
        bun run build:all
        ;;
    mac)
        echo "Building for macOS (Intel + ARM)..."
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
    win)
        echo "Building for Windows (x64)..."
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
    linux)
        echo "Building for Linux x64..."
        bun run build:linux
        ;;
    standalone)
        echo "Building standalone executable..."
        bun run build:standalone
        ;;
    *)
        echo "❌ Unknown platform: $PLATFORM"
        echo "Usage: $0 {all|mac|mac-intel|mac-arm|win|win-x64|win-ia32|linux|standalone}"
        exit 1
        ;;
esac

echo ""
echo "✅ Build completed successfully!"
echo "📁 Output directory: $GAME_DIR/dist"
echo ""
echo "Available builds:"
ls -lh "$GAME_DIR/dist" 2>/dev/null || echo "  (no builds found)"

echo ""
echo "🚀 To run the game server:"
echo "  Windows: ./dist/elysia-game-win-x64.exe"
echo "  macOS:   ./dist/elysia-game-mac-intel (or -arm64)"
echo "  Linux:   ./dist/elysia-game-linux"
