from marathon_templates import MarathonNotifier

def send_intel():
    notifier = MarathonNotifier()
    
    print("[*] Dispatching Marathon Abyssal Intel (April 2026)...")
    
    # 1. Major Gameplay Shift (Balance)
    notifier.notify_combat_balance(
        "Extraction Protocol",
        "抽出プロトコル",
        "Extraction points have been moved from fixed to randomized locations to prevent 'extraction camping'.",
        "「脱出地点待ち伏せ」を防止するため、脱出地点が固定からランダム配置に変更されました。",
        "https://www.marathonthegame.com/sandbox"
    )
    
    # 2. Weapon Tuning
    notifier.notify_kit_update(
        "WSTR / Snipe Calibration",
        "WSTR / スナイパー調整",
        "Reduced recoil for WSTR rifles; slight damage falloff increase for high-power knives.",
        "WSTRライフルの反動を軽減。高威力ナイフのダメージ減衰率をわずかに増加。",
        "https://www.marathonthegame.com/kits"
    )
    
    # 3. Director Signal (Ziegler)
    notifier.notify_director_signal(
        "Joe Ziegler",
        "Our goal is to make the PvPvE sandbox feel alive and unpredictable. These changes are the first step towards that vision.",
        "我々の目標は、PvPvEのサンドボックスを生き生きとした、予測不可能なものにすることです。今回の変更はそのビジョンへの第一歩です。",
        "Bungie Internal Interview"
    )
    
    # 4. Reddit Trending (Community Reaction)
    notifier.notify_reddit_signal(
        "marathon",
        "The random extraction points are making the game much more tense (and harder).",
        "ランダムな脱出地点のせいで、ゲームがより緊張感のある（そして難しい）ものになっている。",
        "Mixed community reactions; veteran players appreciate the challenge, while newer players find it unforgiving.",
        "コミュニティの反応は分かれています。ベテランは挑戦を楽しんでいますが、新規プレイヤーには厳しすぎるとの声も。",
        "4.8k",
        "https://reddit.com/r/marathon"
    )

if __name__ == "__main__":
    send_intel()
