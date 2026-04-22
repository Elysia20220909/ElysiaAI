import html
import json
import os
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import UTC, datetime


# ==========================================
# SOVEREIGN SENTINEL CONFIGURATION
# ==========================================
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")
STATE_FILE = "sentinel_state.json"
POLL_INTERVAL = 60  # seconds

TWITTER_USERS = ["Ziegler_Dev", "BNGServerStatus", "MarathonTheGame"]
YOUTUBE_CHANNELS = [{"name": "MarathonTheGame", "id": "UCBsbrudhKRrT9zs8iNOEjjw"}]
MARATHON_HELP_API = "https://help.marathonthegame.com/hc/api/internal/recent_activities?locale=en-us"

# ==========================================
# CORE UTILITIES
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
    except Exception as e:
        print(f"[!] Translation Error: {e}")
        return cleaned


def send_discord_embed(title, description, url, source_name, color, fields=None, image_url=None):
    """
    Sends a high-fidelity Discord embed for a 'bot-like' appearance.
    """
    timestamp = datetime.now(UTC).isoformat().replace("+00:00", "Z")

    embed = {
        "title": title,
        "description": description,
        "url": url,
        "color": color,
        "timestamp": timestamp,
        "footer": {
            "text": f"Sovereign Sentinel • {source_name}",
            "icon_url": "https://raw.githubusercontent.com/google/material-design-icons/master/png/action/visibility/mw24.png",
        },
        "author": {
            "name": source_name,
            "icon_url": "https://raw.githubusercontent.com/google/material-design-icons/master/png/social/notifications_active/mw24.png",
        },
    }

    if fields:
        embed["fields"] = fields

    if image_url:
        embed["image"] = {"url": image_url}

    payload = {
        "username": "Marathon Sentinel",
        "avatar_url": "https://raw.githubusercontent.com/google/material-design-icons/master/png/action/settings_input_antenna/mw24.png",
        "embeds": [embed],
    }

    req = urllib.request.Request(
        DISCORD_WEBHOOK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "SovereignSentinel/1.0"},
    )

    try:
        urllib.request.urlopen(req)
        time.sleep(1)  # Rate limit protection
    except Exception as e:
        print(f"[!] Discord Webhook Error: {e}")


# ==========================================
# SCRAPERS
# ==========================================


def fetch_twitter(username):
    rss_url = f"https://nitter.net/{username}/rss"
    try:
        req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=10)
        root = ET.fromstring(res.read())  # noqa: S314
        item = root.find("channel/item")
        if item is None:
            return None

        title = item.find("title").text
        link = item.find("link").text.replace("nitter.net", "x.com")
        guid = item.find("guid").text

        desc = item.find("description").text or ""
        img_match = re.search(r'<img src="([^"]+)"', desc)
        image_url = img_match.group(1) if img_match else None

        return {
            "type": "Twitter",
            "source": f"@{username}",
            "title": title,
            "link": link,
            "guid": guid,
            "image": image_url,
            "color": 0x1DA1F2,
        }
    except Exception as e:
        print(f"[!] Twitter Fetch Error ({username}): {e}")
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

        title = entry.find("atom:title", ns).text
        link = entry.find("atom:link", ns).attrib["href"]
        guid = entry.find("atom:id", ns).text

        is_shorts = "/shorts/" in link
        source_label = f"YouTube: {channel['name']}"
        if is_shorts:
            source_label = f"YouTube Shorts: {channel['name']}"

        # Extract Thumbnail from media:group
        media_ns = {"media": "http://search.yahoo.com/mrss/"}
        thumbnail = entry.find("media:group/media:thumbnail", media_ns)
        image_url = thumbnail.attrib["url"] if thumbnail is not None else None

        return {
            "type": "YouTube",
            "source": source_label,
            "title": title,
            "link": link,
            "guid": guid,
            "image": image_url,
            "color": 0xFF0000,
        }
    except Exception as e:
        print(f"[!] YouTube Fetch Error ({channel['name']}): {e}")
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
    except Exception as e:
        print(f"[!] Marathon Fetch Error: {e}")
        return None


# ==========================================
# MAIN EXECUTION
# ==========================================


def main():
    print(">>> Marathon Sentinel v1.2 Initializing...")
    print(f"[*] Target Webhook: {DISCORD_WEBHOOK_URL[:40]}...")
    print(f"[*] Polling Interval: {POLL_INTERVAL}s")
    state = {}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                state = json.load(f)
        except Exception:
            pass

    # Initial Signal
    send_discord_embed(
        "Sentinel Online",
        "The Sovereign Sentinel has been activated and is now monitoring target feeds.",
        None,
        "System",
        0x5865F2,
    )

    while True:
        updates = []

        # Check Twitter
        for user in TWITTER_USERS:
            item = fetch_twitter(user)
            if item:
                updates.append(item)

        # Check YouTube
        for yt in YOUTUBE_CHANNELS:
            item = fetch_youtube(yt)
            if item:
                updates.append(item)

        # Check Marathon Help
        item = fetch_marathon_help()
        if item:
            updates.append(item)

        # Process Updates
        for update in updates:
            state_key = f"{update['type']}_{update['source']}_guid"
            if state_key in state:
                if state[state_key] != update["guid"]:
                    print(f"[*] New Update detected: {update['source']} -> {update['title']}")

                    translated = translate_to_ja(update["title"])
                    fields = [
                        {"name": "🇯🇵 日本語翻訳", "value": translated or "翻訳不可", "inline": False},
                        {"name": "🇺🇸 Original", "value": f"> {update['title']}", "inline": False},
                    ]
                    if update.get("image"):
                        fields.append(
                            {"name": "🔗 メディアを表示", "value": f"[View Media]({update['image']})", "inline": True}
                        )

                    send_discord_embed(
                        f"Marathon Update: {update['type']}",
                        f"Detected a new post from **{update['source']}**",
                        update["link"],
                        update["source"],
                        update["color"],
                        fields,
                        update.get("image"),
                    )
                    state[state_key] = update["guid"]
            else:
                # First run, just save state
                state[state_key] = update["guid"]

        # Persist state
        with open(STATE_FILE, "w") as f:
            json.dump(state, f)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
