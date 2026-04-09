#!/bin/bash
# 🍒 Elysia OS - UNIX Setup Script (Ubuntu/macOS) 🍒
set -e

echo "🌟 Initializing Elysia AI System Architecture..."

# 1. Dependency Check
if ! command -v bun &> /dev/null; then
    echo "⚠️ Bun not found. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    source ~/.bashrc
fi

if ! command -v uv &> /dev/null; then
    echo "⚠️ uv not found. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env
fi

# 1.1 Linux GUI Dependencies (for 'The Sight' / pyautogui)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🔍 Checking Linux GUI dependencies..."
    if ! command -v scrot &> /dev/null; then
        echo "💡 Hint: Please install 'scrot' for screen capture: sudo apt install scrot"
    fi
    # Check for python-tk (standard for pyautogui)
    if ! python3 -c "import tkinter" &> /dev/null; then
        echo "💡 Hint: Please install 'python3-tk' for GUI operations: sudo apt install python3-tk"
    fi
fi

# 2. Project Setup
echo "📦 Installing Frontend Dependencies (Bun)..."
bun install

echo "🧠 Pulsing Neural Engines (Ollama)..."
ollama pull phi4
ollama pull llama3.2

echo "🐍 Installing Kernel Dependencies (uv)..."
# Use uv for high-speed dependency resolution
uv pip install -r requirements.txt

# 3. Database Initialization
echo "🏗️ Initializing Resonance Vault (Prisma)..."
bunx prisma generate
bunx prisma db push

echo "✅ System Setup Complete. Use 'make start' or 'scripts/boot.sh' to live."
