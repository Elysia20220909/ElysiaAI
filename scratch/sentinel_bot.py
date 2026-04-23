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
# SOVEREIGN SENTINEL BOT CONFIGURATION
# ==========================================
# NOTE: Requires a Discord Bot Token, NOT a Webhook URL
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")

# Channel ID where the bot should post automatic updates
# You need to set this in your .env like: NOTIFICATION_CHANNEL_ID=1234567890
NOTIFICATION_CHANNEL_ID = int(os.getenv("NOTIFICATION_CHANNEL_ID", 0))

STATE_FILE = "sentinel_bot_state.json"
POLL_INTERVAL = 60  # seconds

TWITTER_USERS = ["Ziegler_Dev", "BNGServerStatus", "MarathonTheGame"]
YOUTUBE_CHANNELS = [{"name": "MarathonTheGame", "id": "UCBsbrudhKRrT9zs8iNOEjjw"}]
MARATHON_HELP_API = "https://help.marathonthegame.com/hc/api/internal/recent_activities?locale=en-us"

# ==========================================
# DISCORD BOT SETUP
# ==========================================
intents = discord.Intents.default()
# 👇 これが「チャットのメッセージを読み取る」ために必須の設定です
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)


# ==========================================
# SCRAPERS (再利用)
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
    # ... 省略（既存の処理と同じ）...
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
# BOT EVENTS
# ==========================================
@bot.event
async def on_ready():
    print("Bot is Ready!")
    # Botのステータスを設定（例：「Marathonをプレイ中」）
    await bot.change_presence(activity=discord.Game(name="Marathon"))
    # 定期実行タスクを開始
    marathon_sentinel_task.start()


@bot.event
async def on_message(message):
    # 自分自身の発言には反応しない
    if message.author == bot.user:
        return

    # メッセージを小文字にしてキーワードが含まれているかチェック
    content_lower = message.content.lower()

    # 特定のキーワード「Ziegler」に反応する
    if "ziegler" in content_lower:
        await message.channel.send("🤖 Sovereign Sentinel: Zieglerディレクターの最新情報をスキャン中...")
        # 実際にTwitterをチェックして結果を返す例
        item = fetch_twitter("Ziegler_Dev")
        if item:
            embed = discord.Embed(title=f"最新のZieglerの動向: {item['title']}", url=item["link"], color=item["color"])
            await message.channel.send(embed=embed)
        else:
            await message.channel.send("現在新しい情報は見つかりませんでした。")

    # Marathonという単語に反応させる例
    elif "marathon" in content_lower:
        await message.add_reaction("🏃")  # 絵文字でリアクション

    # スラッシュコマンド等も使えるようにするため必要
    await bot.process_commands(message)


# ==========================================
# BACKGROUND TASK (以前のWebhookの代わり)
# ==========================================
@tasks.loop(seconds=POLL_INTERVAL)
async def marathon_sentinel_task():
    if NOTIFICATION_CHANNEL_ID == 0:
        return

    channel = bot.get_channel(NOTIFICATION_CHANNEL_ID)
    if not channel:
        return

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
                description=f"**🇯🇵 日本語翻訳:**\n{translated or '翻訳不可'}",
                url=update["link"],
                color=update["color"],
                timestamp=datetime.now(UTC),
            )
            embed.set_author(name=update["source"])
            embed.set_footer(text="Sovereign Sentinel")
            if update.get("image"):
                embed.set_image(url=update["image"])

            content = ""
            if update["type"] == "Twitter":
                # Discord上で動画を直接再生できるように、vxtwitterのリンクをメッセージ本文に添える
                vx_link = update["link"].replace("x.com", "vxtwitter.com").replace("twitter.com", "vxtwitter.com")
                content = f"🎥 メディアリンク: {vx_link}"

            await channel.send(content=content, embed=embed)
            state[state_key] = update["guid"]

    with open(STATE_FILE, "w") as f:
        json.dump(state, f)


@marathon_sentinel_task.before_loop
async def before_task():
    await bot.wait_until_ready()


if __name__ == "__main__":
    if not DISCORD_BOT_TOKEN:
        print("エラー: DISCORD_BOT_TOKEN が設定されていません。")
    else:
        bot.run(DISCORD_BOT_TOKEN)
