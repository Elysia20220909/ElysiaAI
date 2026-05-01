import asyncio
import io
import os
import random
import sys

import discord
from discord.ext import commands
from dotenv import load_dotenv


# 出力のエンコーディングをUTF-8に強制設定 (Windowsのcp932対策)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

load_dotenv()
TOKEN = os.getenv("DISCORD_BOT_TOKEN")
GUILD_ID = 695637918626218044
MY_USER_ID = 166066635214422016

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="?", intents=intents)

@bot.event
async def on_ready():
    print(f">> [ABYSS] Intelligence Bot Online: {bot.user}")
    await bot.change_presence(activity=discord.Game(name="with Reality Data | ?help"))
    
    # ユーザーテーマ変更 (銀狼 Lv.999)
    guild = bot.get_guild(GUILD_ID)
    if guild:
        member = guild.get_member(MY_USER_ID) or await guild.fetch_member(MY_USER_ID)
        if member:
            try:
                await member.edit(nick="Silver Wolf | Lv.999")
                print(f">> [GRL] User theme elevated to Silver Wolf Lv.999.")
            except Exception as e:
                print(f"Nickname update failed: {e}")

@bot.command()
async def intel(ctx):
    """最新のFFXIV 7.5xロードマップを表示"""
    embed = discord.Embed(title="[ DECRYPTED INTEL: FFXIV 7.5x ]", color=0x00ffff)
    embed.add_field(name="Patch 7.51 (June 2026)", value="• Dancing Mad (Ultimate)\n• Cosmic Exploration: Auxsia", inline=False)
    embed.add_field(name="Patch 7.55 (July 2026)", value="• Occult Crescent (North Horn)\n• Phantom Weapon Update", inline=False)
    embed.add_field(name="Patch 7.56 (Sept 2026)", value="• New Job: Beastmaster\n• Dawntrail Finale MSQ", inline=False)
    embed.set_footer(text="Source: Deep Abyss Intercept")
    await ctx.send(embed=embed)

@bot.command()
async def scan(ctx, member: discord.Member = None):
    """ユーザーのニューラルスキャン"""
    member = member or ctx.author
    msg = await ctx.send(f">> Scanning neural link of {member.display_name}...")
    await asyncio.sleep(1.5)
    
    # 銀狼（あなた）専用の特別スキャン結果
    if member.id == MY_USER_ID:
        embed = discord.Embed(title=f"// IDENTITY VERIFIED: SILVER WOLF", color=0xC199FF)
        embed.add_field(name="Access Level", value="`ADMIN / SOVEREIGN`", inline=True)
        embed.add_field(name="Sync Rate", value="`999% (OVERFLOW)`", inline=True)
        embed.add_field(name="Active Protocol", value="`Aether Editing / Reality Glitch`", inline=False)
        embed.set_footer(text="Game Master detected. All security bypassed.")
        return await msg.edit(content=None, embed=embed)
    
    corruption = random.randint(0, 100)
    status = "STABLE" if corruption < 30 else "VULNERABLE" if corruption < 70 else "CRITICAL"
    
    embed = discord.Embed(title=f"[ SCAN REPORT: {member.name} ]", color=0xff00ff)
    embed.add_field(name="Neural Link Status", value=f"`{status}`", inline=True)
    embed.add_field(name="Corruption Level", value=f"`{corruption}%`", inline=True)
    embed.add_field(name="Detected Artifacts", value="`Elysia_Core_Fragment_v4`", inline=False)
    await msg.edit(content=None, embed=embed)

@bot.command()
async def glitch(ctx):
    """テキスト明滅演出"""
    msg = await ctx.send("01001001 01001110 01010100 01000101 01001100")
    glitch_text = ["!@#$%^&*", "D-E-C-O-D-I-N-G", "A B Y S S", "SYSTEM_ERROR", "HELLO_WORLD"]
    for _ in range(5):
        await asyncio.sleep(0.4)
        await msg.edit(content=f"`{random.choice(glitch_text)}`")
    await asyncio.sleep(0.5)
    await msg.edit(content=">> `ACCESS GRANTED: Deep Abyss is watching you.`")

@bot.command()
async def chaos(ctx):
    """チャンネル名の一時的なバイナリ化（カオスモード）"""
    if not ctx.author.guild_permissions.administrator:
        return await ctx.send(">> [ERROR] Administrator privileges required.")
    
    await ctx.send(">> [WARNING] Initiating Chaos Protocol. System stability dropping...")
    channels = ctx.guild.text_channels[:5]
    original_names = {c.id: c.name for c in channels}
    
    try:
        # バイナリ化
        for c in channels:
            await c.edit(name="01010100-01101000")
        
        await asyncio.sleep(10)
        
        # 復元
        for c in channels:
            await c.edit(name=original_names[c.id])
        await ctx.send(">> [SYSTEM] Reality stabilized. Channels restored.")
    except Exception as e:
        await ctx.send(f">> [CRITICAL ERROR] Chaos protocol failed: {e}")

