import argparse
import datetime as dt
import hashlib
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any

if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


API_BASE = "https://discord.com/api/v10"
DEFAULT_GUILD_ID = "695637918626218044"
DEFAULT_CHANNEL_NAME = "rss-cyber-news"
DEFAULT_TASK_NAME = "ElysiaAI Discord RSS News"

ROOT_DIR = Path(__file__).resolve().parents[2]
CONFIG_FILE = ROOT_DIR / "config" / "discord_rss_news.json"
SEEN_FILE = ROOT_DIR / "data" / "discord_rss_seen.json"

RSS_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rss1": "http://purl.org/rss/1.0/",
}

DEFAULT_FEEDS = [
    {
        "name": "JPCERT/CC Unified",
        "url": "https://www.jpcert.or.jp/rss/jpcert-all.rdf",
        "category": "security",
        "language": "ja",
        "priority": 95,
    },
    {
        "name": "CISA Cybersecurity Advisories",
        "url": "https://www.cisa.gov/cybersecurity-advisories/all.xml",
        "category": "security",
        "language": "en",
        "priority": 92,
    },
    {
        "name": "ITmedia NEWS Security",
        "url": "https://rss.itmedia.co.jp/rss/2.0/news_security.xml",
        "category": "security",
        "language": "ja",
        "priority": 82,
    },
    {
        "name": "BleepingComputer",
        "url": "https://www.bleepingcomputer.com/feed/",
        "category": "cyber",
        "language": "en",
        "priority": 78,
    },
    {
        "name": "ITmedia NEWS Technology",
        "url": "https://rss.itmedia.co.jp/rss/2.0/news_technology.xml",
        "category": "cyber",
        "language": "ja",
        "priority": 66,
    },
    {
        "name": "Gizmodo Japan",
        "url": "https://www.gizmodo.jp/index.xml",
        "category": "daily-tech",
        "language": "ja",
        "priority": 62,
    },
    {
        "name": "窓の杜",
        "url": "https://forest.watch.impress.co.jp/data/rss/1.0/wf/feed.rdf",
        "category": "daily-tech",
        "language": "ja",
        "priority": 58,
    },
    {
        "name": "Google News JP Cyber",
        "url": "https://news.google.com/rss/search?q=%E3%82%B5%E3%82%A4%E3%83%90%E3%83%BC%E3%82%BB%E3%82%AD%E3%83%A5%E3%83%AA%E3%83%86%E3%82%A3%20OR%20%E6%83%85%E5%A0%B1%E3%82%BB%E3%82%AD%E3%83%A5%E3%83%AA%E3%83%86%E3%82%A3&hl=ja&gl=JP&ceid=JP:ja",
        "category": "cyber",
        "language": "ja",
        "priority": 55,
    },
    {
        "name": "Google News JP Daily",
        "url": "https://news.google.com/rss/search?q=%E6%9A%AE%E3%82%89%E3%81%97%20OR%20%E7%94%9F%E6%B4%BB%20OR%20%E9%98%B2%E7%81%BD%20OR%20%E5%AE%B6%E9%9B%BB&hl=ja&gl=JP&ceid=JP:ja",
        "category": "daily-life",
        "language": "ja",
        "priority": 35,
    },
    {
        "name": "Google News JP Top",
        "url": "https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja",
        "category": "general",
        "language": "ja",
        "priority": 25,
    },
]

HIGH_SIGNAL_TERMS = [
    "critical",
    "emergency",
    "urgent",
    "exploited",
    "zero-day",
    "0-day",
    "ransomware",
    "breach",
    "malware",
    "vulnerability",
    "cve-",
    "緊急",
    "重要",
    "脆弱性",
    "攻撃",
    "ランサム",
    "不正アクセス",
    "情報漏えい",
]


class DiscordApiError(RuntimeError):
    pass


