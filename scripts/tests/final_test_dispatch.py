from marathon_templates import MarathonNotifier

def run_final_test():
    notifier = MarathonNotifier()
    
    print("[*] Dispatching Plain Text Test Signals...")
    
    # 1. Main News Channel Test (Patch Notes)
    notifier.notify_patch_notes(
        version="TEST-RUN-01",
        summary_en="Verified plain text delivery system. Embed frames have been decommissioned for improved readability.",
        summary_ja="プレーンテキスト配信システムの動作を確認しました。視認性向上のため、埋め込み枠（Embed）を廃止しました。",
        link="https://www.marathonthegame.com"
    )
    
    # 2. Abyssal Channel Test (Director/Leak)
    notifier.notify_director_signal(
        author="System Architect",
        text_en="The transition to low-bandwidth text protocols is complete. Traxus nodes are now operating in 'Silent Editor' mode.",
        text_ja="低帯域テキストプロトコルへの移行が完了しました。Traxusノードは現在『サイレント・エディタ』モードで動作しています。",
        platform="Elysia Internal"
    )
    
    notifier.notify_leak_signal(
        "Encrypted Packet: ALPHA-7",
        "暗号化パケット: ALPHA-7",
        "Testing multi-line support in the new clandestine text format. Verification successful.",
        "新しい隠密テキスト形式での複数行サポートをテスト中。検証に成功しました。",
        "Internal Test Probe"
    )

if __name__ == "__main__":
    run_final_test()
