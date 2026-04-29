from destiny2_notifier import Destiny2Notifier

def send_news():
    notifier = Destiny2Notifier()
    
    print("[*] Sending Latest Destiny 2 News (April 2026)...")
    
    # 1. Community Challenge
    notifier.notify_vanguard_signal(
        "Community Challenge: Commander's Orders",
        "コミュニティチャレンジ：司令官の命令",
        "Zavala has issued a call to arms. Defeat 15 million enemies using Vanguard-approved weapons to earn the 'Commander's Salute' emblem.",
        "ザヴァラ司令官からの招集です。ヴァンガード公認の武器を使用し、システム全域で1500万体の敵を撃破してエンブレム『司令官の敬礼』を獲得しましょう。",
        "https://www.bungie.net/7/en/News"
    )
    
    # 2. Patch Notes
    notifier.notify_tower_maintenance(
        "9.5.6.2",
        "Bug fixes for Lawless Vouchers and Guardian Games class items. Stability improvements for planetary nodes.",
        "『無法者のバウチャー』およびガーディアン・ゲームのクラスアイテムに関する不具合を修正。惑星ノードの安定性を向上させました。",
        "https://www.bungie.net/7/en/News"
    )
    
    # 3. Guardian Games Winners
    notifier.notify_vanguard_signal(
        "Warlocks Victorious in Guardian Games 2026",
        "ガーディアン・ゲーム2026：ウォーロックが勝利",
        "The Warlock class has officially won the 2026 Guardian Games. Glory to the scholars of the Light!",
        "ウォーロック・クラスがガーディアン・ゲーム2026で正式に優勝しました。光の探求者たちに栄光あれ！",
        "https://www.bungie.net/7/en/News"
    )
    
    # 4. Director's Signal (Based on June Update info)
    notifier.notify_director_order(
        "Bungie Development Team",
        "We are preparing a massive update for June 2026. Sandbox tuning and QoL changes are coming. Expect a full reveal in mid-May.",
        "2026年6月の大型アップデートに向けて準備を進めています。サンドボックスの調整とQoLの改善を予定しており、5月中旬に詳細を公開します。",
        "Bungie Official Blog"
    )

    # 5. Reddit Trending (April 2026)
    notifier.notify_reddit_signal(
        "DestinyTheGame",
        "Bungie, the Iron Banner loot drops feel much better this time. Keep it up!",
        "アイアンバナーのドロップ率、今回はかなり改善されてる。この調子で頼むぞBungie！",
        "4.2k",
        "https://reddit.com/r/DestinyTheGame"
    )

    notifier.notify_reddit_signal(
        "raidsecrets",
        "Found a strange symbol in the new Exotic Mission. Could this be related to the June update?",
        "新しいエキゾチックミッションで奇妙なシンボルを発見。6月のアップデートに関連しているのか？",
        "2.8k",
        "https://reddit.com/r/raidsecrets"
    )

if __name__ == "__main__":
    send_news()
