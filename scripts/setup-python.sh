#!/bin/bash
# Python環境セットアップスクリプト（Linux/macOS/WSL対応）

cd "$(dirname "$0")/.."

echo "Setting up Python environment..."

# Python 3チェック
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found. Please install Python 3.8+"
    exit 1
fi

# venv作成
if [ ! -d "python/venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv python/venv
fi

# venv有効化とパッケージインストール
echo "Installing Python dependencies..."
source python/venv/bin/activate 2>/dev/null || . python/venv/Scripts/activate 2>/dev/null

pip install -U pip
pip install -U -r python/requirements.txt

echo "✅ Python environment ready!"
echo "To activate: source python/venv/bin/activate"
