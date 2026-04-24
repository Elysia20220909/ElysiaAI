import html
import json
import os
import re
import time
import urllib.parse
import urllib.request
from datetime import UTC, datetime

from defusedxml import ElementTree


# ==========================================
# MARATHON HOOK MONITOR CONFIG
# ==========================================
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")
STATE_FILE = "data/marathon_hook_state.json"

# Targets: official game account and key developers/status
TWITTER_USERS = ["MarathonTheGame", "Ziegler_Dev", "Bungie"]

# Reliable Nitter instances for RSS (Twitter API fallback)
# Prioritizes environment variable for Docker/Server flexibility
env_nitter = os.getenv("NITTER_HOST")
NITTER_INSTANCES = [
    env_nitter if env_nitter else "nitter:8080", # Env Priority
    "localhost:8080",                           # Local Self-hosted
    "nitter.net",
    "nitter.poast.org",
    "nitter.unixfox.eu",
    "nitter.privacydev.net",
    "nitter.it",
    "nitter.1d4.us",
    "nitter.woodland.cafe",
    "nitter.sethforprivacy.com",
    "nitter.moomoo.me"
]

# ==========================================
# UTILITIES
# ==========================================

def clean_text(text):
    if not text:
        return ""
    text = html.unescape(text)
    # Remove URLs for translation clarity
    text = re.sub(r"http[s]?://\S+", "", text)
    # Remove HTML tags
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
        if res.status == 429:
            print("Translation Error: Rate limited (429)")
            return cleaned
        data = json.loads(res.read().decode("utf-8"))
        return "".join([s[0] for s in data[0] if s[0]])
    except Exception as e:
        print(f"Translation Error: {e}")
        return cleaned

def send_discord_embed(title, description, url, source_name, image_urls=None):
    timestamp = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    color = 0x34D399 

    fields = [
        {"name": "🇯🇵 日本語要約", "value": translate_to_ja(description) or "翻訳不可", "inline": False},
        {"name": "🇺🇸 Original", "value": f"> {description[:800]}", "inline": False}
    ]

    # Discord allows grouping images by using multiple embeds with the same URL
    embeds = []
    
    # Primary embed with text and fields
    primary_embed = {
        "title": title[:250],
        "description": f"New post from **{source_name}**",
        "url": url,
        "color": color,
        "timestamp": timestamp,
        "footer": {"text": "Marathon Intelligence System // Meteor#6267"},
        "author": {"name": source_name, "url": f"https://x.com/{source_name.replace('@', '')}"},
        "fields": fields,
    }
    
    if image_urls and len(image_urls) > 0:
        primary_embed["image"] = {"url": image_urls[0]}
    
    embeds.append(primary_embed)

    # Additional images as separate embeds (grouped by Discord if they share the same URL)
    if image_urls and len(image_urls) > 1:
        for extra_img in image_urls[1:4]: # Limit to 4 images (Twitter max)
            embeds.append({
                "url": url,
                "image": {"url": extra_img}
            })

    payload = {
        "username": "Marathon Watcher",
        "avatar_url": "https://raw.githubusercontent.com/google/material-design-icons/master/png/action/settings_input_antenna/mw24.png",
        "embeds": embeds,
    }

    req = urllib.request.Request(
        DISCORD_WEBHOOK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    )
    
    try:
        urllib.request.urlopen(req)
        print(f"Successfully sent update from {source_name} with {len(embeds)} embeds")
    except Exception as e:
        print(f"Discord Webhook Error: {e}")

# ==========================================
# FETCHERS
# ==========================================

def fetch_twitter_rss(username):
    for instance in NITTER_INSTANCES:
        rss_url = f"https://{instance}/{username}/rss"
        print(f"Trying {rss_url}...")
        try:
            req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
            res = urllib.request.urlopen(req, timeout=10)
            if res.status != 200:
                continue
                
            root = ElementTree.fromstring(res.read())
            items = root.findall("channel/item")
            if not items:
                continue
                
            # We only care about the latest one
            item = items[0]
            title = item.find("title").text
            link = item.find("link").text.replace(instance, "x.com")
            guid = item.find("guid").text
            desc = item.find("description").text or ""
            
            # Extract ALL image URLs from description
            images = []
            img_matches = re.findall(r'<img src="([^"]+)"', desc)
            for img_url in img_matches:
                # If it's a relative path, prepend the instance URL
                if img_url.startswith("/"):
                    img_url = f"https://{instance}{img_url}"
                images.append(img_url)
            
            return {
                "source": f"@{username}",
                "title": title,
                "link": link,
                "guid": guid,
                "description": title, # Usually title is the full tweet in Nitter RSS
                "images": images
            }
        except Exception as e:
            print(f"Error with {instance}: {e}")
            continue
    return None

# ==========================================
# MAIN
# ==========================================

def main():
    import sys
    
    # Support command line arguments for usernames
    # Filter out flags
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    is_test = "--test" in sys.argv
    is_loop = "--loop" in sys.argv
    
    targets = args if args else TWITTER_USERS
    
    # Priority: Env > Hardcoded
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL", DISCORD_WEBHOOK_URL)
    
    print(f"[{datetime.now()}] Marathon Hook Monitor Awakening...")
    print(f"[*] Targets: {', '.join(targets)}")
    print(f"[*] Webhook: {webhook_url[:40]}...")
    
    if is_test:
        print("[TEST MODE] State check bypassed. Sending latest post regardless of history.")
    
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)

    def run_cycle():
        state = {}
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE) as f:
                    state = json.load(f)
            except Exception:
                pass

        for user in targets:
            print(f"Checking @{user}...")
            post = fetch_twitter_rss(user)
            
            if post:
                state_key = f"twitter_{user}_guid"
                if not is_test and state_key in state and state[state_key] == post["guid"]:
                    print(f"No new posts for @{user}")
                    continue
                
                print(f"New post detected for @{user}!")
                send_discord_embed(
                    title=f"Marathon Update: {user}",
                    description=post["description"],
                    url=post["link"],
                    source_name=post["source"],
                    image_urls=post["images"]
                )
                
                # Update state
                state[state_key] = post["guid"]
                # Small delay to avoid rate limits
                time.sleep(2)

        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
        
        print(f"[{datetime.now()}] Cycle Complete.")

    if is_loop:
        print("[*] Entering background loop mode (Interval: 10m)")
        try:
            while True:
                run_cycle()
                time.sleep(600) # Check every 10 minutes
        except KeyboardInterrupt:
            print("[*] Monitor returning to Abyss.")
    else:
        run_cycle()

if __name__ == "__main__":
    main()
