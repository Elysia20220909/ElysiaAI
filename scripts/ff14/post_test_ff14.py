import os
import asyncio
from ff14_notifier import FF14Notifier

async def post_test_ff14():
    notifier = FF14Notifier()
    
    print("[*] Executing FF14 POSTING TEST (No Frame / Raw Text)...")
    
    title_ja = "【投稿テスト】FF14 外部インテル受信プロトコル"
    content_ja = "これは新しく設定された FF14 専用 Webhook による配信テストです。枠なしのプレーンテキスト形式が正常に機能しているか確認してください。"
    title_en = "[TEST POST] FF14 External Intel Reception Protocol"
    content_en = "This is a delivery test using the newly configured FF14-specific Webhook. Please verify that the 'No Frame' plain text format is functioning correctly."
    
    raw_content = f"### {title_ja} / {title_en}\n\n"
    raw_content += f"**[JP]**\n{content_ja}\n\n"
    raw_content += f"**[EN]**\n{content_en}\n"
    raw_content += "---"
    
    await notifier.send_message(raw_content)
    print("[+] FF14 Posting Test complete.")

if __name__ == "__main__":
    asyncio.run(post_test_ff14())
