#!/bin/bash
# 🍒 Elysia OS - UNIX Boot Script (Ubuntu/macOS) 🍒
set -e

# Add bin to PATH for local execution
export PATH=$PATH:$(pwd)/bin

echo "🌟 Starting Elysia OS Resonance Cluster..."

# 1. Start Python Kernel (elysiad) in the background
echo "⚡ Starting Elysia Kernel Daemon (elysiad)..."
python3 bin/elysiad > var/log/elysia/kernel.log 2>&1 &
KERNEL_PID=$!
echo "✅ Kernel PID: $KERNEL_PID"

# 2. Start Frontend UI (Elysia.js)
echo "💎 Starting Elysia UI (Bun)..."
echo "ℹ️  Tip: Use 'make logs' in another terminal for detailed monitoring."

# 3. Parallel Log Monitor (Optional: shows latest logs until UI starts)
tail -n 20 var/log/elysia/kernel.log
tail -f var/log/elysia/kernel.log &
TAIL_PID=$!

# 4. Start UI
bun run dev

# 5. Cleanup on Exit
trap "kill $KERNEL_PID $TAIL_PID; echo '🛑 Elysia Kernel Stopped. Keep your heart safe.'; exit" INT TERM
wait
