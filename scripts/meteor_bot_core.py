import os
import discord
from discord.ext import commands, tasks
from dotenv import load_dotenv
import psutil
import datetime

# ==========================================
# METEOR#6267 CORE PERSONA
# ==========================================

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
APP_ID = os.getenv("DISCORD_APP_ID")
PUBLIC_KEY = os.getenv("DISCORD_PUBLIC_KEY")

INTENTS = discord.Intents.default()
INTENTS.message_content = True

bot = commands.Bot(command_prefix="!", intents=INTENTS)

# --- Status Tracking ---
START_TIME = datetime.datetime.now()

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user.name} ({bot.user.id})")
    print(f"Application ID: {APP_ID}")
    print("--- METEOR#6267: SOVEREIGN_SENTINEL_ONLINE ---")
    heartbeat.start()
    
    # Set Presence
    activity = discord.Activity(type=discord.ActivityType.watching, name="Sovereign Sentinel Core")
    await bot.change_presence(status=discord.Status.online, activity=activity)

@tasks.loop(minutes=30)
async def heartbeat():
    """定期的な生存確認とステータス報告"""
    channel_id = os.getenv("DISCORD_MONITOR_CHANNEL_ID")
    if channel_id:
        channel = bot.get_channel(int(channel_id))
        if channel:
            embed = discord.Embed(
                title="🛰️ METEOR#6267: SYSTEM_HEARTBEAT",
                description="Sovereign Sentinel 稼働中。全てのシステムは正常です。",
                color=0x00FF41,
                timestamp=datetime.datetime.now()
            )
            embed.add_field(name="Uptime", value=str(datetime.datetime.now() - START_TIME).split('.')[0])
            embed.add_field(name="CPU Usage", value=f"{psutil.cpu_percent()}%")
            embed.add_field(name="Memory", value=f"{psutil.virtual_memory().percent}%")
            embed.set_footer(text="Meteor#6267 // ElysiaAI Sovereign Core")
            await channel.send(embed=embed)

@bot.command()
async def status(ctx):
    """システムの詳細ステータスを表示"""
    embed = discord.Embed(
        title="🛡️ Sovereign System Integrity Report",
        color=0x00FF41
    )
    embed.add_field(name="Entity", value="Meteor#6267", inline=True)
    embed.add_field(name="Status", value="ACTIVE / ZERO_ERROR", inline=True)
    embed.add_field(name="Kernel", value="ElysiaAI v58+", inline=True)
    
    # Process check
    processes = len(psutil.pids())
    embed.add_field(name="Active Processes", value=str(processes), inline=True)
    
    await ctx.send(embed=embed)

@bot.command()
async def resonance(ctx):
    """共鳴周波数のチェック (演出用)"""
    await ctx.send("📡 共鳴周波数を確認中... 432Hz 同調完了。システム整合性 100%。")

if __name__ == "__main__":
    if TOKEN:
        bot.run(TOKEN)
    else:
        print("[!] ERROR: DISCORD_TOKEN is not set in environment variables.")
