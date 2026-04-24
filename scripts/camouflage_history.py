import os
import re
import subprocess


# Configuration: Target keywords and their "Forged" replacements
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

import argparse
import sys


def get_new_message(old_msg):
    for pattern, replacement in MAPPING:
        if re.search(pattern, old_msg, re.IGNORECASE):
            return replacement
    return old_msg

def run_filter():
    old_msg = sys.stdin.read().strip()
    new_msg = get_new_message(old_msg)
    print(new_msg)

def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--filter", action="store_true", help="Run in filter mode for git filter-branch")
    args = parser.parse_args()

    if args.filter:
        run_filter()
        return

    print("[*] Initiating History Camouflage Protocol...")
    
    # Use absolute path for the script to ensure it's found during filter-branch
    script_path = os.path.abspath(__file__).replace("\\", "/")
    
    cmd = [
        "git", "filter-branch", "--force", "--msg-filter",
        f"python \"{script_path}\" --filter",
        "master" # Rewrite the entire master branch
    ]
    
    try:
        # Purge original refs to allow re-run
        subprocess.run(["git", "update-ref", "-d", "refs/original/refs/heads/master"], stderr=subprocess.DEVNULL)
        env = os.environ.copy()
        env["FILTER_BRANCH_SQUELCH_WARNING"] = "1"
        subprocess.run(cmd, check=True, env=env)
        print("[+] Protocol Complete. History has been sovereignized.")
    except Exception as e:
        print(f"[-] Protocol Failed: {e}")

if __name__ == "__main__":
    run()
