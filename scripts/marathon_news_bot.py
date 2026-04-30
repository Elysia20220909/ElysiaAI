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
KEYWORDS = [k.strip().lower() for k in os.getenv("KEYWORDS", "Marathon,Bungie,Rook,Joe Ziegler,Ziegler,Sandbox,Balance,Cryo Archive,Low Temp Storage,WSTR,MIDA,Traxus,U.E.S.C.,Extraction Shooter,Runner,Mercy Kit,Abyssal Vault,Tau Ceti,CyberAcme,Datamine,Datamined,Datamining,Data Mining,Leak,Leaks").split(",") if k.strip()]
FEED_MODE = os.getenv("MARATHON_FEED_MODE", "all").strip().lower()
DATAMINE_TERMS = [
    "datamine",
    "datamined",
    "datamining",
    "data mining",
    "leak",
    "leaks",
    "leaked",
    "rumor",
    "rumour",
    "insider",
    "spoiler",
    "reported",
    "reportedly",
    "report says",
    "according to",
    "内部情報",
    "報道",
    "噂",
    "リーク",
    "データマイニング",
]

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.getenv("MARATHON_DATA_DIR", ROOT_DIR / "data"))
SEEN_FILE = Path(os.getenv("MARATHON_SEEN_FILE", DATA_DIR / "seen_marathon_news.json"))

GENERAL_SEARCH_QUERIES = [
    ("https://news.google.com/rss/search?q=Marathon%20Bungie%20latest&hl=ja&gl=JP&ceid=JP:ja", "ja"),
    ("https://news.google.com/rss/search?q=site:famitsu.com%20Marathon&hl=ja&gl=JP&ceid=JP:ja", "ja"),
    ("https://news.google.com/rss/search?q=site:4gamer.net%20Marathon&hl=ja&gl=JP&ceid=JP:ja", "ja"),
    ("https://news.google.com/rss/search?q=site:dengekionline.com%20Marathon&hl=ja&gl=JP&ceid=JP:ja", "ja"),
    ("https://news.google.com/rss/search?q=Marathon%20Bungie%20game%20news&hl=en-US&gl=US&ceid=US:en", "en"),
    ("https://news.google.com/rss/search?q=Marathon%20game%20Reddit%20leaks%20rumors&hl=en-US&gl=US&ceid=US:en", "en"),
    ("https://news.google.com/rss/search?q=Marathon%20Bungie%20datamine%20OR%20datamined%20OR%20datamining&hl=en-US&gl=US&ceid=US:en", "en")
]

DATAMINE_SEARCH_QUERIES = [
    ("https://news.google.com/rss/search?q=Marathon%20Bungie%20datamine%20OR%20datamined%20OR%20datamining%20when:30d&hl=en-US&gl=US&ceid=US:en", "en"),
    ("https://news.google.com/rss/search?q=Marathon%20Bungie%20leak%20OR%20leaked%20OR%20rumor%20when:30d&hl=en-US&gl=US&ceid=US:en", "en"),
    ("https://news.google.com/rss/search?q=Marathon%20Bungie%20%E3%83%AA%E3%83%BC%E3%82%AF%20OR%20%E3%83%87%E3%83%BC%E3%82%BF%E3%83%9E%E3%82%A4%E3%83%8B%E3%83%B3%E3%82%B0%20when:30d&hl=ja&gl=JP&ceid=JP:ja", "ja"),
]

SEARCH_QUERIES = DATAMINE_SEARCH_QUERIES if FEED_MODE in {"datamine", "leak", "leaks"} else GENERAL_SEARCH_QUERIES

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
    if FEED_MODE in {"datamine", "leak", "leaks"}:
        return "marathon" in text and any(term in text for term in DATAMINE_TERMS)
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
    if any(word in title_lower for word in DATAMINE_TERMS):
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

def run_sweep(max_entries=10, seen_file=SEEN_FILE, dry_run=False, prime_seen=False):
    notifier = MarathonNotifier()
    mode = "prime-seen" if prime_seen else "autonomous sweep"
    print(f"[*] Marathon News Bot: Starting {mode}...")

    seen = load_seen(seen_file)
    new_count = 0
    checked_count = 0
    primed_count = 0

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

            if prime_seen:
                print(f"[PRIME] Marking as seen: {title} <{link}>")
                seen.add(item_id)
                primed_count += 1
                continue

            delivered = dispatch_entry(notifier, title, link, summary, lang=lang, dry_run=dry_run)
            if delivered:
                seen.add(item_id)
                new_count += 1
                if not dry_run:
                    time.sleep(2)

    if prime_seen or not dry_run:
        save_seen(seen, seen_file)
    if prime_seen:
        print(f"[*] Prime complete. Checked {checked_count}; marked {primed_count} updates as seen.")
        return {"checked": checked_count, "posted": 0, "would_post": 0, "primed": primed_count}

    action = "would post" if dry_run else "posted"
    print(f"[*] Dispatch complete. Checked {checked_count}; {action} {new_count} new updates.")
    return {"checked": checked_count, "posted": 0 if dry_run else new_count, "would_post": new_count if dry_run else 0, "primed": 0}

def main():
    run_sweep()

if __name__ == "__main__":
    main()
