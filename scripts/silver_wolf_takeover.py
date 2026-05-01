import discord
from discord.ext import commands
import asyncio
import sys
import io

# 出力のエンコーディングをUTF-8に強制設定 (Windowsのcp932対策)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import os
from dotenv import load_dotenv

# .envから環境変数をロード
load_dotenv()

# --- CONFIGURATION ---
TOKEN = os.getenv("DISCORD_BOT_TOKEN")
GUILD_ID = 695637918626218044
MY_USER_ID = 166066635214422016
IMAGE_PATH = r"C:\Users\hosih\.gemini\antigravity\brain\96f00790-704b-432b-8f50-674a1972d662\elysia_silverwolf_abyss_collab_1777640812168.png"

# --- AESTHETICS ---
PURPLE = "\033[38;5;141m"
CYAN = "\033[38;5;51m"
MAGENTA = "\033[38;5;198m"
RESET = "\033[0m"

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="?", intents=intents)

async def typing_effect(text, color=RESET, delay=0.03):
    for char in text:
        sys.stdout.write(color + char + RESET)
        sys.stdout.flush()
        await asyncio.sleep(delay)
    print()

@bot.event
async def on_ready():
    await typing_effect(f">> [SYSTEM] ACCESS GRANTED: User {bot.user}", PURPLE)
    
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        print(f"エラー: サーバー(ID: {GUILD_ID})が見つかりません。")
        await bot.close()
        return

    await typing_effect(f">> [ABYSS] Initiating Elysia x Silver Wolf Collaboration...", MAGENTA)

    # 1. サーバー名の改変 & アイコン設定
    new_name = "〔 ᴀʙʏss_ᴘʀᴏᴛᴏᴄᴏʟ_999 〕"
    await guild.edit(name=new_name)
    
    if os.path.exists(IMAGE_PATH):
        with open(IMAGE_PATH, 'rb') as f:
            await guild.edit(icon=f.read())
        await typing_effect(f">> Server Icon Updated: Deep Abyss Visual Uploaded.", MAGENTA)

    # 2. ロール作成 & カテゴリ作成
    category_name = "▬▬▬ 深淵領域: ABYSS ▬▬▬"
    category = discord.utils.get(guild.categories, name=category_name)
    if not category:
        category = await guild.create_category(name=category_name)
        await typing_effect(f">> Abyss Territory Carved Out.", MAGENTA)

    # 3. 自分に権限付与
    me = guild.get_member(MY_USER_ID) or await guild.fetch_member(MY_USER_ID)
    if me:
        admin_role = discord.utils.get(guild.roles, name="Lv.999 Hacker")
        if admin_role:
            await me.add_roles(admin_role)

    # 4. チャンネルのリネーム & カテゴリ移動
    hacker_names = ["satellite-uplink", "neural-sync", "encrypted-vault", "protocol-omega"]
    for i, channel in enumerate(guild.text_channels):
        if i < len(hacker_names):
            await channel.edit(name=hacker_names[i], category=category)
            await typing_effect(f">> Syncing channel: #{hacker_names[i]} into Abyss category.", CYAN, 0.01)

    # 5. コラボレーション開始メッセージ (画像付き)
    target_channel = guild.text_channels[0]
    embed = discord.Embed(
        title="[ ABYSS COLLABORATION: ONLINE ]",
        description="「ElysiaAIと銀狼、二つの知性が深淵で交わった。これでもう、逃げ場なんてどこにもないよ？」",
        color=0xFF00FF
    )
    embed.add_field(name="Protocol", value="`ABYSS_OVERRIDE_V2`", inline=True)
    embed.add_field(name="Security", value="`BROKEN`", inline=True)
    embed.set_footer(text="ElysiaAI x Silver Wolf Collaboration - Level 999")
    
    if os.path.exists(IMAGE_PATH):
        file = discord.File(IMAGE_PATH, filename="abyss_collab.png")
        embed.set_image(url="attachment://abyss_collab.png")
        await target_channel.send(file=file, embed=embed)
    else:
        await target_channel.send(embed=embed)

    await typing_effect("\n>> [ABYSS] Collaboration finalized. Reality has been overwritten.", MAGENTA)
    await bot.close()

if __name__ == "__main__":
    if not TOKEN:
        print("エラー: .env に DISCORD_BOT_TOKEN が設定されていません。")
    else:
        bot.run(TOKEN)
