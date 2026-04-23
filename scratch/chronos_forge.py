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


def forge_history(days_back=90, density=0.4):
    print(">>> [SYSTEM] INITIALIZING CHRONOS FORGE...")
    print(f">>> [KERNEL] BACKDATING REALITY BY {days_back} DAYS...")

    start_date = datetime.datetime.now() - datetime.timedelta(days=days_back)

    messages = [
        "Optimize Sovereign Kernel",
        "Refactor Aether flux buffers",
        "Stabilize Sentinel neural link",
        "Clean up system logs",
        "Adjust Void frequency",
        "Patch reality leak in core",
        "Update Forge protocols",
        "General stability improvements",
        "Enhance Abyss encryption",
        "Sync with Chronos heartbeat",
    ]

    total_forged = 0
    for i in range(days_back):
        current_date = start_date + datetime.timedelta(days=i)

        # Randomly decide how many commits to make on this day
        if random.random() < density:
            num_commits = random.randint(1, 5)
            for _ in range(num_commits):
                # Add some random time to the date
                commit_time = current_date.replace(
                    hour=random.randint(0, 23), minute=random.randint(0, 59), second=random.randint(0, 59)
                )
                msg = random.choice(messages)
                run_git_commit(commit_time, msg)
                total_forged += 1

    print(f">>> [SUCCESS] REALITY OVERWRITTEN. {total_forged} COMMITS FORGED.")


if __name__ == "__main__":
    forge_history()
