import html
import json
import os
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import UTC, datetime


# ==========================================
# SOVEREIGN SENTINEL ACTION CONFIG
# ==========================================
# Recommended: Use GitHub Secrets for this in the workflow
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL")
STATE_FILE = "data/sentinel_state.json"

TWITTER_USERS = ["Ziegler_Dev", "BNGServerStatus", "MarathonTheGame"]
YOUTUBE_CHANNELS = [{"name": "MarathonTheGame", "id": "UCBsbrudhKRrT9zs8iNOEjjw"}]
MARATHON_HELP_API = "https://help.marathonthegame.com/hc/api/internal/recent_activities?locale=en-us"

# ==========================================
# UTILITIES
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
        res = urllib.request.urlopen(req, timeout=15)
        data = json.loads(res.read().decode("utf-8"))
        return "".join([s[0] for s in data[0] if s[0]])
    except Exception as e:
        print(f"Translation Error: {e}")
        return cleaned


def send_discord_embed(title, description, url, source_name, color, fields=None, image_url=None):
    timestamp = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    embed = {
        "title": title,
        "description": description,
        "url": url,
        "color": color,
        "timestamp": timestamp,
        "footer": {"text": f"Sovereign Sentinel • {source_name}"},
        "author": {"name": source_name},
        "fields": fields or [],
    }
    if image_url:
        embed["image"] = {"url": image_url}

    payload = {
        "username": "Sovereign Sentinel (Cloud)",
        "avatar_url": "https://raw.githubusercontent.com/google/material-design-icons/master/png/device/cloud_queue/mw24.png",
        "embeds": [embed],
    }
    req = urllib.request.Request(
        DISCORD_WEBHOOK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "SovereignSentinel/1.0"},
    )
    try:
        urllib.request.urlopen(req)
    except Exception as e:
        print(f"Discord Webhook Error: {e}")


# ==========================================
# FETCHERS
# ==========================================


def fetch_twitter(username):
    rss_url = f"https://nitter.net/{username}/rss"
    try:
        req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=15)
        root = ET.fromstring(res.read())  # noqa: S314
        item = root.find("channel/item")
        if item is None:
            return None
        desc = item.find("description").text or ""
        img_match = re.search(r'<img src="([^"]+)"', desc)
        image_url = img_match.group(1) if img_match else None

        return {
            "type": "Twitter",
            "source": f"@{username}",
            "title": item.find("title").text,
            "link": item.find("link").text.replace("nitter.net", "x.com"),
            "guid": item.find("guid").text,
            "image": image_url,
            "color": 0x1DA1F2,
        }
    except Exception as e:
        print(f"Twitter Error ({username}): {e}")
        return None


def fetch_youtube(channel):
    rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel['id']}"
    try:
        req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=15)
        root = ET.fromstring(res.read())  # noqa: S314
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entry = root.find("atom:entry", ns)
        if entry is None:
            return None
        link = entry.find("atom:link", ns).attrib["href"]
        # Extract Thumbnail from media:group
        media_ns = {"media": "http://search.yahoo.com/mrss/"}
        thumbnail = entry.find("media:group/media:thumbnail", media_ns)
        image_url = thumbnail.attrib["url"] if thumbnail is not None else None

        return {
            "type": "YouTube",
            "source": f"YouTube: {channel['name']}",
            "title": entry.find("atom:title", ns).text,
            "link": link,
            "guid": entry.find("atom:id", ns).text,
            "image": image_url,
            "color": 0xFF0000,
        }
    except Exception as e:
        print(f"YouTube Error ({channel['name']}): {e}")
        return None


def fetch_marathon_help():
    try:
        req = urllib.request.Request(MARATHON_HELP_API, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=15)
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
        print(f"Marathon Error: {e}")
        return None


# ==========================================
# MAIN
# ==========================================


def main():
    print("Cloud Sentinel Run Start")
    if not DISCORD_WEBHOOK_URL:
        print("[!] ERROR: DISCORD_WEBHOOK_URL is not set. Please add it to GitHub Secrets.")
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
        item = fetch_twitter(user)
        if item:
            updates.append(item)
    for yt in YOUTUBE_CHANNELS:
        item = fetch_youtube(yt)
        if item:
            updates.append(item)
    m_item = fetch_marathon_help()
    if m_item:
        updates.append(m_item)

    for update in updates:
        state_key = f"{update['type']}_{update['source']}_guid"
        if state_key in state and state[state_key] != update["guid"]:
            print(f"New Update: {update['source']}")
            translated = translate_to_ja(update["title"])
            fields = [
                {"name": "🇯🇵 日本語翻訳", "value": translated or "翻訳不可", "inline": False},
                {"name": "🇺🇸 Original", "value": f"> {update['title']}", "inline": False},
            ]
            send_discord_embed(
                f"New Update: {update['type']}",
                f"Detected a new post from **{update['source']}**",
                update["link"],
                update["source"],
                update["color"],
                fields,
                update.get("image"),
            )
        state[state_key] = update["guid"]

    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)
    print("Cloud Sentinel Run Complete")


if __name__ == "__main__":
    main()
