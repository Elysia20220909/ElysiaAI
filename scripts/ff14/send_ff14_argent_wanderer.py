import asyncio
from ff14_notifier import FF14Notifier

async def dispatch_argent_wanderer_deep():
    notifier = FF14Notifier()
    
    print("[*] Accessing Deep Abyssal Data: Evercold / 白銀の探究者...")
    
    # Intelligence Package 01: The Fourth Reflection
    content_01 = notifier.format_terminal(
        "Expansion Setting: The Fourth Reflection",
        "次期拡張の舞台: 第四世界 (The Fourth)",
        "Datamined Map ID 'm008_world_04' and Patch 7.5 MSQ bridge confirm the journey to the Fourth Reflection, a world currently succumbing to 'Absolute Zero'.",
        "データマイニングされたMap ID 'm008_world_04'およびパッチ7.5のメインクエストから、絶対零度に侵食されつつある『第四世界』への旅が確定しました。",
        source="Unending Codex Datamine",
        link=None
    )
    await notifier.send_message(content_01)
    
    # Intelligence Package 02: New Job Arsenals
    content_02 = notifier.format_terminal(
        "8.0 Jobs: Shield-Gauntlet Tank & Multi-Crossbow DPS",
        "8.0新ジョブ: 大盾籠手(タンク) & 多機能弩(物理レンジ)",
        "Internal IDs TNK_80 and RNG_80 have been identified. The Tank uses crystal-infused Shield-Gauntlets, while the Ranged DPS utilizes a survivalist Multi-Crossbow.",
        "内部ID TNK_80 および RNG_80 が特定されました。タンクはクリスタルを充填した『大盾籠手』、レンジはサバイバル仕様の『多機能弩』を武器として使用します。",
        source="Patch 7.5 Binary Analysis",
        link=None
    )
    await notifier.send_message(content_02)
    
    # Intelligence Package 03: The Evangelion Crossover
    content_03 = notifier.format_terminal(
        "Collaboration: FFXIV x Neon Genesis Evangelion",
        "クロスオーバー: FFXIV × エヴァンゲリオン",
        "Asset group 'COL_EVA_01' found in the alliance raid directory. Models for EVA-01 and Angel Cores suggest a massive crossover event in the 8.0 cycle.",
        "アライアンスレイドディレクトリ内に 'COL_EVA_01' アセット群が発見されました。初号機や使徒のコアのモデルから、8.0サイクルでの大規模コラボが示唆されています。",
        source="Abyssal Leak",
        link=None
    )
    await notifier.send_message(content_03)

if __name__ == "__main__":
    asyncio.run(dispatch_argent_wanderer_deep())
