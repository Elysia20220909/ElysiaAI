#!/bin/bash
set -e
echo "🌸 Starting Elysia AI Sovereign Stack..."

# Start Python Mind (FastAPI)
export PYTHONPATH=/app
uvicorn python.fastapi_server:app --host 0.0.0.0 --port 8000 &
PYTHON_PID=$!

# Wait for Python to bind
echo "⏳ Waiting for Python Mind (Model Loading)..."
sleep 15
echo "✅ AI Mind should be responsive now."

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
