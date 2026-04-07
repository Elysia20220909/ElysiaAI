# 🌸 ElysiaAI - Windows Quick Setup (Resonance v2.6)
# PowerShell 5.1+ required.

echo "--- 🌸 Elysia AI OS Resonance - Windows Setup ---"

# 1. Environment Check
echo "[1/4] Checking prerequisites..."
if (!(Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Error "Bun is not installed. Please install it from https://bun.sh first."
    exit 1
}
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed. Please install it from https://python.org (v3.11+) first."
    exit 1
}

# 2. Bun Dependencies
echo "[2/4] Installing Bun dependencies (Monorepo)..."
bun install

# 3. Python Dependencies
echo "[3/4] Installing Python Kernel dependencies..."
python -m pip install -r requirements.txt

# 4. Environment File
if (!(Test-Path .env)) {
    echo "[4/4] Initializing .env from .env.example..."
    Copy-Item .env.example .env
} else {
    echo "[4/4] .env already exists. Skipping..."
}

echo "`n--- ✨ Setup Complete! ---"
echo "To start the system, please run:"
echo "  1. (Kernel): python usr/lib/elysia/kernel.py"
echo "  2. (Frontend): bun run dev"
echo ""
echo "Note: The first run will download about 200MB of AI model weights (Sentence-Transformers). 🧠"
