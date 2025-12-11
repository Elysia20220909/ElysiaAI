#!/bin/bash
# Network Simulation APIサーバー起動スクリプト（Linux/macOS/WSL対応）

cd "$(dirname "$0")/.."

echo "🌐 Starting Network Simulation API Server..."

# Python venv有効化
if [ -f "python/venv/bin/activate" ]; then
    source python/venv/bin/activate
elif [ -f "python/venv/Scripts/activate" ]; then
    source python/venv/Scripts/activate
else
    echo "⚠️  Virtual environment not found. Run: ./scripts/setup-python.sh"
    exit 1
fi

# Network Simulation APIサーバー起動
cd python
python network_simulation_api.py
