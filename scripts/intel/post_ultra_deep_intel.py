import os
import asyncio
from marathon_templates import MarathonNotifier
from ff14_notifier import FF14Notifier

async def post_ultra_deep_raw_intel():
    m_notifier = MarathonNotifier()
    f_notifier = FF14Notifier()
    
    print("[*] Accessing ULTRA-DEEP Abyssal Data Layer...")
    
    # 1. Marathon: The Mercy Secret
    title_ja_m = "Marathon: 『慈悲キット』と深淵の金庫の真実"
    content_ja_m = "データ解析により、隠し金庫 (Abyssal Vault) の解錠条件が判明。『敵ランナーを Mercy Kit で3回蘇生させる』ことで、金庫のゲートが開放されます。内部には特殊な称号と、ルークの過去に触れる音声ログが格納されています。"
    title_en_m = "Marathon: The Truth Behind 'Mercy Kits' and Abyssal Vaults"
    content_en_m = "Datamining confirms the unlocking condition for the Abyssal Vault: 'Revive enemy Runners 3 times using Mercy Kits' in a single match. Inside, players find exclusive titles and audio logs revealing the Rook's origins."
    
    m_notifier.notify_raw_intel(
        title_ja_m, content_ja_m, title_en_m, content_en_m,
        webhook_url=os.getenv("ABYSSAL_WEBHOOK_URL")
    )
    
    # 2. FFXIV 8.0: 『神なき領域』の内部コード
    title_ja_f = "FFXIV 8.0: 『神なき領域』内部ゾーンIDと新レイド"
    content_ja_f = "最新ビルドに『Zone_08_05_TheFourth』という鏡像世界のIDを発見。エヴァコラボレイドでは『ジオフロント』を模した特殊フィールドのリソースが確認されており、使徒との空中戦ギミックも実装予定。"
    title_en_f = "FFXIV 8.0: 'Godless Realms' Internal IDs and Raid Mechanics"
    content_en_f = "Internal Zone ID 'Zone_08_05_TheFourth' (The Fourth Reflection) has been identified. Eva Raid files include assets for a 'Geofront' style field and aerial combat mechanics against Angels."
    
    raw_content_f = f"### {title_ja_f} / {title_en_f}\n\n"
    raw_content_f += f"**[JP]**\n{content_ja_f}\n\n"
    raw_content_f += f"**[EN]**\n{content_en_f}\n"
    raw_content_f += "---\n"
    
    await f_notifier.send_message(raw_content_f, channel_id=1499070875251769557)
    
    print("[+] Ultra-Deep Intelligence dispatched to Abyssal and FF14 channels.")

if __name__ == "__main__":
    asyncio.run(post_ultra_deep_raw_intel())
