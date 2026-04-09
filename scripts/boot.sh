#!/bin/bash
# 🍒 Elysia OS - UNIX Boot Script (Ubuntu/macOS) 🍒
set -e

# Add bin to PATH for local execution
export PATH=$PATH:$(pwd)/bin

# 文字化け対策: UNIX 環境のロケールと Python エンコーディングを UTF-8 に固定
export LANG=C.UTF-8
export LC_ALL=C.UTF-8
export PYTHONUTF8=1

# --- 1. Cleanse Cluster (Zombie Process Removal) ---
echo "🧹 Cleansing Resonance Cluster..."
pkill -f bun || true
pkill -f node || true
pkill -f python3 || true

# --- 2. Network Bridging (Host Discovery) ---
# WSL2 needs to find the Windows host for Ollama/VOICEVOX
HOST_IP=$(grep nameserver /etc/resolv.conf | awk '{print $2}')
echo "🔗 Linking to Host Resonance at $HOST_IP..."
export HOST_RES_IP=$HOST_IP

# --- 3. Ignite API Resonance (Port 3000) ---
echo "📡 Initiating API Resonance (Port 3000)..."
if [ -f "packages/server/src/index.ts" ]; then
  nohup bun run --filter "@elysia-ai/server" dev > var/log/elysia/server.log 2>&1 &
  SERVER_PID=$!
  echo "[OK] Server resonance started (PID: $SERVER_PID)"
else
  echo "⚠️  Server package not found. Skipping API ignition."
fi

# Wait for Heartbeat
echo -n "💓 Waiting for resonance heartbeat..."
RETRIES=0
while [ $RETRIES -lt 30 ]; do
  if curl -s http://localhost:3000/ping > /dev/null; then
    echo " [IGNITED]"
    break
  fi
  echo -n "."
  sleep 1
  RETRIES=$((RETRIES+1))
done

if [ $RETRIES -eq 30 ]; then
  echo " [FAILED]"
  echo "❌ API resonance failed to stabilize. Check var/log/elysia/server.log"
  [ ! -z "$SERVER_PID" ] && kill $SERVER_PID
  exit 1
fi

# --- 4. Manifest OS UI (Tauri) ---
echo "💎 Starting Elysia OS Native App..."
echo "ℹ️  Note: The kernel is now automatically managed by the native wrapper."

# Launch Tauri dev environment
bun run tauri dev

echo '🛑 Elysia OS Instance Stopped. Keep your heart safe.'
[ ! -z "$SERVER_PID" ] && kill $SERVER_PID
