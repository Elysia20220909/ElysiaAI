#!/usr/bin/env bash
# Unified dev runner for Linux/macOS/WSL
# - Starts FastAPI RAG, optional Network Simulation API, and Elysia server
# - Writes logs into ./logs
# - Press Ctrl+C to stop all

set -euo pipefail
cd "$(dirname "$0")/.."

NETWORK_SIM=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--network-sim)
      NETWORK_SIM=true
      shift
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: ./scripts/dev.sh [options]

Options:
  -n, --network-sim   Also start Network Simulation API
  -h, --help          Show this help

This script starts:
  1) FastAPI RAG server (python.fastapi_server:app)
  2) Elysia server (packages/server/src/index.ts)
  3) Network Simulation API (optional)
USAGE
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2; exit 1
      ;;
  esac
done

LOG_DIR="logs"
mkdir -p "$LOG_DIR"

FASTAPI_OUT="$LOG_DIR/fastapi.out.log"
FASTAPI_ERR="$LOG_DIR/fastapi.err.log"
ELYSIA_OUT="$LOG_DIR/elysia.out.log"
ELYSIA_ERR="$LOG_DIR/elysia.err.log"
SIM_OUT="$LOG_DIR/network-sim.out.log"
SIM_ERR="$LOG_DIR/network-sim.err.log"

fastapi_pid=""
elysia_pid=""
sim_pid=""

cleanup() {
  echo "\n⏹ Stopping processes..."
  for pid in "$elysia_pid" "$sim_pid" "$fastapi_pid"; do
    if [[ -n "${pid}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
  echo "✅ Stopped."
}
trap cleanup INT TERM EXIT

wait_for_url() {
  local url="$1" max_wait="${2:-40}" elapsed=0
  while (( elapsed < max_wait )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
    elapsed=$((elapsed+1))
  done
  return 1
}

# 1) Start FastAPI (background)
echo "🚀 Starting FastAPI (http://127.0.0.1:8000) ..."
FASTAPI_PORT=8000 nohup ./scripts/start-fastapi.sh >"$FASTAPI_OUT" 2>"$FASTAPI_ERR" &
fastapi_pid=$!

if wait_for_url "http://127.0.0.1:8000/health" 60; then
  echo "✅ FastAPI is up"
else
  echo "⚠ FastAPI did not become ready in time. See $FASTAPI_OUT / $FASTAPI_ERR" >&2
fi

# 2) Optional: Network Simulation API (background)
if [[ "$NETWORK_SIM" == "true" ]]; then
  echo "🌐 Starting Network Simulation API ..."
  nohup ./scripts/start-network-sim.sh >"$SIM_OUT" 2>"$SIM_ERR" &
  sim_pid=$!
fi

# 3) Start Elysia (background)
echo "⚡ Starting Elysia (http://localhost:3000) ..."
FASTAPI_BASE_URL=http://127.0.0.1:8000 nohup ./scripts/start-server.sh >"$ELYSIA_OUT" 2>"$ELYSIA_ERR" &
elysia_pid=$!

if wait_for_url "http://localhost:3000/ping" 40; then
  echo "✅ Elysia is up"
else
  echo "⚠ Elysia did not become ready in time. See $ELYSIA_OUT / $ELYSIA_ERR" >&2
fi

cat <<SUMMARY
---
Logs:
  FastAPI           : $FASTAPI_OUT / $FASTAPI_ERR
  Elysia            : $ELYSIA_OUT / $ELYSIA_ERR
  Network Simulation: $SIM_OUT / $SIM_ERR

Open:
  http://127.0.0.1:8000/docs
  http://localhost:3000
---
Press Ctrl+C to stop all.
SUMMARY

# Wait on background jobs; cleanup trap will handle termination
wait
