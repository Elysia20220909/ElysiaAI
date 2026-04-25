#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export PYTHONPATH="${PYTHONPATH:-$(pwd)}"
export PYTHONUTF8="${PYTHONUTF8:-1}"
HOST="${HOST:-127.0.0.1}"
PORT="${FASTAPI_PORT:-8000}"

if [[ -x ".venv/bin/python" ]]; then
  PYTHON_BIN=".venv/bin/python"
elif [[ -x "python/venv/bin/python" ]]; then
  PYTHON_BIN="python/venv/bin/python"
else
  PYTHON_BIN="${PYTHON:-python}"
fi

echo "Starting FastAPI kernel on http://${HOST}:${PORT} ..."
exec "$PYTHON_BIN" -m uvicorn python.fastapi_server:app --host "$HOST" --port "$PORT"
