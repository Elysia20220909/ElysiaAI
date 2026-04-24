import datetime
import os
import random
import subprocess
import sys


# Re-use the theme from camouflage_history
MESSAGES = [
    "SENTINEL: Integrity check complete for vault {id}",
    "PULSE: Infinite heartbeat rhythm {id} calibrated",
    "NEXUS: Core resonance stabilized at level {id}",
    "VOID: Phase {id} synchronization initiated",
    "PHANTOM: Redacted protocol {id} updated",
    "SIGNAL: Intercepted data from unknown origin point {id}",
    "ABYSS: Deep thought recursion depth optimized for node {id}",
    "ECHO: Resonance echo suppressed in shadow layer {id}",
    "ENIGMA: Threshold crossover detected in layer {id}",
    "CRYPT: Binary mask applied to sensitive sector {id}"
]

def forge_commit(date, msg_id):
    msg = random.choice(MESSAGES).format(id=msg_id)
    # Create a dummy change
    with open("GHOST.md", "a") as f:
        f.write(f"\n{date.isoformat()} - {msg}")
    
    env = os.environ.copy()
    date_str = date.strftime("%Y-%m-%d %H:%M:%S")
    env["GIT_AUTHOR_DATE"] = date_str
    env["GIT_COMMITTER_DATE"] = date_str
    
    subprocess.run(["git", "add", "GHOST.md"], check=True)
    subprocess.run(["git", "commit", "-m", msg], env=env, check=True)

def run_forgery(days=30, intensity=3):
    print(f"[*] Starting Graph Forgery Protocol for last {days} days...")
    start_date = datetime.datetime.now() - datetime.timedelta(days=days)
    
    for day in range(days):
        current_day = start_date + datetime.timedelta(days=day)
        # Randomize number of commits per day
        num_commits = random.randint(0, intensity)
        for _ in range(num_commits):
            # Randomize time within the day
            hour = random.randint(0, 23)
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            commit_time = current_day.replace(hour=hour, minute=minute, second=second)
            
            msg_id = random.randint(1000, 9999)
            forge_commit(commit_time, msg_id)
            print(f"  [+] Injected commit: {commit_time} - ID {msg_id}")

if __name__ == "__main__":
    days = 30
    if len(sys.argv) > 1:
        days = int(sys.argv[1])
    run_forgery(days=days)
