import re
import subprocess
import time


# Thematic mapping for auto-commits
MAPPING = [
    (r".*(Discord|bot|webhook|sentinel|broadcast).*", "SENTINEL: Clandestine broadcast interceptor active."),
    (r".*(Server|route|backend|ElysiaAI server|api).*", "NEXUS: Core gateway manifestation."),
    (r".*(login|UI|visualizer|animation|Matrix|rain|interface).*", "VOID: Ethereal interface projected to physical terminal."),
    (r".*(requirements|dependency|chore|package\.json|npm|metadata).*", "CRYSTAL: Synthesizing molecular dependencies."),
    (r".*(nitter|twscrape|monitor|Twitter|social|Marathon).*", "SIGNAL: Intercepting external node frequencies."),
    (r".*(Ubuntu|deployment|systemd|setup|Tauri|kernel|virtualization).*", "NEXUS: Sovereign node manifestation on organic silicon."),
    (r".*(refactor|fix|import|lint|order|style|css).*", "PULSE: Correcting minor resonance fluctuations."),
    (r".*(docker|compose|container|stack|orchestration).*", "AEGIS: Hardening multi-layer containerized ICE."),
    (r".*(reasoning|ollama|rag|logic|decision tree).*", "ENIGMA: Calibrating sentient reasoning logic."),
    (r".*(docs|readme|documentation|copyright).*", "ABYSS: Masking deep-path relics."),
]

def get_sovereign_message(diff_summary):
    # Try to find a match in the diff summary
    for pattern, replacement in MAPPING:
        if re.search(pattern, diff_summary, re.IGNORECASE):
            return replacement
    # Default message if no match
    return "PULSE: System heartbeat synchronized."

def check_and_commit():
    # Check for changes
    status = subprocess.run(["git", "status", "--short"], capture_output=True, text=True).stdout.strip()
    if not status:
        return

    print(f"[*] Changes detected:\n{status}")
    
    # Get a summary of changes for mapping
    # Just use the status string as a hint
    msg = get_sovereign_message(status)
    
    try:
        subprocess.run(["git", "add", "."], check=True)
        subprocess.run(["git", "commit", "-m", msg], check=True)
        print(f"[+] Automated Sovereign Commit: {msg}")
    except Exception as e:
        print(f"[-] Auto-commit failed: {e}")

def run_sentinel():
    print("[*] Sovereign Auto-Sentinel Awakening...")
    print("[*] Monitoring repository for fluctuations...")
    try:
        while True:
            check_and_commit()
            time.sleep(10) # Scan every 10 seconds
    except KeyboardInterrupt:
        print("[*] Sentinel returning to Abyss.")

if __name__ == "__main__":
    run_sentinel()
