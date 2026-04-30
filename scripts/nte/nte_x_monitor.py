import argparse
import asyncio
import hashlib
import html
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import feedparser
from dotenv import load_dotenv

from nte_notifier import NTENotifier

load_dotenv()

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.getenv("NTE_DATA_DIR", ROOT_DIR / "data"))
SEEN_FILE = Path(os.getenv("NTE_X_SEEN_FILE", DATA_DIR / "seen_nte_x_posts.json"))
STATE_FILE = Path(os.getenv("NTE_X_STATE_FILE", DATA_DIR / "nte_x_monitor_state.json"))
DEFAULT_INTERVAL_SECONDS = int(os.getenv("NTE_X_MONITOR_INTERVAL_SECONDS", "300"))
NTE_CHANNEL_ID = int(os.getenv("NTE_CHANNEL_ID", "1499218573930008681"))

X_HANDLE = os.getenv("NTE_X_HANDLE", "NTE_JP").strip().lstrip("@")
X_PROFILE_URL = f"https://x.com/{X_HANDLE}"

RSS_FEEDS = [
    os.getenv("NTE_X_RSS_URL", f"https://nitter.net/{X_HANDLE}/rss"),
    f"https://nitter.poast.org/{X_HANDLE}/rss",
    f"https://rsshub.app/twitter/user/{X_HANDLE}",
]


def load_json(path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def save_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def load_seen():
    return set(load_json(SEEN_FILE, []))


def save_seen(seen):
    save_json(SEEN_FILE, sorted(seen))


def save_state(state):
    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    save_json(STATE_FILE, state)


def clean_text(value):
    value = re.sub(r"<[^>]+>", "", value or "")
    value = html.unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def post_id(entry):
    stable = getattr(entry, "id", "") or getattr(entry, "link", "") or getattr(entry, "title", "")
    return hashlib.sha256(stable.encode("utf-8")).hexdigest()


def fetch_entries():
    last_error = None
    for feed_url in [url for url in RSS_FEEDS if url]:
        print(f"[*] Fetching NTE X feed: {feed_url}")
        feed = feedparser.parse(feed_url)
        if getattr(feed, "bozo", False) and not feed.entries:
            last_error = repr(getattr(feed, "bozo_exception", "unknown feed error"))
            print(f"[!] Feed failed: {last_error}")
            continue
        if feed.entries:
            return feed_url, feed.entries
    raise RuntimeError(f"No usable NTE X feed found. Last error: {last_error}")


async def dispatch_entry(notifier, entry, feed_url, dry_run=False):
    title = clean_text(getattr(entry, "title", ""))
    summary = clean_text(getattr(entry, "summary", ""))
    link = getattr(entry, "link", "") or X_PROFILE_URL
    published = clean_text(getattr(entry, "published", ""))

    content = notifier.format_terminal(
        title_en=title[:240] or "NTE_JP post detected",
        title_ja=title[:240] or "NTE_JP 投稿を検出",
        content_en=(summary or title)[:1500],
        content_ja="NTE_JP公式Xの新規投稿を検出しました。内容はリンク先で確認してください。",
        source=f"X Monitor @{X_HANDLE} | {published or feed_url}",
        link=link,
    )

    if dry_run:
        print(f"[DRY-RUN] {title} <{link}>")
        return True

    await notifier.send_message(content=content, channel_id=NTE_CHANNEL_ID)
    return True


async def run_sweep(dry_run=False, prime_seen=False, max_entries=10):
    state = load_json(STATE_FILE, {"runs": 0, "failures": 0})
    state["runs"] = int(state.get("runs", 0)) + 1
    state["last_started_at"] = datetime.now(timezone.utc).isoformat()

    seen = load_seen()
    checked = 0
    posted = 0
    primed = 0
    notifier = NTENotifier()

    try:
        feed_url, entries = fetch_entries()
        for entry in entries[:max_entries]:
            checked += 1
            item_id = post_id(entry)
            if item_id in seen:
                continue

            if prime_seen:
                print(f"[PRIME] Marking as seen: {clean_text(getattr(entry, 'title', ''))}")
                seen.add(item_id)
                primed += 1
                continue

            delivered = await dispatch_entry(notifier, entry, feed_url, dry_run=dry_run)
            if delivered:
                seen.add(item_id)
                posted += 1
                if not dry_run:
                    await asyncio.sleep(2)

        if prime_seen or not dry_run:
            save_seen(seen)

        state["last_success_at"] = datetime.now(timezone.utc).isoformat()
        state["last_error"] = None
        state["last_result"] = {
            "checked": checked,
            "posted": 0 if dry_run else posted,
            "would_post": posted if dry_run else 0,
            "primed": primed,
            "feed": feed_url,
            "channel_id": NTE_CHANNEL_ID,
            "profile": X_PROFILE_URL,
        }
        save_state(state)
        print(f"[*] NTE X sweep complete: {state['last_result']}")
        return state["last_result"]
    except Exception as exc:
        state["failures"] = int(state.get("failures", 0)) + 1
        state["last_error"] = repr(exc)
        save_state(state)
        raise


async def run_monitor(loop=False, interval=DEFAULT_INTERVAL_SECONDS, dry_run=False, prime_seen=False):
    print("[*] NTE X Monitor: ACTIVE")
    print(f"[*] Target: {X_PROFILE_URL}")
    print(f"[*] Discord channel: {NTE_CHANNEL_ID}")
    print(f"[*] State file: {STATE_FILE}")

    while True:
        await run_sweep(dry_run=dry_run, prime_seen=prime_seen)
        if not loop or prime_seen:
            break
        print(f"[*] Sleeping for {interval}s...")
        time.sleep(interval)


def main():
    parser = argparse.ArgumentParser(description="NTE_JP X Monitor")
    parser.add_argument("--loop", action="store_true", help="Run continuously")
    parser.add_argument("--once", action="store_true", help="Run one sweep and exit")
    parser.add_argument("--dry-run", action="store_true", help="Fetch without posting or updating seen state")
    parser.add_argument("--prime-seen", action="store_true", help="Mark current posts as seen without posting")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_SECONDS, help="Loop interval in seconds")
    args = parser.parse_args()

    asyncio.run(
        run_monitor(
            loop=args.loop and not args.once,
            interval=args.interval,
            dry_run=args.dry_run,
            prime_seen=args.prime_seen,
        )
    )


if __name__ == "__main__":
    main()
