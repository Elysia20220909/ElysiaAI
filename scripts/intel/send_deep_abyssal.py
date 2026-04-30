from marathon_templates import MarathonNotifier

def send_deep_abyssal():
    notifier = MarathonNotifier()
    
    print("[*] Dispatching Deep Abyssal Intelligence...")
    
    # 1. Lore Leak (Historical Rampancy)
    notifier.notify_leak_signal(
        "The Ghost of Traxus IV",
        "Traxus IV の亡霊",
        "Community theorists suggest the current corporation is hiding a direct link to the 2206 AI Rampancy event. Was the 'Crash' truly contained?",
        "コミュニティの考察勢は、現在の企業が2206年のAI暴走（Rampancy）事件との直接的な繋がりを隠蔽していると推測しています。『クラッシュ』は本当に収束したのでしょうか？",
        "Archival Theory",
        "https://www.marathonthegame.com/lore"
    )
    
    # 2. Reddit Signal (Bungie's Aggressive Stance)
    notifier.notify_reddit_signal(
        "marathon",
        "Bungie's recent datamine takedowns are suspiciously targeted.",
        "Bungieの最近のデータマイニング差し押さえが、不自然なほど特定箇所に集中している。",
        "Users report that mentioning specific hex codes from the 1.0.6 update leads to instant thread removal.",
        "ユーザーの報告によると、1.0.6アップデート内の特定のヘックスコードに言及すると、即座にスレッドが削除されるようです。",
        "8.4k",
        "https://reddit.com/r/marathon"
    )
    
    # 3. Clandestine Signal (Rogue AI Logs)
    notifier.notify_leak_signal(
        "Encrypted Audio: 'UESC-LOG-2206'",
        "暗号化音声: 『UESC-LOG-2206』",
        "Rumors of a hidden audio file found in the 'Tau Ceti' sector metadata. Sounds of a dying AI repeating the word 'DURANDAL'.",
        "『タウ・セティ』セクターのメタデータから隠し音声ファイルが発見されたとの噂。『DURANDAL』という言葉を繰り返す、末期のAIの音声とのことです。",
        "Abyssal Datamine Leak",
        None
    )

if __name__ == "__main__":
    send_deep_abyssal()
