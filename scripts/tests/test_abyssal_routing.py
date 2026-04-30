from marathon_templates import MarathonNotifier

def test_abyssal_dispatch():
    notifier = MarathonNotifier()
    
    print("[*] Dispatching Intelligence to Abyssal Channel...")
    
    # 1. Reddit Signal (Should go to Abyssal)
    notifier.notify_reddit_signal(
        "marathonleaks",
        "Found encrypted audio logs in the 1.0.6 metadata.",
        "1.0.6のメタデータから暗号化された音声ログを発見しました。",
        "Seems to be a recording of a rogue AI from the U.E.S.C. Era.",
        "U.E.S.C.時代の暴走AIの記録のようです。",
        "1.2k",
        "https://reddit.com/r/marathonleaks"
    )
    
    # 2. Leak Signal (Should go to Abyssal)
    notifier.notify_leak_signal(
        "Potential Rook Class: 'Specter'",
        "新Rookクラスの可能性: 『スペクター』",
        "Leaks suggest a stealth-focused class with temporary invisibility.",
        "一時的な不可視化能力を持つ隠密特化型クラスのリーク情報です。",
        "Bungie Internal Leak",
        "https://www.marathonthegame.com"
    )

if __name__ == "__main__":
    test_abyssal_dispatch()