@dataclass
class FeedItem:
    feed_name: str
    feed_url: str
    category: str
    language: str
    priority: int
    title: str
    link: str
    summary: str
    published: dt.datetime | None
    item_id: str
    score: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Auto-deliver cyber/security/daily RSS news to Discord. Dry-run by default."
    )
    parser.add_argument("--guild-id", default=DEFAULT_GUILD_ID)
    parser.add_argument("--channel-name", default=DEFAULT_CHANNEL_NAME)
    parser.add_argument("--channel-id", help="Override target channel ID.")
    parser.add_argument("--setup", action="store_true", help="Create/update Discord channel and local config.")
    parser.add_argument("--run", action="store_true", help="Fetch feeds and post new items.")
    parser.add_argument("--prime-seen", action="store_true", help="Mark current feed items as seen without posting.")
    parser.add_argument("--install-task", action="store_true", help="Install Windows Scheduled Task.")
    parser.add_argument("--remove-task", action="store_true", help="Remove Windows Scheduled Task.")
    parser.add_argument("--apply", action="store_true", help="Actually change Discord, seen DB, or Task Scheduler.")
    parser.add_argument("--max-posts", type=int, default=5)
    parser.add_argument("--per-feed", type=int, default=8)
    parser.add_argument("--task-minutes", type=int, default=60)
    parser.add_argument("--task-name", default=DEFAULT_TASK_NAME)
    return parser.parse_args()


def load_local_env() -> None:
    for env_path in [Path.cwd() / ".env", ROOT_DIR / ".env"]:
        if not env_path.exists():
            continue
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
        return


def get_bot_token() -> str:
    load_local_env()
    token = os.getenv("DISCORD_BOT_TOKEN", "").strip().strip('"').strip("'")
    if not token:
        raise SystemExit("[!] DISCORD_BOT_TOKEN is missing in .env")
    return token


def request_json(
    headers: dict[str, str],
    method: str,
    path: str,
    *,
    json_body: dict[str, Any] | None = None,
) -> Any:
    url = f"{API_BASE}{path}"
    for attempt in range(3):
        request_headers = dict(headers)
        data = None
        if json_body is not None:
            request_headers["Content-Type"] = "application/json"
            data = json.dumps(json_body).encode("utf-8")

        request = urllib.request.Request(url, data=data, headers=request_headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                content = response.read()
                if not content:
                    return None
                return json.loads(content.decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body_bytes = exc.read()
            body_text = body_bytes.decode("utf-8", errors="replace") if body_bytes else ""
            if exc.code == 429 and attempt < 2:
                retry_after = 1.5
                try:
                    retry_after = json.loads(body_text).get("retry_after", retry_after)
                except json.JSONDecodeError:
                    pass
                time.sleep(float(retry_after) + 0.25)
                continue
            body = body_text[:500].replace("\n", " ")
            raise DiscordApiError(f"{method} {path} failed: HTTP {exc.code}: {body}") from exc
        except urllib.error.URLError as exc:
            raise DiscordApiError(f"{method} {path} failed: {exc.reason}") from exc
    raise DiscordApiError(f"{method} {path} failed after retries")


def load_config() -> dict[str, Any]:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def save_config(config: dict[str, Any]) -> None:
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")


def load_seen() -> set[str]:
    if not SEEN_FILE.exists():
        return set()
    try:
        data = json.loads(SEEN_FILE.read_text(encoding="utf-8"))
        return set(str(item) for item in data)
    except json.JSONDecodeError:
        return set()


def save_seen(seen: set[str]) -> None:
    SEEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    SEEN_FILE.write_text(json.dumps(sorted(seen), ensure_ascii=False, indent=2), encoding="utf-8")


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "ElysiaAI-RSS-AutoNews/1.0 (+Discord digest)",
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        },
    )
    with urllib.request.urlopen(request, timeout=35) as response:
        return response.read()


def text_of(parent: ET.Element, names: list[str]) -> str:
    for name in names:
        found = parent.find(name, RSS_NS)
        if found is not None and found.text:
            return found.text.strip()
    return ""


def link_of(item: ET.Element) -> str:
    link = text_of(item, ["link", "rss1:link"])
    if link:
        return link
    atom_link = item.find("atom:link", RSS_NS)
    if atom_link is not None:
        href = atom_link.attrib.get("href", "")
        if href:
            return href.strip()
    return ""


