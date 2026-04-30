import os
import sys
from marathon_templates import MarathonNotifier, FF14_WEBHOOK_URL, ABYSSAL_WEBHOOK_URL
from dotenv import load_dotenv

# Ensure UTF-8 for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

def dispatch_intel():
    notifier = MarathonNotifier()
    
    # ターゲットチャンネルのリスト
    targets = [
        ("FF14 NOTIFIER (Reddit)", FF14_WEBHOOK_URL),
        ("ABYSSAL/LEAK (リーク噂話)", ABYSSAL_WEBHOOK_URL)
    ]
    
    print(f"[*] Commencing 8.0 'Evercold' Intel Transfer to {len(targets)} channels...")

    # Intelligence Data
    intel_items = [
        {
            "title_en": "8.0 Setting: The Fourth Reflection",
            "title_ja": "8.0 舞台: 第四世界 (The Fourth)",
            "content_en": "Datamined Map ID 'm008_world_04' and Patch 7.5 MSQ bridge confirm the journey to the Fourth Reflection, a world currently succumbing to 'Absolute Zero'.",
            "content_ja": "Map ID 'm008_world_04' および 7.5 MSQ から、絶対零度に侵食されつつある『第四世界』への旅が確定しました。",
            "source": "Patch 7.5 Datamine / Unending Codex"
        },
        {
            "title_en": "8.0 Jobs: Shield-Gauntlet & Multi-Crossbow",
            "title_ja": "8.0 新ジョブ: 大盾籠手 & 多機能弩",
            "content_en": "Internal IDs TNK_80 (Tank) and RNG_80 (Physical Ranged) identified. Tank uses crystal-infused Shield-Gauntlets; Ranged uses survivalist Multi-Crossbow.",
            "content_ja": "内部ID TNK_80 (タンク) および RNG_80 (レンジ) が特定。タンクは『大盾籠手』、レンジは『多機能弩』を装備します。",
            "source": "Binary Analysis / Sector-80 Strings"
        },
        {
            "title_en": "Collaboration: FFXIV x Neon Genesis Evangelion",
            "title_ja": "コラボレーション: FFXIV × エヴァンゲリオン",
            "content_en": "Asset group 'COL_EVA_01' found in alliance raid directory. Models for EVA-01 and Angel Cores suggest a massive crossover in the 8.0 cycle.",
            "content_ja": "アライアンスレイド内に 'COL_EVA_01' 発見。初号機や使徒のコアのモデルから、8.0での大規模コラボが示唆されています。",
            "source": "Abyssal Leak / Studio Khara Metadata"
        }
    ]

    for name, url in targets:
        if not url:
            print(f"[!] Skipping {name}: Webhook URL not set.")
            continue
            
        print(f"[*] Dispatching to {name}...")
        for item in intel_items:
            notifier.notify_leak_signal(
                title_en=item["title_en"],
                title_ja=item["title_ja"],
                content_en=item["content_en"],
                content_ja=item["content_ja"],
                source=item["source"],
                webhook_url=url
            )
    
    print("\n[+] 8.0 Intel Transfer Complete.")

if __name__ == "__main__":
    dispatch_intel()
