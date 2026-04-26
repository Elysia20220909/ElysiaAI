import json
import os
import subprocess
import sys
import urllib.error
import urllib.request


def check_ollama(model_name="llama3.1"):
    print("🔍 [Command Center] Checking Ollama status...")
    try:
        req = urllib.request.Request("http://127.0.0.1:11434/api/tags")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            models = [m["name"] for m in data.get("models", [])]
            if model_name not in models and f"{model_name}:latest" not in models:
                print(f"⚠️ [Warning] Model '{model_name}' not found locally.")
                print(f"   Please run 'ollama run {model_name}' to pull it.")
            else:
                print(f"✅ [OK] Ollama is running and '{model_name}' is available.")
    except urllib.error.URLError:
        print("❌ [Error] Ollama is not reachable at http://127.0.0.1:11434.")
        print("   Please start the Ollama application before chatting with ElysiaAI.")


if __name__ == "__main__":
    check_ollama()

    print("\n🚀 [Command Center] Booting ElysiaAI...")

    # Pythonが 'python' ディレクトリに存在することを確認
    if not os.path.exists("python/fastapi_server.py"):
        print("❌ Error: python/fastapi_server.py not found. Please run this script from the project root.")
        sys.exit(1)

    # Start Backend (Uvicorn)
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "fastapi_server:app", "--host", "0.0.0.0", "--port", "8000"], cwd="python"
    )

    # Start Frontend (Simple HTTP Server)
    frontend = subprocess.Popen([sys.executable, "-m", "http.server", "3000", "--directory", "public"])

    try:
        print("\n🌸 ElysiaAI Shell is Active!")
        print("🌐 Frontend (UI): http://localhost:3000")
        print("⚙️  Backend (API): http://localhost:8000")
        print("🛡️  Press Ctrl+C to shut down all systems.\n")
        backend.wait()
        frontend.wait()
    except KeyboardInterrupt:
        print("\n🛑 [Command Center] Shutting down ElysiaAI...")
        backend.terminate()
        frontend.terminate()
        backend.wait()
        frontend.wait()
        print("💤 Shutdown complete.")
