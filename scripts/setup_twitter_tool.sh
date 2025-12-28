#!/bin/bash
# Twitter Archive Bulk Delete Tool - Setup Script for Linux/macOS
# This script sets up the Python environment and dependencies

echo "============================================================"
echo "Twitter Archive Bulk Delete Tool - Setup"
echo "============================================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[✗] ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ from your package manager or https://www.python.org/"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "[✓] Python detected: $PYTHON_VERSION"

echo ""
echo "[1/4] Creating virtual environment..."
python3 -m venv venv
if [ $? -ne 0 ]; then
    echo "[✗] ERROR: Failed to create virtual environment"
    exit 1
fi

echo "[2/4] Activating virtual environment..."
source venv/bin/activate

echo "[3/4] Installing dependencies..."
pip install -r python/requirements.txt
if [ $? -ne 0 ]; then
    echo "[✗] ERROR: Failed to install dependencies"
    exit 1
fi

echo "[4/4] Checking config/.env file..."
if [ ! -f "config/.env" ]; then
    echo ""
    echo "⚠️  WARNING: config/.env file not found"
    echo "Please create it and add your Twitter API credentials:"
    echo ""
    echo "TWITTER_API_KEY=your-api-key"
    echo "TWITTER_API_SECRET_KEY=your-api-secret"
    echo "TWITTER_ACCESS_TOKEN=your-access-token"
    echo "TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret"
    echo ""
    echo "You can copy config/.env.example and fill in your credentials."
fi

echo ""
echo "============================================================"
echo "✅ Setup completed successfully!"
echo "============================================================"
echo ""
echo "Next steps:"
echo "1. Ensure config/.env contains your Twitter API credentials"
echo "2. Download your Twitter archive and extract tweets.js"
echo "3. Run: python python/delete_tweets_from_archive.py tweets.js"
echo ""
echo "To activate the virtual environment in the future, run:"
echo "  source venv/bin/activate"
echo ""
