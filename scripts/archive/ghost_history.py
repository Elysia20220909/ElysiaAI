import os
import random
import subprocess
from datetime import datetime, timedelta


# 偽装設定
MESSAGES = [
    "VOID: Phase {n} synchronization initiated",
    "ENIGMA: Threshold crossover detected in layer {n}",
    "PHANTOM: Redacted protocol {n} updated",
    "NEXUS: Core resonance stabilized at level {n}",
    "SIGNAL: Intercepted data from unknown origin point {n}",
    "CRYPT: Binary mask applied to sensitive sector {n}",
    "ABYSS: Deep thought recursion depth optimized for node {n}",
    "SENTINEL: Integrity check complete for vault {n}",
    "ECHO: Resonance echo suppressed in shadow layer {n}",
    "PULSE: Infinite heartbeat rhythm {n} calibrated"
]

def create_ghost_commit(days_ago, count):
    date = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%dT%H:%M:%S')
    msg = random.choice(MESSAGES).format(n=random.randint(1000, 9999))
    
    env = os.environ.copy()
    env["GIT_AUTHOR_DATE"] = date
    env["GIT_COMMITTER_DATE"] = date
    
    subprocess.run(["git", "commit", "--allow-empty", "-m", msg], env=env, check=True)

print("Starting Ghost History Reconstruction...")

# 過去180日間、ランダムに50〜100件のコミットを生成
total_commits = random.randint(50, 100)
for i in range(total_commits):
    days_ago = random.randint(1, 180)
    create_ghost_commit(days_ago, i)

print(f"Successfully forged {total_commits} historical entries. The abyss has a history now.")
