#!/bin/bash
set -euo pipefail

echo "🌸 Starting ElysiaAI unified stack..."

FASTAPI_HOST="${FASTAPI_HOST:-0.0.0.0}"
FASTAPI_PORT="${FASTAPI_PORT:-8000}"
APP_PORT="${PORT:-3000}"
export PYTHONPATH="${PYTHONPATH:-/app}"
export FASTAPI_BASE_URL="${FASTAPI_BASE_URL:-http://127.0.0.1:${FASTAPI_PORT}}"

python -m uvicorn python.fastapi_server:app --host "${FASTAPI_HOST}" --port "${FASTAPI_PORT}" &
PYTHON_PID=$!

echo "⏳ Waiting for FastAPI..."
for _ in $(seq 1 45); do
    if curl -fsS "http://127.0.0.1:${FASTAPI_PORT}/health" >/dev/null; then
        echo "✅ FastAPI is ready."
        break
    fi
    sleep 2
done

if ! curl -fsS "http://127.0.0.1:${FASTAPI_PORT}/health" >/dev/null; then
    echo "❌ FastAPI failed to start."
    kill "${PYTHON_PID}" || true
    wait "${PYTHON_PID}" || true
    exit 1
fi

echo "⏳ Starting Elysia server on port ${APP_PORT}..."
bun run start &
BUN_PID=$!

cleanup() {
    echo "🛑 Shutting down unified stack..."
    kill "${BUN_PID}" "${PYTHON_PID}" 2>/dev/null || true
    wait "${BUN_PID}" 2>/dev/null || true
    wait "${PYTHON_PID}" 2>/dev/null || true
}

trap cleanup SIGINT SIGTERM EXIT

wait -n "${PYTHON_PID}" "${BUN_PID}"
STATUS=$?
exit "${STATUS}"
