from marathon_templates import MarathonNotifier

def send_news():
    notifier = MarathonNotifier()
    
    print("[*] Sending Latest Marathon News (Post-Launch April 2026)...")
    
    # 1. Community Milestone
    notifier.notify_cryo_archive(
        "10 Million Extractions Achieved",
        "1000万回のエクストラクション達成",
        "Global Servers",
        "グローバルサーバー",
        "Exotic"
    )
    
    # 2. Patch Notes
    notifier.notify_patch_notes(
        "1.0.5",
        "Optimized server resonance for the 'Solitary Woods' zone and fixed intermittent disconnects during high-intensity extraction phases.",
        "『ソリタリー・ウッズ』ゾーンのサーバー共鳴を最適化し、高強度の抽出フェーズ中に発生していた断続的な切断を修正しました。",
        "https://www.marathonthegame.com/updates"
    )
    
    # 3. Director's Signal
    notifier.notify_director_signal(
        "Joe Ziegler",
        "We are overwhelmed by the player response in the first month. Looking forward to our first major seasonal content reveal soon.",
        "初月のプレイヤーからの反応に圧倒されています。近いうちに、最初の大型シーズンコンテンツの公開を予定しています。",
        "X (Twitter)"
    )
    
    # 4. Reddit Trending
    notifier.notify_reddit_signal(
        "marathon",
        "Is the 'Ghost-Walker' kit actually meta or just overhyped?",
        "『ゴースト・ウォーカー』キットは本当にメタなのか、それとも過大評価か？",
        "The kit provides exceptional stealth but lacks raw mobility in open fields.",
        "このキットは卓越した隠密性を提供しますが、開けた場所での純粋な機動力には欠けます。",
        "3.5k",
        "https://reddit.com/r/marathon"
    )

if __name__ == "__main__":
    send_news()
