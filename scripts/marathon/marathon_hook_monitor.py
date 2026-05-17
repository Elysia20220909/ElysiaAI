import os
import time
import argparse
import random
import json
import sys
from pathlib import Path
from datetime import datetime, timezone

CURRENT_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = CURRENT_DIR.parent

sys.path.insert(0, str(CURRENT_DIR))
sys.path.insert(0, str(SCRIPTS_DIR))

from marathon_templates import MarathonNotifier
from marathon_news_bot import run_sweep

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

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

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.getenv("MARATHON_DATA_DIR", ROOT_DIR / "data"))
STATE_FILE = Path(os.getenv("MARATHON_STATE_FILE", DATA_DIR / "marathon_hook_state.json"))
DEFAULT_INTERVAL_SECONDS = int(os.getenv("MARATHON_MONITOR_INTERVAL_SECONDS", "900"))

def load_state():
    if not STATE_FILE.exists():
        return {"runs": 0, "failures": 0, "last_success_at": None, "last_error": None}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"runs": 0, "failures": 0, "last_success_at": None, "last_error": "state read failed"}

def save_state(state):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")

def run_autonomous_sweep(dry_run=False, prime_seen=False):
    state = load_state()
    state["runs"] = int(state.get("runs", 0)) + 1
    state["last_started_at"] = datetime.now(timezone.utc).isoformat()

    try:
        result = run_sweep(dry_run=dry_run, prime_seen=prime_seen)
        state["last_result"] = result
        state["last_success_at"] = datetime.now(timezone.utc).isoformat()
        state["last_error"] = None
        save_state(state)
        return result
    except Exception as exc:
        state["failures"] = int(state.get("failures", 0)) + 1
        state["last_error"] = repr(exc)
        save_state(state)
        raise

def run_mock_monitor(loop=False):
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

def run_monitor(loop=False, interval=DEFAULT_INTERVAL_SECONDS, dry_run=False, prime_seen=False):
    print("[*] Marathon Autonomous Monitor: ACTIVE")
    print(f"[*] State file: {STATE_FILE}")

    try:
        while True:
            started = datetime.now(timezone.utc).isoformat()
            print(f"[*] Sweep started at {started}")
            result = run_autonomous_sweep(dry_run=dry_run, prime_seen=prime_seen)
            print(f"[*] Sweep finished: {result}")

            if not loop or prime_seen:
                break

            print(f"[*] Sleeping for {interval}s...")
            time.sleep(interval)
    except KeyboardInterrupt:
        print("[*] Monitor offline.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Marathon Hook Monitor")
    parser.add_argument("--loop", action="store_true", help="Run in a continuous loop")
    parser.add_argument("--once", action="store_true", help="Run one autonomous sweep and exit")
    parser.add_argument("--mock", action="store_true", help="Send a single mock notification and exit")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and classify without posting or updating seen state")
    parser.add_argument("--prime-seen", action="store_true", help="Mark current matching updates as seen without posting")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_SECONDS, help="Loop interval in seconds")
    
    args = parser.parse_args()
    
    if args.mock:
        run_mock_monitor(loop=False)
    else:
        run_monitor(
            loop=args.loop and not args.once,
            interval=args.interval,
            dry_run=args.dry_run,
            prime_seen=args.prime_seen,
        )
