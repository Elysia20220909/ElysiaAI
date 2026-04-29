import discord
import os
from dotenv import load_dotenv

load_dotenv()
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")

async def check_channel():
    intents = discord.Intents.default()
    client = discord.Client(intents=intents)
    
    async with client:
        await client.login(BOT_TOKEN)
        # 1. Check Marathon
        ch1 = await client.fetch_channel(1499058397734109295)
        print(f"ID 1499058397734109295: #{ch1.name}")
        
        # 2. Check FF14
        ch2 = await client.fetch_channel(1499070875251769557)
        print(f"ID 1499070875251769557: #{ch2.name}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(check_channel())
