#!/usr/bin/env bash
# Elysia AI - Quick Development Setup (WSL/Linux/macOS)

set -euo pipefail

echo "🌸 Elysia AI - Development Setup Starting..."

# 1. Check dependencies
echo "✅ Checking dependencies..."
command -v bun >/dev/null 2>&1 || { echo "❌ Bun not found. Install: curl -fsSL https://bun.sh/install | bash"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python3 not found"; exit 1; }
command -v jq >/dev/null 2>&1 || echo "⚠️ jq not found (optional but recommended)"

# 2. Install Node/TS deps
echo "📦 Installing Bun dependencies..."
bun install

# 3. Setup Python
echo "🐍 Setting up Python environment..."
./scripts/setup-python.sh

# 4. Setup .env
echo "🔐 Setting up .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  {
    echo "JWT_SECRET=$(openssl rand -hex 32)"
    echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
    echo "AUTH_USERNAME=elysia"
    echo "AUTH_PASSWORD=$(openssl rand -base64 24)"
  } >> .env
  echo "✅ Generated .env with secure credentials"
fi

# 5. Redis (optional)
echo "🔴 Checking Redis..."
if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli ping &>/dev/null; then
    echo "✅ Redis is running"
  else
    echo "⚠️ Redis installed but not running. Start with: redis-server"
  fi
else
  echo "⚠️ Redis not found. Install with Docker:"
  echo "   docker run -d --name elysia-redis -p 6379:6379 redis:7-alpine"
fi

# 6. Permissions
chmod +x scripts/*.sh 2>/dev/null || true

echo ""
echo "✨✨✨ Development Setup Complete! ✨✨✨"
echo ""
echo "🚀 Start development:"
echo "   bun run dev"
echo ""
echo "🧪 Test endpoints:"
echo "   curl -s http://localhost:3000/ping | jq ."
echo ""
echo "📝 Credentials (in .env):"
grep AUTH_ .env || true
