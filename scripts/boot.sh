#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export LANG="${LANG:-C.UTF-8}"
export LC_ALL="${LC_ALL:-C.UTF-8}"
export PYTHONUTF8="${PYTHONUTF8:-1}"
export PORT="${PORT:-3000}"
export FASTAPI_PORT="${FASTAPI_PORT:-8000}"
export BIND_HOST="${BIND_HOST:-127.0.0.1}"

if [[ "${BIND_HOST}" == "0.0.0.0" ]]; then
  export HEALTH_HOST="${HEALTH_HOST:-127.0.0.1}"
else
  export HEALTH_HOST="${HEALTH_HOST:-$BIND_HOST}"
fi

export FASTAPI_BASE_URL="${FASTAPI_BASE_URL:-http://${HEALTH_HOST}:${FASTAPI_PORT}}"

echo "Booting ElysiaAI stack on http://${HEALTH_HOST}:${PORT} ..."
exec bun run boot
