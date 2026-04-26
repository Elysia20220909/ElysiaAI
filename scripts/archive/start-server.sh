#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export PORT="${PORT:-3000}"
export FASTAPI_BASE_URL="${FASTAPI_BASE_URL:-http://127.0.0.1:8000}"

echo "Starting Elysia server on http://127.0.0.1:${PORT} ..."
exec bun run start
