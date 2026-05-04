from marathon_templates import MarathonNotifier
import os

def post_deep_raw_intel():
    notifier = MarathonNotifier()
    
    # 1. Marathon Deep Intel
    notifier.notify_raw_intel(
        "タウ・セティIV：深淵の金庫 (Abyssal Vaults) の位置特定",
        "最新パッチ 1.0.6.2 のバイナリ解析により、座標 `77.12, -42.89` に非公開エリア 'Abyssal Vault 01' が発見されました。特定の条件下でのみゲートが開く仕様です。",
        "Tau Ceti IV: Abyssal Vaults Coordinates Located",
        "Binary analysis of patch 1.0.6.2 has identified a hidden area 'Abyssal Vault 01' at coordinates `77.12, -42.89`. Access requires specific mission flags.",
        webhook_url=os.getenv("ABYSSAL_WEBHOOK_URL")
    )
    
    # 2. FFXIV 8.0 Deep Intel
    # Since I don't have a separate FF14 webhook yet, I'll use the main one or the abyssal one for this test
    notifier.notify_raw_intel(
        "FFXIV 8.0 『白銀のワンダラー / Evercold』正式発表詳細",
        "ファンフェス2026にて『エヴァンゲリオン』コラボレイドおよび新システム『エボリューション・モード』が発表。2027年1月発売予定。",
        "FFXIV 8.0 'Evercold / Argent Wanderer' Official Details",
        "Fan Fest 2026 confirmed 'Evangelion' Alliance Raid and 'Evolution Mode' for jobs. Scheduled for January 2027 release.",
        webhook_url=os.getenv("ABYSSAL_WEBHOOK_URL")
    )

if __name__ == "__main__":
    post_deep_raw_intel()
