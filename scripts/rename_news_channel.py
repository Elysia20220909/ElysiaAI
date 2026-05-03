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

async def rename_news_channel():
    intents = discord.Intents.all()
    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        print(f">> [RENAME] Bot Online: {client.user}")
        guild = client.get_guild(GUILD_ID) or await client.fetch_guild(GUILD_ID)
        
        if guild:
            # ターゲットチャンネルを検索
            target_name = "📡┃トラヒト機密情報局"
            channel = discord.utils.get(guild.text_channels, name=target_name)
            
            if channel:
                new_name = "📡┃marathon機密情報局"
                await channel.edit(name=new_name)
                print(f">> [RENAME] Channel '{target_name}' renamed to '{new_name}'.")
            else:
                print(f">> [ERROR] Channel '{target_name}' not found.")
        else:
            print(">> [ERROR] Guild not found.")

        await client.close()

    if not TOKEN:
        print("エラー: .env に DISCORD_BOT_TOKEN が設定されていません。")
    else:
        await client.start(TOKEN)

if __name__ == "__main__":
    asyncio.run(rename_news_channel())
