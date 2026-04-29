import os
import json
import time
import hashlib
import feedparser
from datetime import datetime, timezone
from dotenv import load_dotenv
from marathon_templates import MarathonNotifier

load_dotenv()

# Configuration from .env or defaults
KEYWORDS = [k.strip().lower() for k in os.getenv("KEYWORDS", "Marathon,Bungie,Rook,Cryo Archive,Low Temp Storage,WSTR,MIDA,Traxus,U.E.S.C.,Extraction Shooter,Runner,Depleted Shield Charges,Patch Kits,Sponsored Kit,AI targets").split(",") if k.strip()]

SEEN_FILE = "seen_marathon_news.json"

FEEDS = [
    # Google News RSS: Marathon / Bungie 関連
    "https://news.google.com/rss/search?q=Marathon%20Bungie&hl=ja&gl=JP&ceid=JP:ja",
    # 英語圏ニュース
    "https://news.google.com/rss/search?q=Marathon%20Bungie%20game&hl=en-US&gl=US&ceid=US:en",
    # パッチ・アップデート寄り
    "https://news.google.com/rss/search?q=Marathon%20Bungie%20patch%20update&hl=en-US&gl=US&ceid=US:en",
    # Cryo Archive / Low Temp Storage など攻略・調整系
    "https://news.google.com/rss/search?q=Marathon%20Cryo%20Archive%20Low%20Temp%20Storage&hl=en-US&gl=US&ceid=US:en",
]

def load_seen():
    if not os.path.exists(SEEN_FILE):
        return set()
    try:
        with open(SEEN_FILE, "r", encoding="utf-8") as f:
            return set(json.load(f))
    except Exception:
        return set()

def save_seen(seen):
    with open(SEEN_FILE, "w", encoding="utf-8") as f:
        json.dump(list(seen), f, ensure_ascii=False, indent=2)

def make_id(url, title):
    raw = f"{url}|{title}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def is_related(title, summary):
    text = f"{title} {summary}".lower()
    if "marathon" in text and "bungie" in text:
        return True
    return any(keyword in text for keyword in KEYWORDS)

def main():
    notifier = MarathonNotifier()
    print("[*] Marathon News Bot: Starting...")
    
    seen = load_seen()
    new_count = 0

    for feed_url in FEEDS:
        print(f"[*] Fetching feed: {feed_url}")
        feed = feedparser.parse(feed_url)

        for entry in feed.entries[:10]:
            title = getattr(entry, "title", "")
            link = getattr(entry, "link", "")
            summary = getattr(entry, "summary", "")

            if not title or not link:
                continue

            item_id = make_id(link, title)

            if item_id in seen:
                continue

            if not is_related(title, summary):
                continue

            # Dispatch using standard MarathonNotifier style
            # Using notify_leak_signal for news as it has a generic intel look
            notifier.notify_leak_signal(
                title_en=title,
                title_ja=title, # Google News handles translation in the feed title mostly
                content_en=summary,
                content_ja="[RSS Feed Intel Detect]",
                source="Bungie / Marathon Watch",
                link=link
            )

            seen.add(item_id)
            new_count += 1
            time.sleep(2)

    save_seen(seen)
    print(f"[*] Dispatch complete. Posted {new_count} new updates.")

if __name__ == "__main__":
    main()
