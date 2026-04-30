import os
import feedparser
import time
import json
import hashlib
import re
from ff14_notifier import FF14Notifier
import asyncio

# Configuration
SEARCH_QUERIES = [
    ("https://news.google.com/rss/search?q=FFXIV%20Reddit%20leaks%20rumors&hl=en-US&gl=US&ceid=US:en", "en"),
    ("https://news.google.com/rss/search?q=FFXIV%20datamine%204chan%20spoiler&hl=en-US&gl=US&ceid=US:en", "en")
]
KEYWORDS = [
    "FFXIV", "FF14", "Final Fantasy XIV", "Dawntrail", "Yoshi-P", "Square Enix", 
    "黄金のレガシー", "吉田直樹", "Evercold", "Argent Wanderer", "白銀のワンダラー", 
    "Spellblade", "魔法剣士", "Beastmaster", "魔獣使い", "Dancing Mad", "絶ケフカ", 
    "Evangelion", "エヴァコラボ"
]
SEEN_FILE = "seen_ff14_news.json"

def load_seen():
    if os.path.exists(SEEN_FILE):
        with open(SEEN_FILE, "r", encoding="utf-8") as f:
            return set(json.load(f))
    return set()

def save_seen(seen):
    with open(SEEN_FILE, "w", encoding="utf-8") as f:
        json.dump(list(seen), f, indent=2)

def make_id(link, title):
    return hashlib.sha256(f"{link}{title}".encode()).hexdigest()

def clean_html(text):
    return re.sub('<.*?>', '', text)

async def main():
    notifier = FF14Notifier()
    print("[*] FF14 News Bot: Starting...")
    
    seen = load_seen()
    new_count = 0

    for url, lang in SEARCH_QUERIES:
        print(f"[*] Fetching feed: {url}")
        feed = feedparser.parse(url)

        for entry in feed.entries[:10]:
            title = getattr(entry, "title", "")
            link = getattr(entry, "link", "")
            summary = clean_html(getattr(entry, "summary", ""))

            if not title or not link:
                continue

            item_id = make_id(link, title)
            if item_id in seen:
                continue

            if any(kw.lower() in title.lower() or kw.lower() in summary.lower() for kw in KEYWORDS):
                print(f"[+] Found FF14 Intelligence: {title}")
                
                # Bilingual fallback
                title_ja = title if lang == "ja" else "FF14 最新情報"
                title_en = title if lang == "en" else "FFXIV Intelligence"
                
                await notifier.notify_leak(
                    title_en=title_en,
                    title_ja=title_ja,
                    content_en=summary[:500],
                    content_ja="最新のエオルゼア・ニュースを確認してください。",
                    source=f"Web Feed ({lang})",
                    link=link
                )
                seen.add(item_id)
                new_count += 1
                await asyncio.sleep(2) # Avoid rate limit

    save_seen(seen)
    print(f"[*] FF14 Dispatch complete. Posted {new_count} updates.")

if __name__ == "__main__":
    asyncio.run(main())
