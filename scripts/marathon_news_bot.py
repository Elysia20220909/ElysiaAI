import os
import json
import time
import hashlib
import feedparser
import re
from datetime import datetime, timezone
from dotenv import load_dotenv
from marathon_templates import MarathonNotifier

load_dotenv()

# Configuration from .env or defaults
KEYWORDS = [k.strip().lower() for k in os.getenv("KEYWORDS", "Marathon,Bungie,Rook,Joe Ziegler,Ziegler,Sandbox,Balance,Cryo Archive,Low Temp Storage,WSTR,MIDA,Traxus,U.E.S.C.,Extraction Shooter,Runner,Depleted Shield Charges,Patch Kits,Sponsored Kit,AI targets").split(",") if k.strip()]

SEEN_FILE = "seen_marathon_news.json"

SEARCH_QUERIES = [
    ("https://news.google.com/rss/search?q=Marathon%20Bungie%20latest&hl=ja&gl=JP&ceid=JP:ja", "ja"),
    ("https://news.google.com/rss/search?q=Marathon%20Bungie%20game%20news&hl=en-US&gl=US&ceid=US:en", "en"),
    ("https://news.google.com/rss/search?q=Marathon%20Bungie%20patch%20notes%20update&hl=en-US&gl=US&ceid=US:en", "en"),
    ("https://news.google.com/rss/search?q=Marathon%20game%20Reddit%20leaks%20rumors&hl=en-US&gl=US&ceid=US:en", "en"),
    ("https://news.google.com/rss/search?q=Marathon%20Bungie%20Director%20Ziegler&hl=en-US&gl=US&ceid=US:en", "en")
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

def clean_html(text):
    """Remove HTML tags from summary."""
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)

def main():
    notifier = MarathonNotifier()
    print("[*] Marathon News Bot: Starting...")
    
    seen = load_seen()
    new_count = 0

    for feed_url, lang in SEARCH_QUERIES:
        print(f"[*] Fetching feed: {feed_url}")
        feed = feedparser.parse(feed_url)

        for entry in feed.entries[:10]:
            title = getattr(entry, "title", "")
            link = getattr(entry, "link", "")
            summary = clean_html(getattr(entry, "summary", ""))

            if not title or not link:
                continue

            item_id = make_id(link, title)

            if item_id in seen:
                continue

            if not is_related(title, summary):
                continue

            # --- Intelligent Categorization ---
            title_lower = title.lower()
            
            if any(word in title_lower for word in ["patch", "update", "hotfix", "1.0."]):
                # Patch Notes Style
                notifier.notify_patch_notes(
                    version="DETECTED",
                    summary_en=title,
                    summary_ja="[公式パッチ/アップデート情報が検出されました]",
                    link=link
                )
            elif any(word in title_lower for word in ["leak", "rumor", "insider", "spoiler"]):
                # Leak Style
                notifier.notify_leak_signal(
                    title_en=title,
                    title_ja="[機密リーク情報が検出されました]",
                    content_en=summary,
                    content_ja="[内容をソース元で確認してください]",
                    source="Abyssal Intel",
                    link=link
                )
            else:
                # Standard Intel Style
                notifier.notify_leak_signal(
                    title_en=title,
                    title_ja=title,
                    content_en=summary,
                    content_ja="[ウェブ・アーカイブより抽出]",
                    source="Traxus Watch",
                    link=link
                )

            seen.add(item_id)
            new_count += 1
            time.sleep(2)

    save_seen(seen)
    print(f"[*] Dispatch complete. Posted {new_count} new updates.")

if __name__ == "__main__":
    main()
