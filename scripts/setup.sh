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

# 2. Project Setup
echo "📦 Installing Frontend Dependencies (Bun)..."
bun install

echo "🐍 Installing Kernel Dependencies (uv)..."
# Use uv for high-speed dependency resolution
uv pip install -r requirements.txt

# 3. Database Initialization
echo "🏗️ Initializing Resonance Vault (Prisma)..."
bunx prisma generate
bunx prisma db push

echo "✅ System Setup Complete. Use 'make start' or 'scripts/boot.sh' to live."
