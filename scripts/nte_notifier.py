import os
import discord
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
NTE_CHANNEL_ID = 1499218325614493840

class NTENotifier:
    """
    Neverness to Everness (NTE) thematic notification system.
    Focuses on Anomalous City intelligence and urban aesthetics.
    """
    
    COLORS = {
        "ANOMALY": 0x00F3FF,      # Neon Cyan
        "URBAN": 0xFF00E5,       # Cyber Pink
        "PORSCHE": 0xC0C0C0,     # Porsche Silver
        "SYSTEM": 0x212121       # Dark Grey
    }

    async def send_message(self, content=None, embed=None, channel_id=NTE_CHANNEL_ID):
        if not BOT_TOKEN:
            print("[-] No BOT_TOKEN found in environment.")
            return

        intents = discord.Intents.default()
        async with discord.Client(intents=intents) as client:
            await client.login(BOT_TOKEN)
            try:
                channel = await client.fetch_channel(channel_id)
                if embed:
                    await channel.send(content=content, embed=discord.Embed.from_dict(embed))
                else:
                    await channel.send(content=content)
                print(f"[+] NTE Intelligence dispatched to #{channel.name}")
            except Exception as e:
                print(f"[-] Failed to dispatch NTE signal: {e}")

    def format_terminal(self, title_en, title_ja, content_en, content_ja, source="City Monitor", link=None):
        text = f"**🌆 ANOMALOUS CITY SCAN: NTE INTELLIGENCE**\n"
        text += f"**SOURCE:** {source} | **STATUS:** ACTIVE\n"
        text += "==================================================\n"
        text += f"**[JP] {title_ja}**\n{content_ja}\n\n"
        text += f"**[EN] {title_en}**\n{content_en}\n"
        text += "==================================================\n"
        if link:
            text += f"**ACCESS LINK:** <{link}>\n"
        text += "---"
        return text

    def create_embed(self, title, description, color_key="ANOMALY", fields=None):
        embed = {
            "title": title,
            "description": description,
            "color": self.COLORS.get(color_key, 0x00F3FF),
            "fields": fields or [],
            "footer": {"text": "Project Everness | Sector: Hesperia"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        return embed

if __name__ == "__main__":
    # Test script
    import asyncio
    notifier = NTENotifier()
    content = notifier.format_terminal(
        "NTE Global Launch Successful",
        "NTE 世界同時リリース成功",
        "The city gates are open. Anomalous resonance detected across all platforms.",
        "都市の門が開かれました。全プラットフォームで異常共鳴が検出されています。",
        source="Hesperia HQ"
    )
    asyncio.run(notifier.send_message(content))
