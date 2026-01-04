#!/bin/bash
# Neuro + Elysia AI Integration Setup Script
# NeuroモジュールとElysia AIの統合をセットアップ

set -e

echo "🚀 Neuro + Elysia AI Integration Setup"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run from project root."
    exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd python

if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "📝 Creating Python virtual environment..."
    python -m venv venv
    source venv/Scripts/activate || source venv/bin/activate
fi

echo "📥 Installing pip packages..."
pip install -r requirements.txt

# Create necessary directories
echo "📁 Creating data directories..."
mkdir -p data/neuro_memories
mkdir -p data/exports

# Copy .env if not exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env from example..."
    cp .env.example .env 2>/dev/null || echo "⚠️  .env.example not found, create .env manually"
fi

cd ..

# Install Node dependencies if needed
echo "📦 Installing Node dependencies..."
if [ ! -d "node_modules" ]; then
    bun install || npm install
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Start FastAPI server:  cd python && python fastapi_server.py"
echo "2. In another terminal:   bun run dev"
echo "3. Test Neuro API:        curl http://localhost:3000/api/neuro/health"
echo ""
echo "📖 See docs/NEURO_INTEGRATION.md for full documentation"
