from marathon_templates import MarathonNotifier

def send_director_updates():
    notifier = MarathonNotifier()
    
    print("[*] Dispatching Marathon Director Signals (P/D Intel)...")
    
    # 1. Joe Ziegler's Sandbox Vision
    notifier.notify_director_signal(
        "Joe Ziegler",
        "We are monitoring outliers in the combat space. Our goal is to ensure buildcrafting remains impactful without any single item becoming the uncontested 'dominant option'.",
        "我々は戦闘空間における異常値を監視しています。私たちの目標は、特定のアイテムやアビリティが『唯一の選択肢』になることなく、ビルド構築が意味を持つようにすることです。",
        "April Sandbox Update"
    )
    
    # 2. WSTR Shotgun Rebalance (Critical P/D news)
    notifier.notify_combat_balance(
        "WSTR Combat Shotgun",
        "WSTR コンバットショットガン",
        "Adjusted critical multiplier (1.15x -> 1.05x) and increased AI damage bonus. Aiming to reduce PvP dominance while buffing PvE utility.",
        "クリティカル倍率を調整 (1.15x -> 1.05x)、対AIダメージボーナスを増加。PvPでの圧倒的な強さを抑えつつ、PvEでの有用性を向上させました。",
        "https://www.marathonthegame.com/updates/1-0-6-2"
    )
    
    # 3. Bubble Shield & Melee Pass
    notifier.notify_patch_notes(
        "1.0.5.3",
        "Bubble Shields moved to Superior rarity; HP reduced by 33%. Knife lunge distance and melee damage scaling against Runners reduced.",
        "バブルシールドを『スペリア（紫）』レアリティに変更、HPを33%削減。ナイフの突進距離とランナーに対する近接ダメージのスケーリングを下方修正しました。",
        "https://www.marathonthegame.com/updates"
    )
    
    # 4. Community Focus (Ziegler's Message)
    notifier.notify_director_signal(
        "Joe Ziegler",
        "We've heard the feedback regarding the learning curve. Expect more accessible consumables (patch kits/shield charges) in early map zones soon.",
        "学習曲線に関するフィードバックは届いています。近いうちに初期マップゾーンでの消耗品（パッチキット/シールドチャージ）の入手性を高める予定です。",
        "Developer Social Dispatch"
    )

if __name__ == "__main__":
    send_director_updates()
