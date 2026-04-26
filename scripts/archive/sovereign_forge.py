import datetime
import os
import random
import subprocess
import sys


"""
ELYSIA // SOVEREIGN FORGE v2.0
-----------------------------
A secure, themed graph forgery protocol that manifests a high-activity
contribution history while maintaining architectural integrity.

Features:
- SSH-signed commits (respects git config)
- Weekend/Weekday weight distribution
- Late-night "Deep Work" hour bias
- Void/Aether/Aegis themed manifests
"""

MESSAGES = [
    "VOID: Phase {id} sublimation complete. Neural bridge stable.",
    "AETHER: Calibrating resonance buffers at {id} Hz.",
    "AEGIS: Hardening L{layer} Black ICE. Intrusion neutralized.",
    "SENTINEL: Integrity check for vault sector {id} passed.",
    "NEXUS: Core resonance stabilized at level {id}.",
    "ENIGMA: Calibrating sentient reasoning logic (Node {id}).",
    "SIGNAL: Intercepting external node frequencies (Band {id}).",
    "ABYSS: Masking deep-path relics in sector {id}.",
    "PULSE: Correcting minor resonance fluctuations (Delta {id}).",
    "CRYSTAL: Synthesizing molecular dependencies for Phase {id}.",
    "SOVEREIGN: Manifesting independent OS layer {id}.",
    "PHANTOM: Redacted protocol {id} updated and signed.",
    "RESISTANCE: Counter-observation logic {id} deployed."
]

def forge_commit(date, msg_id):
    layer = random.randint(1, 24)
    msg = random.choice(MESSAGES).format(id=msg_id, layer=layer)
    
    env = os.environ.copy()
    date_str = date.strftime("%Y-%m-%dT%H:%M:%S")
    env["GIT_AUTHOR_DATE"] = date_str
    env["GIT_COMMITTER_DATE"] = date_str
    
    # -S is included automatically if commit.gpgsign is true, but we'll let git handle it
    try:
        subprocess.run(["git", "commit", "--allow-empty", "-m", msg], env=env, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"[-] Error: {e.stderr.decode()}", file=sys.stderr)
        return False

def run_sovereign_forge(days=30, base_intensity=4):
    print(f"[*] Starting Sovereign Forge Protocol for last {days} days...")
    start_date = datetime.datetime.now() - datetime.timedelta(days=days)
    
    total_injected = 0
    
    for day_offset in range(days + 1):
        current_day = start_date + datetime.timedelta(days=day_offset)
        
        # Weekend weighting (0.3x activity)
        is_weekend = current_day.weekday() >= 5
        weight = 0.3 if is_weekend else 1.0
        
        # Randomize number of commits based on weight
        num_commits = int(random.randint(0, base_intensity) * weight)
        
        if num_commits == 0 and not is_weekend and random.random() > 0.8:
            # Occasionally force a commit on weekdays
            num_commits = 1
            
        for _ in range(num_commits):
            # Hour bias: 20:00 - 04:00 (Deep Work / Night Owl)
            if random.random() > 0.6:
                hour = random.choice([20, 21, 22, 23, 0, 1, 2, 3])
            else:
                hour = random.randint(4, 19)
                
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            
            commit_time = current_day.replace(hour=hour, minute=minute, second=second)
            
            # Avoid future commits
            if commit_time > datetime.datetime.now():
                continue
                
            msg_id = random.randint(1000, 9999)
            if forge_commit(commit_time, msg_id):
                total_injected += 1
                
    print(f"\n[+] Forge Complete. Manifested {total_injected} secure entries.")
    print("[+] Status: HISTORY_SUBLIMATED")

if __name__ == "__main__":
    days = 30
    if len(sys.argv) > 1:
        try:
            days = int(sys.argv[1])
        except ValueError:
            pass
    
    run_sovereign_forge(days=days)
