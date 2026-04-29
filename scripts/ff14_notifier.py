import os
import discord
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
FF14_CHANNEL_ID = 1499070875251769557

class FF14Notifier:
    def __init__(self, client=None):
        self.client = client

    async def send_message(self, content, channel_id=FF14_CHANNEL_ID):
        if not self.client:
            # Standalone mode
            intents = discord.Intents.default()
            async with discord.Client(intents=intents) as client:
                await client.login(BOT_TOKEN)
                channel = await client.fetch_channel(channel_id)
                await channel.send(content)
        else:
            channel = self.client.get_channel(channel_id)
            if channel:
                await channel.send(content)

    def format_terminal(self, title_en, title_ja, content_en, content_ja, source="Reddit", link=None):
        text = f"**💎 HYDAELYN CRYSTAL SCAN: CLANDESTINE INTEL**\n"
        text += f"**SOURCE:** {source} | **AUTH:** LEVEL 7\n"
        text += "--------------------------------------------------\n"
        text += f"**[JP] {title_ja}**\n{content_ja}\n\n"
        text += f"**[EN] {title_en}**\n{content_en}\n"
        text += "--------------------------------------------------\n"
        if link:
            text += f"**DATA LINK:** <{link}>\n"
        text += "---"
        return text

    async def notify_leak(self, title_en, title_ja, content_en, content_ja, source="Reddit", link=None):
        content = self.format_terminal(title_en, title_ja, content_en, content_ja, source, link)
        await self.send_message(content)

if __name__ == "__main__":
    # Test dispatch
    import asyncio
    notifier = FF14Notifier()
    
    test_title_en = "Dawntrail Early Access Datamine: New Mount Tiers"
    test_title_ja = "黄金のレガシー 先行アクセス解析: 新マウントのティア表"
    test_content_en = "Dataminers found references to high-altitude flight animations in the latest build."
    test_content_ja = "最新のビルドから、高高度飛行アニメーションに関する記述が発見されました。"
    
    asyncio.run(notifier.notify_leak(test_title_en, test_title_ja, test_content_en, test_content_ja, link="https://reddit.com/r/ffxiv"))
