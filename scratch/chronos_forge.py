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


def forge_history(days_back=180, density=0.5):
    print(">>> [SYSTEM] INITIALIZING CHRONOS FORGE: RENOVATION MODE")
    print(f">>> [KERNEL] SIMULATING {days_back} DAYS OF CONSTRUCTION HISTORY...")

    start_date = datetime.datetime.now() - datetime.timedelta(days=days_back)

    messages = [
        "大規模修繕工事: 足場設営および安全確認",
        "大規模修繕工事: 外壁ひび割れ補修 (エポキシ樹脂注入)",
        "大規模修繕工事: 屋上防水層の全面張り替え",
        "大規模修繕工事: バルコニー床面防水塗装",
        "大規模修繕工事: 鉄部塗装塗り替え (サビ止め処理)",
        "大規模修繕工事: 排水管高圧洗浄および点検",
        "大規模修繕工事: タイル剥落防止措置の実施",
        "大規模修繕工事: 建材搬入および周辺環境整備",
        "大規模修繕工事: シーリング材の打ち替え作業",
        "大規模修繕工事: 騒音・振動対策パトロール実施",
        "大規模修繕工事: 第1期修繕計画の進捗確認",
        "大規模修繕工事: 居住者向け説明資料の更新",
        "大規模修繕工事: 共用部照明のLED化更新",
        "大規模修繕工事: 足場解体前の最終チェック",
    ]

    total_forged = 0
    for i in range(days_back):
        current_date = start_date + datetime.timedelta(days=i)

        # Work on weekdays mostly
        current_density = density if current_date.weekday() < 5 else 0.1

        if random.random() < current_density:
            num_commits = random.randint(2, 10)
            for _ in range(num_commits):
                commit_time = current_date.replace(
                    hour=random.randint(8, 17),  # Construction hours
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59),
                )
                msg = random.choice(messages)
                run_git_commit(commit_time, msg)
                total_forged += 1

    print(f">>> [SUCCESS] REALITY OVERWRITTEN. {total_forged} COMMITS FORGED.")


if __name__ == "__main__":
    forge_history()
