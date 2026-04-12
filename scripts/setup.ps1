# 🌸 ElysiaAI - Windows Quick Setup (Universal OS Mastery)
# PowerShell 5.1+ required.

echo "--- 🌸 Elysia AI OS Resonance - Windows Fulfillment ---"

# 1. Environment Check
echo "[1/5] Checking prerequisites..."
$reqs = @("bun", "python", "rustc")
foreach ($r in $reqs) {
    if (!(Get-Command $r -ErrorAction SilentlyContinue)) {
        Write-Error "$r is not installed. Please install it to continue."
        exit 1
    }
}

# 2. Bun Dependencies
echo "[2/5] Synchronizing Bun ecosystem..."
bun install

# 2.1 Neural Model Pulling
echo "[2.1/5] Pulsing Neural Engines (Ollama)..."
ollama pull phi4
ollama pull llama3.2

# 3. Python Dependencies
echo "[3/5] Calibrating Python Kernel resonance..."
python -m pip install -r requirements.txt

# 4. Environment File
if (!(Test-Path .env)) {
    echo "[4/5] Initializing resonance gate (.env)..."
    Copy-Item .env.example .env
}

# 5. Diagnostic
echo "[5/5] Performing Initial Diagnostic..."
python usr/lib/elysia/kernel.py --doctor

echo "`n--- ✨ Fulfillment Complete! ---"
echo "To manifest the OS, run:"
echo "  Build:     bun run tauri build"
echo "  Live Dev:  npm run tauri dev"
echo ""
