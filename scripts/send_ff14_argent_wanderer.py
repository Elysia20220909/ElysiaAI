import asyncio
from ff14_notifier import FF14Notifier

async def dispatch_argent_wanderer_deep():
    notifier = FF14Notifier()
    
    print("[*] Accessing Deep Abyssal Data: Argent Wanderer...")
    
    # Intelligence Package 01: The Far North Rumors
    content_01 = notifier.format_terminal(
        "Expansion Title Leak: 'Argent Wanderer'",
        "拡張タイトルリーク: 『白銀のワンダラー』",
        "Community leaks suggest 8.0 will take players to the extreme Far North of Ilsabard. Theme: Survival and the origin of 'Silver' magic.",
        "コミュニティのリークによると、8.0はイルサバード極北部が舞台になるとのこと。テーマは『生存』と『白銀の魔法』の起源。",
        source="Abyssal Board / 4chan",
        link=None
    )
    await notifier.send_message(content_01)
    
    # Intelligence Package 02: Job Class Theory
    content_02 = notifier.format_terminal(
        "New Job Concept: 'Spellblade' (Caster Tank)",
        "新ジョブコンセプト: 『魔法剣士』（キャスタータンク）",
        "Datamined strings indicate a front-line combatant using crystal-infused barriers. Likely to be the 'Argent' signature job.",
        "データマイニングされた文字列は、クリスタル障壁を使用する前衛戦闘職を示唆しています。『白銀』を象徴するジョブになる可能性が高いです。",
        source="Reddit Datamine",
        link="https://reddit.com/r/ffxivleaks"
    )
    await notifier.send_message(content_02)
    
    # Intelligence Package 03: Narrative Focus
    content_03 = notifier.format_terminal(
        "Character Arc: The Silver Duo",
        "キャラクターアーク: 白銀の二人組",
        "Rumors imply a heavy focus on Thancred and Urianger's past. A return to the First to find a way to restore 'Argent' souls.",
        "サンクレッドとうりエンジェの過去に焦点を当てるという噂。 『白銀』の魂を修復する方法を見つけるために第一世界へ再訪するとのこと。",
        source="Insider Rumor",
        link=None
    )
    await notifier.send_message(content_03)

if __name__ == "__main__":
    asyncio.run(dispatch_argent_wanderer_deep())
