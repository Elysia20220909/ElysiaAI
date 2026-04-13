#!/bin/bash
set -e
echo "🌸 Starting Elysia AI Sovereign Stack..."

# Start Python Mind (FastAPI)
export PYTHONPATH=/app
python3 python/fastapi_server.py &
PYTHON_PID=$!

# Wait for Python to bind
echo "⏳ Waiting for Python Heartbeat..."
sleep 8

# Start Elysia Aura (Bun)
bun run dist/index.js &
BUN_PID=$!

# Defensive Trap
cleanup() {
    echo "🛑 Shutting down Sovereign Stack..."
    kill $PYTHON_PID $BUN_PID
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo "✅ Sovereign Stack Operational."
wait
