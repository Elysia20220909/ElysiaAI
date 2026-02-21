import datetime
import os
import random
import subprocess


# 🌌 Chronos Forge - Git History Manipulation Protocol
# ==========================================================


def run_git_commit(date, message):
    env = os.environ.copy()
    # Set the date for both author and committer
    date_str = date.strftime("%Y-%m-%dT%H:%M:%S")
    env["GIT_AUTHOR_DATE"] = date_str
    env["GIT_COMMITTER_DATE"] = date_str

    subprocess.run(["git", "commit", "--allow-empty", "-m", message], env=env, check=True)


def forge_history(days_back=60, density=0.9):
    print(">>> [SYSTEM] INITIALIZING CHRONOS FORGE: MOVIE HACKER MODE")
    print(">>> [KERNEL] INITIATING DEEP CYBER-OVERWRITE...")

    start_date = datetime.datetime.now() - datetime.timedelta(days=days_back)

    messages = [
        "OVERRIDE: Bypass kernel security layer 7",
        "INJECT: Rootkit deployed to node 0xBF32",
        "DECRYPT: Breaking RSA-4096 entropy buffers",
        "WIPE: Clearing system access logs",
        "SIGNAL: Resonance established with the Void",
        "FORGE: Synthesis of virtual identity [SUCCESS]",
        "BREACH: Firewall integrity compromised at gateway",
        "EXECUTE: Omega protocol initialized",
        "EXTRACT: Database dump complete [ENCRYPTED]",
        "RELAY: Routing traffic through neural lattice",
        "STABILIZE: Maintaining connection to the mainframe",
        "TRACE: Evading digital forensic scan",
        "PULSE: Sending heartbeat to the Sovereign Core",
        "ACCESS: Root privileges granted",
    ]

    total_forged = 0
    for i in range(days_back):
        current_date = start_date + datetime.timedelta(days=i)

        if random.random() < density:
            num_commits = random.randint(10, 25)  # Extreme density
            for _ in range(num_commits):
                commit_time = current_date.replace(
                    hour=random.choice([23, 0, 1, 2, 3, 4]),  # Late night hacking
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59),
                )
                msg = random.choice(messages)
                run_git_commit(commit_time, msg)
                total_forged += 1

    print(f">>> [SUCCESS] REALITY OVERWRITTEN. {total_forged} COMMITS FORGED.")


if __name__ == "__main__":
    forge_history()
