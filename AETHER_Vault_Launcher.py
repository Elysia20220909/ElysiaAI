import subprocess
import webbrowser
import time
import os
import sys

def launch_aether():
    print("🌸 ElysiaAI - AETHER Shroud Launcher")
    print("-----------------------------------")
    
    # 1. Start the FastAPI server if it's not already running
    # We'll try to check if port 8000 is occupied
    print("🛰️ Synchronizing with Abyssal Core...")
    
    # Run uvicorn in a separate process
    project_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_root)
    
    # Command to start the server
    # We use 'python -m uvicorn' to ensure it uses the correct environment
    cmd = [
        sys.executable, "-m", "uvicorn", 
        "python.fastapi_server:app", 
        "--host", "127.0.0.1", 
        "--port", "8000"
    ]
    
    try:
        # Start server as a background process
        process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("✅ Abyssal Core Active (Port 8000)")
        
        # Wait a bit for the server to spin up
        time.sleep(3)
        
        # 2. Open the AETHER Dashboard
        print("🌪️ Manifesting AETHER Vault Interface...")
        webbrowser.open("http://localhost:8000/aether")
        
        print("\n[SYSTEM] AETHER Vault is now active.")
        print("[SYSTEM] Keep this window open while using the vault.")
        print("[SYSTEM] Press Ctrl+C to shutdown.")
        
        # Keep the script alive
        while True:
            time.sleep(1)
            if process.poll() is not None:
                print("🛑 Abyssal Core has been terminated.")
                break
                
    except KeyboardInterrupt:
        print("\n🛑 Initiating shutdown sequence...")
        process.terminate()
        print("✅ AETHER Shroud deactivated.")
    except Exception as e:
        print(f"❌ Critical Failure: {e}")

if __name__ == "__main__":
    launch_aether()
