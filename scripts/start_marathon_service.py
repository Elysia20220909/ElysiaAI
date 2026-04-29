import subprocess
import time
import sys
import os

def run_resilient_service():
    print("=====================================================")
    print("   ELYSIA MARATHON 24/7 MONITORING SERVICE")
    print("=====================================================")
    
    translator_proc = None
    
    try:
        while True:
            # 1. Manage the Auto-Translator (Self-Healing)
            if translator_proc is None or translator_proc.poll() is not None:
                if translator_proc is not None:
                    print("[!] Translator crashed or stopped. Restarting...")
                
                print("[*] Launching Real-Time Auto-Translator...")
                translator_proc = subprocess.Popen([sys.executable, "scripts/marathon_auto_translator.py"])
            
            # 2. Run the News Bot (Sweep)
            print(f"\n[*] [{time.strftime('%H:%M:%S')}] Periodic Sweep: Reddit / Leaks / News...")
            subprocess.run([sys.executable, "scripts/marathon_news_bot.py"])
            
            # Recency & Rate Limit control
            print("[*] Sweep complete. Next monitoring pulse in 10 minutes...")
            time.sleep(600)
            
    except KeyboardInterrupt:
        print("\n[!] Shutdown requested by user.")
        if translator_proc:
            translator_proc.terminate()
        print("[*] All monitoring units offline.")

if __name__ == "__main__":
    run_resilient_service()
