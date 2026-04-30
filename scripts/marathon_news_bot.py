import os
import json
import time
import hashlib
import feedparser
import re
import sys
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv
from marathon_templates import MarathonNotifier

load_dotenv()

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Configuration from .env or defaults
KEYWORDS = [k.strip().lower() for k in os.getenv("KEYWORDS", "Marathon,Bungie,Rook,Joe Ziegler,Ziegler,Sandbox,Balance,Cryo Archive,Low Temp Storage,WSTR,MIDA,Traxus,U.E.S.C.,Extraction Shooter,Runner,Mercy Kit,Abyssal Vault,Tau Ceti,CyberAcme").split(",") if k.strip()]

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.getenv("MARATHON_DATA_DIR", ROOT_DIR / "data"))
SEEN_FILE = Path(os.getenv("MARATHON_SEEN_FILE", DATA_DIR / "seen_marathon_news.json"))

SEARCH_QUERIES = [
    ("https://news.google.com/rss/search?q=Marathon%20Bungie%20latest&hl=ja&gl=JP&ceid=JP:ja", "ja"),
    ("https://news.google.com/rss/search?q=site:famitsu.com%20Marathon&hl=ja&gl=JP&ceid=JP:ja", "ja"),
    ("https://news.google.com/rss/search?q=site:4gamer.net%20Marathon&hl=ja&gl=JP&ceid=JP:ja", "ja"),
    ("https://news.google.com/rss/search?q=site:dengekionline.com%20Marathon&hl=ja&gl=JP&ceid=JP:ja", "ja"),
    ("https://news.google.com/rss/search?q=Marathon%20Bungie%20game%20news&hl=en-US&gl=US&ceid=US:en", "en"),
    ("https://news.google.com/rss/search?q=Marathon%20game%20Reddit%20leaks%20rumors&hl=en-US&gl=US&ceid=US:en", "en")
]

def load_seen(seen_file=SEEN_FILE):
    seen_file = Path(seen_file)
    if not seen_file.exists():
        return set()
    try:
        with seen_file.open("r", encoding="utf-8") as f:
            return set(json.load(f))
    except Exception:
        return set()

def save_seen(seen, seen_file=SEEN_FILE):
    seen_file = Path(seen_file)
    seen_file.parent.mkdir(parents=True, exist_ok=True)
    with seen_file.open("w", encoding="utf-8") as f:
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

def dispatch_entry(notifier, title, link, summary, lang="en", dry_run=False):
    if dry_run:
        print(f"[DRY-RUN] {title} <{link}>")
        return True

    title_lower = title.lower()

    if any(word in title_lower for word in ["patch", "update", "hotfix", "1.0."]):
        return notifier.notify_patch_notes(
            version="DETECTED",
            summary_en=title,
            summary_ja="[公式パッチ/アップデート情報が検出されました]",
            link=link
        )
    if any(word in title_lower for word in ["leak", "rumor", "insider", "spoiler"]):
        return notifier.notify_leak_signal(
            title_en=title,
            title_ja="[機密リーク情報が検出されました]",
            content_en=summary[:1500],
            content_ja="[内容をソース元で確認してください]",
            source="Abyssal Intel",
            link=link
        )

    source = "Traxus Watch JP" if lang == "ja" else "Traxus Watch"
    content_ja = summary[:1500] if lang == "ja" else "[ウェブ・アーカイブより抽出]"
    return notifier.notify_leak_signal(
        title_en=title,
        title_ja=title,
        content_en=summary[:1500],
        content_ja=content_ja,
        source=source,
        link=link
    )

def run_sweep(max_entries=10, seen_file=SEEN_FILE, dry_run=False):
    notifier = MarathonNotifier()
    print("[*] Marathon News Bot: Starting autonomous sweep...")

    seen = load_seen(seen_file)
    new_count = 0
    checked_count = 0

    for feed_url, lang in SEARCH_QUERIES:
        print(f"[*] Fetching feed: {feed_url}")
        feed = feedparser.parse(feed_url)
        if getattr(feed, "bozo", False):
            print(f"[!] Feed parse warning: {getattr(feed, 'bozo_exception', 'unknown error')}")

        for entry in feed.entries[:max_entries]:
            title = getattr(entry, "title", "")
            link = getattr(entry, "link", "")
            summary = clean_html(getattr(entry, "summary", ""))
            checked_count += 1

            if not title or not link:
                continue

            item_id = make_id(link, title)

            if item_id in seen:
                continue

            if not is_related(title, summary):
                continue

            delivered = dispatch_entry(notifier, title, link, summary, lang=lang, dry_run=dry_run)
            if delivered:
                seen.add(item_id)
                new_count += 1
                if not dry_run:
                    time.sleep(2)

    if not dry_run:
        save_seen(seen, seen_file)
    action = "would post" if dry_run else "posted"
    print(f"[*] Dispatch complete. Checked {checked_count}; {action} {new_count} new updates.")
    return {"checked": checked_count, "posted": 0 if dry_run else new_count, "would_post": new_count if dry_run else 0}

def main():
    run_sweep()

if __name__ == "__main__":
    main()
