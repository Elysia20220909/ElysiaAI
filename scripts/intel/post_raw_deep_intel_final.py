import os
import asyncio
from marathon_templates import MarathonNotifier
from ff14_notifier import FF14Notifier

async def post_deep_raw_intel_correct_routing():
    m_notifier = MarathonNotifier()
    f_notifier = FF14Notifier()
    
    print("[*] Dispatching Raw Intelligence with CORRECT Routing...")
    
    # 1. Marathon Deep Intel -> ABYSSAL Webhook
    title_ja_m = "Marathon: タウ・セティIV：深淵の金庫 (Abyssal Vaults) の位置特定"
    content_ja_m = "座標 `77.12, -42.89` に非公開エリア 'Abyssal Vault 01' が発見されました。特定の条件下でのみゲートが開く仕様です。"
    title_en_m = "Marathon: Tau Ceti IV: Abyssal Vaults Coordinates Located"
    content_en_m = "Binary analysis of patch 1.0.6.2 has identified a hidden area 'Abyssal Vault 01' at coordinates `77.12, -42.89`. Access requires specific mission flags."
    
    m_notifier.notify_raw_intel(
        title_ja_m, content_ja_m, title_en_m, content_en_m,
        webhook_url=os.getenv("ABYSSAL_WEBHOOK_URL")
    )
    
    # 2. FFXIV 8.0 Deep Intel -> FF14 Channel (via Bot Token)
    title_ja_f = "FFXIV 8.0 『白銀のワンダラー / Evercold』正式発表詳細"
    content_ja_f = "ファンフェス2026にて『エヴァンゲリオン』コラボレイドおよび新システム『エボリューション・モード』が発表。2027年1月発売予定。"
    title_en_f = "FFXIV 8.0 'Evercold / Argent Wanderer' Official Details"
    content_en_f = "Fan Fest 2026 confirmed 'Evangelion' Alliance Raid and 'Evolution Mode' for jobs. Scheduled for January 2027 release."
    
    # Use raw formatting manually since notify_raw_intel in templates is for Webhooks
    raw_content_f = f"### {title_ja_f} / {title_en_f}\n\n"
    raw_content_f += f"**[JP]**\n{content_ja_f}\n\n"
    raw_content_f += f"**[EN]**\n{content_en_f}\n"
    raw_content_f += "---\n"
    
    await f_notifier.send_message(raw_content_f, channel_id=1499070875251769557)
    
    print("[+] Dispatched to both Abyssal and FF14 channels correctly.")

if __name__ == "__main__":
    asyncio.run(post_deep_raw_intel_correct_routing())
