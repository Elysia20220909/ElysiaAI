#!/bin/bash
# ElysiaAI Python Sidecar Build Script (macOS / Linux)
# Builds python/fastapi_server.py into a standalone executable inside src-tauri/bin/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVER_SCRIPT="$PROJECT_ROOT/python/fastapi_server.py"
TAURI_BIN_DIR="$PROJECT_ROOT/src-tauri/bin"

echo "[Elysia OS] Resolving python dependencies..."

# Verify PyInstaller is installed
if ! python3 -m pip show pyinstaller > /dev/null 2>&1; then
    echo "[Elysia OS] Installing PyInstaller..."
    python3 -m pip install pyinstaller
fi

# Ensure output directory exists
mkdir -p "$TAURI_BIN_DIR"

# Resolve target triple
OS_TYPE="$(uname -s)"
ARCH_TYPE="$(uname -m)"
case "$OS_TYPE:$ARCH_TYPE" in
    Darwin:arm64) TARGET_TRIPLE="aarch64-apple-darwin" ;;
    Darwin:*) TARGET_TRIPLE="x86_64-apple-darwin" ;;
    Linux:aarch64|Linux:arm64) TARGET_TRIPLE="aarch64-unknown-linux-gnu" ;;
    Linux:*) TARGET_TRIPLE="x86_64-unknown-linux-gnu" ;;
    *) echo "[Elysia OS] Unsupported sidecar target: $OS_TYPE/$ARCH_TYPE" >&2; exit 1 ;;
esac

TARGET_NAME="fastapi_server-$TARGET_TRIPLE"

echo "[Elysia OS] Compiling Python server for $TARGET_TRIPLE..."
pyinstaller --onefile --noconfirm --clean \
    --exclude-module pandas \
    --exclude-module scipy \
    --exclude-module matplotlib \
    --exclude-module torch \
    --exclude-module torchvision \
    --exclude-module torchaudio \
    --exclude-module tkinter \
    --distpath "$TAURI_BIN_DIR" \
    --name "$TARGET_NAME" \
    "$SERVER_SCRIPT"

# Cleanup
echo "[Elysia OS] Cleaning up build artifacts..."
rm -rf "$PROJECT_ROOT/build"
rm -f "$PROJECT_ROOT/$TARGET_NAME.spec"

EXECUTABLE_PATH="$TAURI_BIN_DIR/$TARGET_NAME"
if [ -f "$EXECUTABLE_PATH" ]; then
    echo "[Elysia OS] Python Sidecar successfully created at: $EXECUTABLE_PATH"
else
    echo "[Elysia OS] Build failed. Output executable not found."
    exit 1
fi
