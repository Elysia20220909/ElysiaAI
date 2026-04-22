import html
import json
import os
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


# Config
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1496527812234969209/FcTRDUfKHIicCDeEeET2jvDkc5T8dVUfhKyZ4Yh_ehOSRRRp-IAQDXN8r5edTY_2hb3n"
TWITTER_USERS = ["Ziegler_Dev", "BNGServerStatus", "MarathonTheGame"]
YOUTUBE_CHANNELS = [{"name": "MarathonTheGame", "id": "UCBsbrudhKRrT9zs8iNOEjjw"}]
STATE_FILE = "watcher_state.json"
POLL_INTERVAL = 60


def clean_for_translation(text):
    if not text:
        return text
    text = html.unescape(text)
    text = re.sub(r"http[s]?://\S+", "", text)
    text = re.sub(r"<[^<]+?>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def translate_to_ja(text):
    clean_text = clean_for_translation(text)
    if not clean_text:
        return ""
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q={urllib.parse.quote(clean_text)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        res = urllib.request.urlopen(req)
        data = json.loads(res.read().decode("utf-8"))
        return "".join([sentence[0] for sentence in data[0] if sentence[0]])
    except Exception as e:
        print("Translation Error:", e)
        return clean_text


def send_discord(content):
    data = json.dumps({"content": content, "username": "Sovereign Watcher"}).encode("utf-8")
    req = urllib.request.Request(
        DISCORD_WEBHOOK_URL, data=data, headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    )
    try:
        urllib.request.urlopen(req)
        time.sleep(1)
    except Exception as e:
        print("Failed to send webhook:", e)


def get_latest_tweet(username):
    rss_url = f"https://nitter.net/{username}/rss"
    try:
        req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=10)
        xml_data = res.read()
        # Ruff warns about ET, but in this environment it's standard for quick scripts
        root = ET.fromstring(xml_data)  # noqa: S314
        channel = root.find("channel")
        if channel is None:
            return None
        item = channel.find("item")
        if item is None:
            return None
        title = item.find("title").text if item.find("title") is not None else ""
        desc = item.find("description").text if item.find("description") is not None else ""
        link = item.find("link").text if item.find("link") is not None else ""
        guid = item.find("guid").text if item.find("guid") is not None else link

        urls = re.findall(r'href=[\'"]?([^\'" >]+)', desc)
        extracted_urls = []
        for u in urls:
            if "nitter.net" in u and "/status/" in u:
                continue
            if u.startswith("/"):
                continue
            extracted_urls.append(u.replace("nitter.net", "x.com"))

        return {
            "title": html.unescape(title),
            "link": link.replace("nitter.net", "x.com"),
            "guid": guid,
            "extracted_urls": extracted_urls,
            "source": f"🐦 @{username}",
        }
    except Exception as e:
        print(f"Error fetching Twitter RSS for {username}:", e)
        return None


def get_latest_youtube(channel_info):
    name = channel_info["name"]
    channel_id = channel_info["id"]
    rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    try:
        req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=10)
        xml_data = res.read()
        root = ET.fromstring(xml_data)  # noqa: S314
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entry = root.find("atom:entry", ns)
        if entry is None:
            return None

        title = entry.find("atom:title", ns).text
        link = entry.find("atom:link", ns).attrib["href"]
        guid = entry.find("atom:id", ns).text

        source_label = f"📺 YouTube: {name}"
        if "/shorts/" in link:
            source_label = f"📱 YouTube Shorts: {name}"

        return {"title": title, "link": link, "guid": guid, "extracted_urls": [], "source": source_label}
    except Exception as e:
        print(f"Error fetching YouTube RSS for {name}:", e)
        return None


def process_item(item, state, state_prefix):
    if not item:
        return
    state_key = f"{state_prefix}_guid"
    if state_key in state:
        if state[state_key] != item["guid"]:
            print(f"New update from {item['source']}: {item['title']}")

            title_clean = re.sub("<[^<]+?>", "", item["title"])
            translated = translate_to_ja(item["title"])

            msg = f"{item['source']}\n\n"
            msg += f"🇯🇵 **【翻訳】**\n{translated}\n\n"
            msg += f"🇺🇸 **【原文】**\n> {title_clean}\n\n"

            msg += "🔗 **【リンク】**\n"
            unique_urls = list(dict.fromkeys(item["extracted_urls"]))
            for u in unique_urls:
                msg += f"{u}\n"
            msg += f"ソースURL: {item['link']}"

            send_discord(msg)
            state[state_key] = item["guid"]
    else:
        state[state_key] = item["guid"]


def main():
    print("Sovereign Multi-Watcher v10 (Twitter & YouTube Shorts Support) started.")
    state = {}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                state = json.load(f)
        except Exception:
            pass

    while True:
        # Twitter
        for user in TWITTER_USERS:
            item = get_latest_tweet(user)
            process_item(item, state, f"twitter_{user}")

        # YouTube
        for yt in YOUTUBE_CHANNELS:
            item = get_latest_youtube(yt)
            process_item(item, state, f"youtube_{yt['name']}")

        with open(STATE_FILE, "w") as f:
            json.dump(state, f)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
