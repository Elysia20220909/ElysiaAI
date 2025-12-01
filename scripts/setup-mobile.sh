#!/usr/bin/env bash
# Setup mobile app (iOS/Android)
set -euo pipefail
cd "$(dirname "$0")/../mobile"

echo "📱 Setting up Elysia AI Mobile App..."

if command -v bun &> /dev/null; then
    echo "Using Bun..."
    bun install
elif command -v npm &> /dev/null; then
    echo "Using npm..."
    npm install
else
    echo "❌ Error: Neither bun nor npm found. Please install Node.js or Bun."
    exit 1
fi

echo "✅ Mobile app setup complete!"
echo ""
echo "Next steps:"
echo "  cd mobile"
echo "  npm start      # or: bun start"
echo ""
echo "Then scan the QR code with Expo Go app (iOS/Android)"
