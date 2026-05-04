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
TARGET_CHANNEL_ID = 1478425018898841701
TARGET_USER_ID = 1478451717623386256
GUILD_ID = 695637918626218044

async def run_setup():
    intents = discord.Intents.all()
    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        print(f">> [SETUP] Bot Online: {client.user}")
        print(f">> [SETUP] Accessing Sector (Channel): {TARGET_CHANNEL_ID}")
        
        try:
            channel = client.get_channel(TARGET_CHANNEL_ID) or await client.fetch_channel(TARGET_CHANNEL_ID)
            guild = client.get_guild(GUILD_ID) or await client.fetch_guild(GUILD_ID)
            
            if channel and guild:
                # 1. ユーザーへの権限・ロール付与
                member = guild.get_member(TARGET_USER_ID) or await guild.fetch_member(TARGET_USER_ID)
                if member:
                    # ロールを取得
                    runner_role = discord.utils.get(guild.roles, name="Stellaron Hunter")
                    if not runner_role:
                        # なければ作成
                        runner_role = await guild.create_role(name="Stellaron Hunter", color=discord.Color.cyan())
                    
                    await member.add_roles(runner_role)
                    print(f">> [SETUP] Role '{runner_role.name}' applied to {member.name}")
                else:
                    print(f">> [WARNING] User {TARGET_USER_ID} not found in guild.")

                # 2. 初期化メッセージの送信
                embed = discord.Embed(
                    title="[ SYSTEM INITIALIZATION: COMPLETE ]",
                    description=f"このセクターは現在、深淵プロトコルの管理下に置かれました。\n対象ユーザー <@{TARGET_USER_ID}> のニューラル同期を完了。",
                    color=0x00ffff
                )
                embed.set_thumbnail(url="https://i.imgur.com/7vYp1zH.png")
                embed.add_field(name="Sector ID", value=f"`{TARGET_CHANNEL_ID}`", inline=True)
                embed.add_field(name="Sync Status", value="`OPTIMAL`", inline=True)
                embed.set_footer(text="ElysiaAI x Silver Wolf | Sector Setup")
                
                await channel.send(embed=embed)
                print(">> [SETUP] Channel initialization message sent.")
            else:
                print(">> [ERROR] Target channel or guild not found.")

        except Exception as e:
            print(f">> [CRITICAL ERROR] Setup failed: {e}")
        
        await client.close()

    if not TOKEN:
        print("エラー: .env に DISCORD_BOT_TOKEN が設定されていません。")
    else:
        await client.start(TOKEN)

if __name__ == "__main__":
    asyncio.run(run_setup())
