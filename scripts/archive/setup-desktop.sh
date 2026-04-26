#!/usr/bin/env bash
set -euo pipefail

echo "🖥️  Setting up Desktop App..."

cd "$(dirname "$0")/../desktop"

if command -v bun &> /dev/null; then
    bun install
elif command -v npm &> /dev/null; then
    npm install
else
    echo "❌ Neither bun nor npm found"
    exit 1
fi

echo "✅ Desktop app ready!"
echo ""
echo "To run: cd desktop && npm start"
