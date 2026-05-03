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
JOYEUSE_ID = 1478451717623386256
TARGET_CHANNEL_ID = 1478425018898841701
GUILD_ID = 695637918626218044

async def integrate_joyeuse():
    intents = discord.Intents.all()
    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        print(f">> [INTEGRATION] Bot Online: {client.user}")
        guild = client.get_guild(GUILD_ID) or await client.fetch_guild(GUILD_ID)
        channel = client.get_channel(TARGET_CHANNEL_ID) or await client.fetch_channel(TARGET_CHANNEL_ID)
        
        if guild and channel:
            try:
                # 1. Joyeuseにロールを付与
                joyeuse = guild.get_member(JOYEUSE_ID) or await guild.fetch_member(JOYEUSE_ID)
                if joyeuse:
                    # 専用ロールの作成・付与
                    role_name = "Neural Support Unit"
                    role = discord.utils.get(guild.roles, name=role_name)
                    if not role:
                        role = await guild.create_role(name=role_name, color=discord.Color.gold(), hoist=True)
                        print(f">> [INTEGRATION] Created new role: {role_name}")
                    
                    await joyeuse.add_roles(role)
                    print(f">> [INTEGRATION] Role '{role_name}' assigned to Joyeuse.")

                    # 2. 同期宣言メッセージ
                    embed = discord.Embed(
                        title="[ JOYEUSE INTELLIGENCE INTERFACE: ONLINE ]",
                        description=f"Bungieの戦術知性体 **Joyeuse** (<@{JOYEUSE_ID}>) との同期を確立しました。\nこれより、トラヒト（Trahit）からの信号はすべて深淵プロトコルによって強化されます。",
                        color=0xffee00 # Marathonイエロー
                    )
                    embed.add_field(name="Link Status", value="`STABLE / ENHANCED`", inline=True)
                    embed.add_field(name="Data Source", value="`Bungie.net / BlueSky`", inline=True)
                    embed.set_thumbnail(url=joyeuse.display_avatar.url)
                    embed.set_footer(text="ElysiaAI x Silver Wolf x Joyeuse Collaboration")
                    
                    await channel.send(embed=embed)
                    print(">> [INTEGRATION] Synchronization message sent.")
                else:
                    print(f">> [ERROR] Joyeuse (ID: {JOYEUSE_ID}) not found in server.")
            except Exception as e:
                print(f">> [CRITICAL ERROR] Integration failed: {e}")

        await client.close()

    if not TOKEN:
        print("エラー: .env に DISCORD_BOT_TOKEN が設定されていません。")
    else:
        await client.start(TOKEN)

if __name__ == "__main__":
    asyncio.run(integrate_joyeuse())
