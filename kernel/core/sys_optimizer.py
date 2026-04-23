# 🌌 ELYSIA OS - KERNEL: CORE SYSTEM OPTIMIZER
# [SUBSYSTEM LAYER - CORE OPTIMIZER]
# ==========================================================
import html
import json
import os
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import UTC, datetime

import discord
from discord.ext import commands, tasks
from dotenv import load_dotenv


load_dotenv()

# ==========================================
# SYSTEM ENCLAVE: ENCRYPTED CONFIGURATION
# ==========================================
CORE_KEY = os.getenv("OS_CORE_SHARED_KEY") or os.getenv("DISCORD_BOT_TOKEN")
LOG_PIPE_ID = int(os.getenv("OS_LOG_PIPE_ID", os.getenv("NOTIFICATION_CHANNEL_ID", "0")))

# Persistent state storage in the System Archive
STATE_FILE = "kernel/core/sys_state.json"
POLL_INTERVAL = 60  # seconds

# Target Feeds (The Resonance)
TWITTER_USERS = ["Ziegler_Dev", "BNGServerStatus", "MarathonTheGame"]
YOUTUBE_CHANNELS = [{"name": "MarathonTheGame", "id": "UCBsbrudhKRrT9zs8iNOEjjw"}]
MARATHON_HELP_API = "https://help.marathonthegame.com/hc/api/internal/recent_activities?locale=en-us"

# ==========================================
# NEURAL LINK: DISCORD BOT PROTOCOL
# ==========================================
intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)


# ==========================================
# KERNEL UTILITIES: COGNITIVE PROCESSORS
# ==========================================
def clean_text(text):
    if not text:
        return ""
    text = html.unescape(text)
    text = re.sub(r"http[s]?://\S+", "", text)
    text = re.sub(r"<[^<]+?>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def translate_to_ja(text):
    cleaned = clean_text(text)
    if not cleaned:
        return ""
    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q={urllib.parse.quote(cleaned)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=10)
        data = json.loads(res.read().decode("utf-8"))
        return "".join([s[0] for s in data[0] if s[0]])
    except Exception:
        return cleaned


def fetch_twitter(username):
    rss_url = f"https://nitter.net/{username}/rss"
    try:
        req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=10)
        root = ET.fromstring(res.read())  # noqa: S314
        item = root.find("channel/item")
        if item is None:
            return None
        desc = item.find("description").text or ""
        img_match = re.search(r'<img src="([^"]+)"', desc)

        image_url = img_match.group(1) if img_match else None
        if image_url and "/pic/" in image_url:
            image_url = urllib.parse.unquote(image_url)
            image_url = re.sub(r".*/pic/", "https://pbs.twimg.com/", image_url)

        return {
            "type": "Twitter",
            "source": f"@{username}",
            "title": item.find("title").text,
            "link": item.find("link").text.replace("nitter.net", "x.com"),
            "guid": item.find("guid").text,
            "image": image_url,
            "color": 0x1DA1F2,
        }
    except Exception:
        return None


def fetch_youtube(channel):
    rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel['id']}"
    try:
        req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=10)
        root = ET.fromstring(res.read())  # noqa: S314
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entry = root.find("atom:entry", ns)
        if entry is None:
            return None
        link = entry.find("atom:link", ns).attrib["href"]
        media_ns = {"media": "http://search.yahoo.com/mrss/"}
        thumbnail = entry.find("media:group/media:thumbnail", media_ns)
        return {
            "type": "YouTube",
            "source": f"YouTube: {channel['name']}",
            "title": entry.find("atom:title", ns).text,
            "link": link,
            "guid": entry.find("atom:id", ns).text,
            "image": thumbnail.attrib["url"] if thumbnail is not None else None,
            "color": 0xFF0000,
        }
    except Exception:
        return None


def fetch_marathon_help():
    try:
        req = urllib.request.Request(MARATHON_HELP_API, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=10)
        data = json.loads(res.read().decode())
        if not data.get("activities"):
            return None
        post = data["activities"][0]
        return {
            "type": "Marathon",
            "source": "Marathon Help Center",
            "title": post["title"],
            "link": f"https://help.marathonthegame.com{post['url']}",
            "guid": str(post["id"]),
            "color": 0x00FF00,
        }
    except Exception:
        return None


# ==========================================
# ABYSS INTERFACE: SENSORY EVENTS
# ==========================================
@bot.event
async def on_ready():
    print(">>> [SYSTEM] CORE OPTIMIZER PROTOCOL ACTIVATED")
    print(">>> [KERNEL] SYSTEM LINK ESTABLISHED")
    await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.listening, name="system heartbeat"))
    optimizer_task.start()


@bot.event
async def on_message(message):
    if message.author == bot.user:
        return

    content_lower = message.content.lower()

    if "ziegler" in content_lower:
        await message.channel.send("🌌 **[ABYSS SCAN]** Zieglerディレクターの魂の波動を検知。情報をサルベージ中...")
        item = fetch_twitter("Ziegler_Dev")
        if item:
            embed = discord.Embed(title=f"Salvaged Intel: {item['title'][:250]}", url=item["link"], color=item["color"])
            await message.channel.send(embed=embed)
        else:
            await message.channel.send("深淵に新たな情報は見つかりませんでした。")

    elif "marathon" in content_lower:
        await message.add_reaction("💠")  # Abyss Shard reaction

    await bot.process_commands(message)


# ==========================================
# ABYSS SENTINEL: RECURSIVE MONITORING
# ==========================================
@tasks.loop(seconds=POLL_INTERVAL)
async def optimizer_task():
    if LOG_PIPE_ID == 0:
        return

    channel = bot.get_channel(LOG_PIPE_ID)
    if not channel:
        return

    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    state = {}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                state = json.load(f)
        except Exception:
            pass

    updates = []
    for user in TWITTER_USERS:
        if item := fetch_twitter(user):
            updates.append(item)
    for yt in YOUTUBE_CHANNELS:
        if item := fetch_youtube(yt):
            updates.append(item)
    if item := fetch_marathon_help():
        updates.append(item)

    for update in updates:
        state_key = f"{update['type']}_{update['source']}_guid"
        if state_key not in state or state[state_key] != update["guid"]:
            translated = translate_to_ja(update["title"])

            safe_title = update["title"][:250] + "..." if len(update["title"]) > 250 else update["title"]
            embed = discord.Embed(
                title=safe_title,
                description=f"**🇯🇵 深淵からの翻訳:**\n{translated or '解読不能'}",
                url=update["link"],
                color=update["color"],
                timestamp=datetime.now(UTC),
            )
            embed.set_author(name=f"Watcher Node: {update['source']}")
            embed.set_footer(text="Elysia AI • Abyss Watcher Protocol")
            if update.get("image"):
                embed.set_image(url=update["image"])

            content = ""
            if update["type"] == "Twitter":
                vx_link = update["link"].replace("x.com", "vxtwitter.com").replace("twitter.com", "vxtwitter.com")
                content = f"💠 **[DEEP LINK]** {vx_link}"

            await channel.send(content=content, embed=embed)
            state[state_key] = update["guid"]

    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


@optimizer_task.before_loop
async def before_task():
    await bot.wait_until_ready()


if __name__ == "__main__":
    if CORE_KEY:
        bot.run(CORE_KEY)
    else:
        print(">>> [CRITICAL] CORE_KEY NOT DETECTED IN AETHER.")