def parse_date(value: str) -> dt.datetime | None:
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.astimezone(dt.timezone.utc)
    except (TypeError, ValueError):
        pass
    try:
        normalized = value.replace("Z", "+00:00")
        return dt.datetime.fromisoformat(normalized).astimezone(dt.timezone.utc)
    except ValueError:
        return None


def strip_html(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = html.unescape(value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def make_item_id(link: str, title: str) -> str:
    return hashlib.sha256(f"{link}|{title}".encode("utf-8")).hexdigest()


def score_item(feed: dict[str, Any], title: str, summary: str, published: dt.datetime | None) -> int:
    text = f"{title} {summary}".lower()
    score = int(feed.get("priority", 30))
    if any(term in text for term in HIGH_SIGNAL_TERMS):
        score += 35
    if published:
        age_hours = (dt.datetime.now(dt.timezone.utc) - published).total_seconds() / 3600
        if age_hours <= 24:
            score += 15
        elif age_hours <= 72:
            score += 8
    return min(score, 150)


def parse_feed(feed: dict[str, Any], per_feed: int) -> list[FeedItem]:
    raw = fetch_bytes(feed["url"])
    root = ET.fromstring(raw)

    items = root.findall(".//item")
    items += root.findall(".//rss1:item", RSS_NS)
    items += root.findall(".//atom:entry", RSS_NS)

    parsed_items: list[FeedItem] = []
    seen_local = set()
    for item in items:
        title = strip_html(text_of(item, ["title", "rss1:title", "atom:title"]))
        link = link_of(item)
        summary = strip_html(
            text_of(
                item,
                [
                    "description",
                    "rss1:description",
                    "atom:summary",
                    "atom:content",
                    "content:encoded",
                ],
            )
        )
        date_text = text_of(item, ["pubDate", "dc:date", "atom:updated", "atom:published"])
        published = parse_date(date_text)
        if not title or not link:
            continue
        item_id = make_item_id(link, title)
        if item_id in seen_local:
            continue
        seen_local.add(item_id)
        parsed_items.append(
            FeedItem(
                feed_name=str(feed["name"]),
                feed_url=str(feed["url"]),
                category=str(feed.get("category", "general")),
                language=str(feed.get("language", "ja")),
                priority=int(feed.get("priority", 30)),
                title=title,
                link=link,
                summary=summary,
                published=published,
                item_id=item_id,
                score=score_item(feed, title, summary, published),
            )
        )
        if len(parsed_items) >= per_feed:
            break
    return parsed_items


def gather_items(feeds: list[dict[str, Any]], per_feed: int) -> list[FeedItem]:
    gathered: list[FeedItem] = []
    for feed in feeds:
        try:
            print(f"[*] Fetching {feed['name']}: {feed['url']}")
            gathered.extend(parse_feed(feed, per_feed))
        except Exception as exc:
            print(f"[!] Feed failed: {feed['name']}: {exc}")
    gathered.sort(key=lambda item: (item.score, item.published or dt.datetime.min.replace(tzinfo=dt.timezone.utc)), reverse=True)
    return gathered


def truncate(value: str, limit: int) -> str:
    value = value or ""
    if len(value) <= limit:
        return value
    return value[: max(0, limit - 1)].rstrip() + "…"


def color_for(item: FeedItem) -> int:
    if item.score >= 105:
        return 0xEF4444
    if item.category == "security":
        return 0xA855F7
    if item.category == "cyber":
        return 0x06B6D4
    if item.category == "daily-life":
        return 0x22C55E
    return 0x64748B


def build_news_embed(item: FeedItem) -> dict[str, Any]:
    published = "unknown"
    if item.published:
        published = item.published.strftime("%Y-%m-%d %H:%M UTC")

    summary = item.summary or "概要なし。リンク先で確認してください。"
    return {
        "title": truncate(item.title, 240),
        "url": item.link,
        "description": truncate(summary, 950),
        "color": color_for(item),
        "fields": [
            {"name": "Source", "value": truncate(item.feed_name, 120), "inline": True},
            {"name": "Category", "value": f"`{item.category}`", "inline": True},
            {"name": "Signal", "value": f"`{item.score}`", "inline": True},
        ],
        "footer": {"text": f"RSS Auto News | {published}"},
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def build_setup_embed(channel_id: str, feed_count: int, task_installed: bool) -> dict[str, Any]:
    task = "installed" if task_installed else "not installed"
    return {
        "title": "RSS Auto News // Cyber Dispatch Online",
        "description": (
            "サイバー系・セキュリティ・日常/なんでもニュースの自動配信モードをセットアップしました。\n"
            "初回は既存記事を既読化して、次回以降の新着だけを流します。"
        ),
        "color": 0x14B8A6,
        "fields": [
            {"name": "Channel", "value": f"<#{channel_id}>", "inline": True},
            {"name": "Feeds", "value": f"`{feed_count}`", "inline": True},
            {"name": "Windows Task", "value": f"`{task}`", "inline": True},
            {
                "name": "Mode",
                "value": "安全運用: 最大投稿数制限 / 既読DB / allowed_mentions無効",
                "inline": False,
            },
        ],
        "footer": {"text": "ElysiaAI RSS Dispatch"},
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def post_embed(headers: dict[str, str], channel_id: str, embed: dict[str, Any]) -> None:
    payload = {"content": "", "embeds": [embed], "allowed_mentions": {"parse": []}}
    request_json(headers, "POST", f"/channels/{channel_id}/messages", json_body=payload)


def ensure_channel(headers: dict[str, str], guild_id: str, channel_name: str, apply: bool) -> str | None:
    channels = request_json(headers, "GET", f"/guilds/{guild_id}/channels")
    existing = next((channel for channel in channels if channel.get("name") == channel_name), None)
    topic = "ElysiaAI RSS Auto News: cyber, security, daily-life, general signal feed."

    if existing:
        print(f"[*] Channel exists: #{channel_name} ({existing['id']})")
        if apply:
            request_json(headers, "PATCH", f"/channels/{existing['id']}", json_body={"topic": topic})
        else:
            print(f"[dry-run] Would update topic for #{channel_name}")
        return str(existing["id"])

    if not apply:
        print(f"[dry-run] Would create channel #{channel_name}")
        return None

    channel = request_json(
        headers,
        "POST",
        f"/guilds/{guild_id}/channels",
        json_body={"name": channel_name, "type": 0, "topic": topic},
    )
    print(f"[+] Created channel #{channel_name} ({channel['id']})")
    return str(channel["id"])


def write_default_config(guild_id: str, channel_id: str | None, channel_name: str, apply: bool) -> dict[str, Any]:
    config = {
        "guild_id": guild_id,
        "channel_id": channel_id,
        "channel_name": channel_name,
        "max_posts": 5,
        "per_feed": 8,
        "feeds": DEFAULT_FEEDS,
        "updated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    if apply:
        save_config(config)
        print(f"[+] Wrote config: {CONFIG_FILE}")
    else:
        print(f"[dry-run] Would write config: {CONFIG_FILE}")
    return config


def resolve_channel_id(args: argparse.Namespace, config: dict[str, Any]) -> str | None:
    return args.channel_id or os.getenv("RSS_NEWS_CHANNEL_ID") or config.get("channel_id")


def run_dispatch(headers: dict[str, str], args: argparse.Namespace, config: dict[str, Any]) -> dict[str, int]:
    feeds = config.get("feeds") or DEFAULT_FEEDS
    per_feed = int(config.get("per_feed") or args.per_feed)
    max_posts = int(config.get("max_posts") or args.max_posts)
    gathered = gather_items(feeds, per_feed)
    seen = load_seen()

    new_items = [item for item in gathered if item.item_id not in seen]
    print(f"[*] Gathered {len(gathered)} items; new candidates: {len(new_items)}")

    if args.prime_seen:
        for item in gathered:
            seen.add(item.item_id)
        if args.apply:
            save_seen(seen)
            print(f"[+] Primed seen DB with {len(gathered)} current items: {SEEN_FILE}")
        else:
            print(f"[dry-run] Would prime seen DB with {len(gathered)} items.")
        return {"gathered": len(gathered), "posted": 0, "primed": len(gathered)}

    channel_id = resolve_channel_id(args, config)
    if not channel_id:
        raise SystemExit("[!] No target channel configured. Run --setup --apply first.")

    posted = 0
    for item in new_items[:max_posts]:
        if not args.apply:
            print(f"[dry-run] Would post [{item.category}/{item.score}] {item.title} <{item.link}>")
            posted += 1
            continue
        post_embed(headers, channel_id, build_news_embed(item))
        seen.add(item.item_id)
        posted += 1
        print(f"[+] Posted: {item.title}")
        time.sleep(1.5)

    if args.apply and posted:
        save_seen(seen)
    return {"gathered": len(gathered), "posted": posted, "primed": 0}


def install_task(args: argparse.Namespace, apply: bool) -> bool:
    python_exe = Path(sys.executable).resolve()
    script_path = Path(__file__).resolve()
    command = f'"{python_exe}" "{script_path}" --run --apply'
    task_command = [
        "schtasks",
        "/Create",
        "/TN",
        args.task_name,
        "/SC",
        "MINUTE",
        "/MO",
        str(args.task_minutes),
        "/TR",
        command,
        "/F",
    ]
    if not apply:
        print(f"[dry-run] Would install scheduled task: {' '.join(task_command)}")
        return False
    completed = subprocess.run(task_command, text=True, capture_output=True)
    if completed.stdout.strip():
        print(completed.stdout.strip())
    if completed.returncode != 0:
        if completed.stderr.strip():
            print(completed.stderr.strip())
        raise SystemExit(f"[!] Failed to install scheduled task: {completed.returncode}")
    print(f"[+] Installed scheduled task: {args.task_name} every {args.task_minutes} minutes")
    return True


def remove_task(args: argparse.Namespace, apply: bool) -> None:
    command = ["schtasks", "/Delete", "/TN", args.task_name, "/F"]
    if not apply:
        print(f"[dry-run] Would remove scheduled task: {' '.join(command)}")
        return
    completed = subprocess.run(command, text=True, capture_output=True)
    if completed.stdout.strip():
        print(completed.stdout.strip())
    if completed.returncode != 0 and completed.stderr.strip():
        print(completed.stderr.strip())


def main() -> int:
    args = parse_args()
    token = get_bot_token()
    headers = {
        "Authorization": f"Bot {token}",
        "User-Agent": "ElysiaAI-RSS-AutoNews/1.0",
    }

    me = request_json(headers, "GET", "/users/@me")
    print(f"[*] Bot: {me.get('username')} ({me.get('id')})")

    config = load_config()
    task_installed = False

    if args.remove_task:
        remove_task(args, args.apply)

    if args.setup:
        guild = request_json(headers, "GET", f"/guilds/{args.guild_id}?with_counts=true")
        print(f"[*] Guild: {guild.get('name')} ({guild.get('id')})")
        channel_id = ensure_channel(headers, args.guild_id, args.channel_name, args.apply)
        config = write_default_config(args.guild_id, channel_id, args.channel_name, args.apply)

    if args.prime_seen:
        run_dispatch(headers, args, config)

    if args.install_task:
        task_installed = install_task(args, args.apply)

    if args.setup and args.apply:
        channel_id = resolve_channel_id(args, config)
        if channel_id:
            post_embed(headers, channel_id, build_setup_embed(channel_id, len(DEFAULT_FEEDS), task_installed))
            print("[+] Posted setup confirmation embed.")

    if args.run:
        run_dispatch(headers, args, config)

    if not any([args.setup, args.run, args.prime_seen, args.install_task, args.remove_task]):
        print("[*] Nothing selected. Try --setup, --run, --prime-seen, or --install-task.")
    if not args.apply:
        print("[dry-run] No changes were made. Add --apply to execute.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except DiscordApiError as exc:
        print(f"[!] Discord API error: {exc}", file=sys.stderr)
        raise SystemExit(1)
