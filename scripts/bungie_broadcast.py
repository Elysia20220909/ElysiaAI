import html
import json
import os
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from dotenv import load_dotenv

# ==========================================
# BUNGIE BROADCASTER CONFIG
# ==========================================
load_dotenv()
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")
STATE_FILE = "data/bungie_state.json"

BUNGIE_SOURCES = [
    {"type": "Twitter", "id": "MarathonTheGame", "color": 0x34D399},
    {"type": "Twitter", "id": "Ziegler_Dev", "color": 0x22D3EE},
    {"type": "API", "id": "Marathon Help", "url": "https://help.marathonthegame.com/hc/api/internal/recent_activities?locale=en-us", "color": 0x00FF41}
]

# ==========================================
# UTILITIES
# ==========================================

def clean_text(text):
    if not text: return ""
    text = html.unescape(text)
    text = re.sub(r"http[s]?://\S+", "", text)
    text = re.sub(r"<[^<]+?>", "", text)
    return re.sub(r"\s+", " ", text).strip()

def translate_to_ja(text):
    cleaned = clean_text(text)
    if not cleaned: return ""
    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q={urllib.parse.quote(cleaned)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=15)
        data = json.loads(res.read().decode("utf-8"))
        return "".join([s[0] for s in data[0] if s[0]])
    except Exception:
        return cleaned

def send_discord_embed(title, description, url, source_name, color, fields=None):
    timestamp = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    payload = {
        "username": "Meteor#6267",
        "avatar_url": "https://raw.githubusercontent.com/google/material-design-icons/master/png/action/settings_input_antenna/mw24.png",
        "embeds": [{
            "title": title,
            "description": description,
            "url": url,
            "color": color,
            "timestamp": timestamp,
            "footer": {"text": f"Meteor#6267 // Bungie Intel • {source_name}"},
            "author": {"name": source_name},
            "fields": fields or []
        }]
    }
    req = urllib.request.Request(
        DISCORD_WEBHOOK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    )
    try:
        urllib.request.urlopen(req)
    except Exception as e:
        print(f"Error: {e}")

# ==========================================
# FETCHERS
# ==========================================

def fetch_twitter(username):
    # Using nitter.net for RSS fallback
    rss_url = f"https://nitter.net/{username}/rss"
    try:
        req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=15)
        root = ET.fromstring(res.read())
        item = root.find("channel/item")
        if item is not None:
            return {
                "title": item.find("title").text,
                "link": item.find("link").text.replace("nitter.net", "x.com"),
                "source": f"@{username}"
            }
    except Exception:
        return None

def fetch_rss(url, source_name):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=15)
        root = ET.fromstring(res.read())
        item = root.find("channel/item")
        if item is not None:
            title_node = item.find("title")
            link_node = item.find("link")
            return {
                "title": title_node.text if title_node is not None else "No Title",
                "link": link_node.text if link_node is not None else url,
                "source": source_name
            }
    except Exception as e:
        print(f"RSS Fetch Error: {e}")
        return None

def fetch_marathon_help(url, source_name):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=15)
        data = json.loads(res.read().decode())
        if not data.get("activities"): return None
        post = data["activities"][0]
        return {
            "title": post["title"],
            "link": f"https://help.marathonthegame.com{post['url']}",
            "source": source_name
        }
    except Exception as e:
        print(f"Marathon API Error: {e}")
        return None

# ==========================================
# MAIN
# ==========================================

def main():
    print("Meteor#6267: Fetching Bungie Intel...")
    if not DISCORD_WEBHOOK_URL:
        print("ERROR: DISCORD_WEBHOOK_URL not set.")
        return

    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    state = {}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                state = json.load(f)
        except Exception:
            pass

    for source in BUNGIE_SOURCES:
        item = None
        if source["type"] == "Twitter":
            item = fetch_twitter(source["id"])
        elif source["type"] == "RSS":
            item = fetch_rss(source["url"], source["id"])
        elif source["type"] == "API":
            item = fetch_marathon_help(source["url"], source["id"])

        if item:
            state_key = f"{source['type']}_{source['id']}_link"
            if state_key in state and state[state_key] == item["link"]:
                print(f"Skipping {item['source']} (No new updates)")
                continue

            print(f"Sending update from {item['source']}...")
            translated = translate_to_ja(item["title"])
            fields = [
                {"name": "🇯🇵 日本語要約", "value": translated or "翻訳不可", "inline": False},
                {"name": "🇺🇸 Original", "value": f"> {item['title']}", "inline": False}
            ]
            send_discord_embed(
                f"Bungie Update: {source['id']}",
                f"Detected latest activity from **{item['source']}**",
                item["link"],
                item["source"],
                source["color"],
                fields
            )
            state[state_key] = item["link"]

    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

if __name__ == "__main__":
    main()
