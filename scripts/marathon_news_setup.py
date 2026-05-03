import discord
import os
import asyncio
import sys
import io
from dotenv import load_dotenv

# 出力のエンコーディングをUTF-8に強制設定 (Windowsのcp932対策)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

load_dotenv()
TOKEN = os.getenv("DISCORD_BOT_TOKEN")
GUILD_ID = 695637918626218044

async def setup_marathon_news():
    intents = discord.Intents.all()
    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        print(f">> [NEWS] Bot Online: {client.user}")
        guild = client.get_guild(GUILD_ID) or await client.fetch_guild(GUILD_ID)
        if not guild:
            print(">> [ERROR] Guild not found.")
            await client.close()
            return

        # 1. チャンネルの作成
        category = discord.utils.get(guild.categories, name="▬▬▬ 深淵領域: ABYSS ▬▬▬")
        channel_name = "trahit-intelligence-hub"
        
        channel = discord.utils.get(guild.text_channels, name=channel_name)
        if not channel:
            channel = await guild.create_text_channel(channel_name, category=category)
            print(f">> [NEWS] Created channel: {channel_name}")
        else:
            print(f">> [NEWS] Channel {channel_name} already exists.")

        # 2. 最新ニュースのデプロイ (2026-05-01 最新情報)
        news_items = [
            {
                "title": "MARATHON UPDATE 1.0.6.2 [LIVE]", 
                "body": "Bungie has deployed update 1.0.6.2 to the Trahit sector. Fixes to neural link stability and weapon balance for the 'Viper' class SMG have been confirmed.", 
                "source": "Bungie.net / GameRant (2026-05-01)"
            },
            {
                "title": "BLUESKY FEED INTERCEPT: RUNNER GEAR", 
                "body": "Leaked screenshots of the 'Abyssal Shroud' gear set have appeared on BlueSky. High-reflectivity armor with integrated neural dampeners detected.", 
                "source": "BlueSky / @MarathonUpdates"
            },
            {
                "title": "SECTOR ALERT: TRAHIT STATION 04", 
                "body": "Increased hostile activity reported near the central extraction zone. Runners are advised to overcharge their batteries before deployment.", 
                "source": "Internal Intelligence"
            }
        ]

        # 3. ニュースの投下
        print(">> [NEWS] Initiating intelligence drop...")
        for item in news_items:
            embed = discord.Embed(title=f"// INTERCEPTED: {item['title']}", color=0xffff00)
            embed.description = f"```{item['body']}```"
            embed.set_footer(text=f"Source: {item['source']} | Abyss Protocol")
            embed.set_thumbnail(url="https://i.imgur.com/7vYp1zH.png")
            await channel.send(embed=embed)
            await asyncio.sleep(1.5)

        # 4. Joyeuse設定ガイド
        guide_embed = discord.Embed(
            title="🛠️ AUTOMATION CONFIGURATION REQUIRED",
            description=f"このチャンネルで継続的に最新ニュースを受け取るには、<@{1478451717623386256}> の設定を完了させてください。",
            color=0x00ffff
        )
        guide_embed.add_field(name="Step 1", value="`/settings` を入力し、Webパネルを開きます。", inline=False)
        guide_embed.add_field(name="Step 2", value="**Notifications** 項目で、このチャンネルをターゲットに設定します。", inline=False)
        guide_embed.add_field(name="Step 3", value="Bungie News / BlueSky Feed を **ENABLED** にします。", inline=False)
        await channel.send(embed=guide_embed)

        print(">> [NEWS] Initial intelligence drop complete.")
        await client.close()

    if not TOKEN:
        print("エラー: .env に DISCORD_BOT_TOKEN が設定されていません。")
    else:
        await client.start(TOKEN)

if __name__ == "__main__":
    asyncio.run(setup_marathon_news())
