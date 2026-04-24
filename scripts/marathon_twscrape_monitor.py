import asyncio
import json
import os
import re
import time
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from twscrape import API, gather

# ==========================================
# CONFIG
# ==========================================
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1496703595834376433/My9KqapPfu2M1BCPKkGGItN449FjYs-dJGQKauz-DXCPtHWYCqW71oL0XxQ0DJ7zlq79"
STATE_FILE = "data/marathon_twscrape_state.json"
TWITTER_USERS = ["MarathonTheGame", "Ziegler_Dev", "Bungie"]

# ==========================================
# UTILITIES
# ==========================================

def translate_to_ja(text):
    if not text: return ""
    # Clean text
    text = re.sub(r"http[s]?://\S+", "", text)
    text = re.sub(r"<[^<]+?>", "", text).strip()
    if not text: return ""
    
    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q={urllib.parse.quote(text)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=10)
        data = json.loads(res.read().decode("utf-8"))
        return "".join([s[0] for s in data[0] if s[0]])
    except:
        return text

def send_discord_embed(tweet, source_name):
    timestamp = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    
    # Extract images from tweet object
    image_urls = []
    if hasattr(tweet, 'media') and tweet.media:
        for m in tweet.media:
            if hasattr(m, 'fullUrl'):
                image_urls.append(m.fullUrl)

    fields = [
        {"name": "🇯🇵 日本語要約", "value": translate_to_ja(tweet.rawContent) or "翻訳不可", "inline": False},
        {"name": "🇺🇸 Original", "value": f"> {tweet.rawContent[:800]}", "inline": False}
    ]

    embeds = []
    primary_embed = {
        "title": f"Marathon Update: {source_name}",
        "description": f"New post detected via Twscrape",
        "url": tweet.url,
        "color": 0x34D399,
        "timestamp": timestamp,
        "footer": {"text": "Sovereign TW-Monitor // Meteor#6267"},
        "author": {"name": source_name, "url": f"https://x.com/{source_name}"},
        "fields": fields,
    }
    
    if image_urls:
        primary_embed["image"] = {"url": image_urls[0]}
    
    embeds.append(primary_embed)

    for extra_img in image_urls[1:4]:
        embeds.append({"url": tweet.url, "image": {"url": extra_img}})

    payload = {
        "username": "Twscrape Watcher",
        "embeds": embeds,
    }

    req = urllib.request.Request(
        DISCORD_WEBHOOK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req)
        print(f"Sent: {tweet.url}")
    except Exception as e:
        print(f"Discord Error: {e}")

# ==========================================
# MAIN
# ==========================================

async def main():
    api = API() # twscrape uses a local accounts.db by default
    
    # Check if accounts are added
    if not os.path.exists("accounts.db"):
        print("[!] Error: accounts.db not found. Please run 'twscrape add_accounts' first.")
        return

    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    state = {}
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f: state = json.load(f)

    for username in TWITTER_USERS:
        print(f"Checking @{username}...")
        try:
            # Get user ID first
            user = await api.user_by_username(username)
            if not user: continue
            
            # Get latest tweets
            tweets = await gather(api.user_tweets(user.id, limit=5))
            if not tweets: continue
            
            latest = tweets[0]
            state_key = f"{username}_id"
            
            if state_key in state and state[state_key] == str(latest.id):
                print(f"No new posts for @{username}")
                continue
            
            send_discord_embed(latest, username)
            state[state_key] = str(latest.id)
            
        except Exception as e:
            print(f"Twscrape Error (@{username}): {e}")

    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

if __name__ == "__main__":
    asyncio.run(main())
