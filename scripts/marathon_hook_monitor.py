import os
import time
import argparse
import random
from datetime import datetime, timezone
from marathon_templates import MarathonNotifier

# Mock data for simulation (Post-Launch 2026 Context)
# All data tuples now include a source link
MOCK_FEEDS = [
    {
        "type": "cryo", 
        "data": ("Neural Link Fragment", "ニューラルリンクの断片", "Sector-A1", "セクターA1", "Legendary", "https://www.marathonthegame.com/database/A1")
    },
    {
        "type": "patch", 
        "data": ("1.0.5", "Optimized server resonance.", "サーバーの共鳴を最適化。", "https://www.marathonthegame.com/updates")
    },
    {
        "type": "kit", 
        "data": ("Ghost-Walker", "ゴースト・ウォーカー", "Increased stealth.", "隠密性能の向上。", "https://www.marathonthegame.com/kits/ghost-walker")
    },
    {
        "type": "balance", 
        "data": ("Plasma Rifles", "プラズマライフル", "Damage increased.", "ダメージの増加。", "https://www.marathonthegame.com/sandbox")
    },
    {
        "type": "reddit", 
        "data": ("marathon", "Is Ghost-Walker meta?", "ゴースト・ウォーカーはメタか？", "Discussing the new kit.", "新キットに関する議論。", "3.5k", "https://reddit.com/r/marathon")
    },
    {
        "type": "director", 
        "data": ("Joe Ziegler", "Season 1 content reveal soon.", "シーズン1の情報を近日公開。", "X (Twitter)")
    }
]

def run_monitor(loop=False):
    notifier = MarathonNotifier()
    print("[*] Marathon Hook Monitor: ACTIVE")
    print(f"[*] Monitoring target: {os.getenv('NITTER_HOST', 'Mock Service')}")
    
    try:
        while True:
            # Simulate intercepting a signal
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Scanning frequencies...")
            
            # Randomly pick a mock update
            event = random.choice(MOCK_FEEDS)
            
            if event["type"] == "cryo":
                notifier.notify_cryo_archive(*event["data"])
            elif event["type"] == "patch":
                notifier.notify_patch_notes(*event["data"])
            elif event["type"] == "kit":
                notifier.notify_kit_update(*event["data"])
            elif event["type"] == "balance":
                notifier.notify_combat_balance(*event["data"])
            elif event["type"] == "reddit":
                notifier.notify_reddit_signal(*event["data"])
            elif event["type"] == "director":
                notifier.notify_director_signal(*event["data"])
                
            if not loop:
                break
                
            # Wait for next check
            wait_time = random.randint(15, 30) # Faster loop for demonstration
            print(f"[*] Sleeping for {wait_time}s...")
            time.sleep(wait_time)
            
    except KeyboardInterrupt:
        print("[*] Monitor offline.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Marathon Hook Monitor")
    parser.add_argument("--loop", action="store_true", help="Run in a continuous loop")
    parser.add_argument("--mock", action="store_true", help="Send a single mock notification and exit")
    
    args = parser.parse_args()
    
    if args.mock:
        run_monitor(loop=False)
    else:
        run_monitor(loop=args.loop)