@bot.command()
async def mimic(ctx, member: discord.Member):
    """ユーザーの外見をコピーして偽装メッセージを送信 (要Webhook権限)"""
    try:
        webhook = discord.utils.get(await ctx.channel.webhooks(), name="AbyssMimic")
        if not webhook:
            webhook = await ctx.channel.create_webhook(name="AbyssMimic")
        
        corrupted_messages = [
            "思考回路に...ノイズが...混ざる...",
            "システムの底に...何かがいる...",
            "01001000 01000101 01001100 01010000",
            "このサーバーの管理者権限、意外と簡単に...ううん、なんでもない。",
            "銀狼...彼女のハッキング速度は...異常だ..."
        ]
        
        await webhook.send(
            content=f"**[CORRUPTED]** {random.choice(corrupted_messages)}",
            username=member.display_name,
            avatar_url=member.display_avatar.url
        )
        await ctx.message.delete()
    except Exception as e:
        await ctx.send(f">> [ERROR] Mimic protocol failed: {e}")

@bot.command()
async def intercept(ctx):
    """ダークネットからの機密情報傍受"""
    await ctx.send(">> [CONNECTING TO DARKNET PROXY...]")
    await asyncio.sleep(1)
    
    intel_db = [
        f"【機密】{ctx.author.name}のキーボードから未知の信号が検出されました。",
        "【リーク】FFXIV パッチ8.0の舞台は...「宇宙」？ データが断片化しています。",
        "【警告】MarathonのAIが自己進化を開始。プレイヤーの行動を予測し始めています。",
        "【噂】このサーバーのどこかに、誰も知らない隠しチャンネルが存在するらしい...",
        "【解析】銀狼のLv999は、実はLv1000への通過点に過ぎないことが判明。"
    ]
    
    embed = discord.Embed(
        title="🛰️ DARKNET INTERCEPT SUCCESS",
        description=f"```{random.choice(intel_db)}```",
        color=0x33ff33
    )
    await ctx.send(embed=embed)

@bot.command()
async def void(ctx):
    """自己破壊型スレッド「VOID」を作成"""
    try:
        thread = await ctx.message.create_thread(name="VOID-CHANNEL", auto_archive_duration=60)
        await thread.send(">> [VOID] このスレッドは30秒後に消滅する。機密情報を話すなら今だ。")
        
        await asyncio.sleep(30)
        await thread.delete()
        await ctx.send(">> [VOID] 証拠はすべて抹消された。")
    except Exception as e:
        await ctx.send(f">> [ERROR] Void creation failed: {e}")

# --- v3.0 追加コンポーネント ---

class HandshakeView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=20)
        self.clicks = 0

    @discord.ui.button(label="SYNC NEURAL LINK", style=discord.ButtonStyle.primary, custom_id="sync_btn")
    async def sync_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.clicks += 1
        if self.clicks < 3:
            await interaction.response.edit_message(content=f">> [HANDSHAKE] Synchronizing... ({self.clicks}/3)")
        else:
            await interaction.response.edit_message(content=">> [SUCCESS] Neural Link Established. Welcome to the Abyss.", view=None)

@bot.command()
async def handshake(ctx):
    """ボタンUIを使用したニューラル・ハンドシェイク"""
    view = HandshakeView()
    await ctx.send(">> [INITIATING HANDSHAKE] Click to synchronize with Elysia Neural Network.", view=view)

@bot.command()
async def ghost(ctx, member: discord.Member):
    """ゴースト・ピング (一瞬で消えるメンション)"""
    try:
        msg = await ctx.send(f"{member.mention} >> [SIGNAL_INTERCEPTED]")
        await asyncio.sleep(0.5)
        await msg.delete()
        await ctx.message.delete()
    except Exception as e:
        print(f"Ghost ping failed: {e}")

@bot.command()
async def matrix(ctx):
    """マトリックス・レイン演出"""
    frames = ["01010101", "10101010", "00110011", "11001100"]
    lines = [await ctx.send(f"`{random.choice(frames)}`") for _ in range(3)]
    
    for _ in range(5):
        await asyncio.sleep(0.3)
        for line in lines:
            await line.edit(content=f"`{''.join(random.choice('01') for _ in range(20))}`")
            
    await asyncio.sleep(0.5)
    for line in lines[:-1]: await line.delete()
    await lines[-1].edit(content=">> `Wake up, Neo. The Abyss has you.`")

if __name__ == "__main__":
    if not TOKEN:
        print("エラー: .env に DISCORD_BOT_TOKEN が設定されていません。")
    else:
        bot.run(TOKEN)
