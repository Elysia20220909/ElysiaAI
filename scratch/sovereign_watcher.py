import html
import json
import os
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


# Config
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1496525926446530731/mRnNBFHwzXwXhi-KLMulkmO3wtXLwGFm6TlByQiIoKCz9MDjNqECX8Qhcq1XslO076_j"
TWITTER_USERS = ["Ziegler_Dev", "BNGServerStatus", "MarathonTheGame"]
STATE_FILE = "watcher_state.json"
POLL_INTERVAL = 60


def clean_for_translation(text):
    if not text:
        return text
    # Clean up text for better translation
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
    except Exception as e:
        print("Failed to send webhook:", e)


def get_latest_tweet(username):
    rss_url = f"https://nitter.net/{username}/rss"
    try:
        req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=10)
        xml_data = res.read()
        root = ET.fromstring(xml_data)  # noqa: S314
        channel = root.find("channel")
        if channel is None:
            return None
        item = channel.find("item")
        if item is None:
            return None
        title = item.find("title").text if item.find("title") is not None else ""
        link = item.find("link").text if item.find("link") is not None else ""
        pubDate = item.find("pubDate").text if item.find("pubDate") is not None else ""
        guid = item.find("guid").text if item.find("guid") is not None else link

        title = html.unescape(title)
        title = re.sub("<[^<]+?>", "", title)

        return {"title": title, "link": link.replace("nitter.net", "x.com"), "pubDate": pubDate, "guid": guid}
    except Exception as e:
        print(f"Error fetching Twitter RSS for {username}:", e)
        return None


def get_latest_marathon_post():
    url = "https://help.marathonthegame.com/hc/api/internal/recent_activities?locale=en-us"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=10)
        data = json.loads(res.read().decode())
        if not data.get("activities"):
            return None
        post = data["activities"][0]
        return {"title": post["title"], "link": f"https://help.marathonthegame.com{post['url']}", "id": post["id"]}
    except Exception as e:
        print("Error fetching Marathon activities:", e)
        return None


def main():
    print("Sovereign Multi-Watcher v4 started.")
    state = {}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                state = json.load(f)
        except Exception:
            pass

    while True:
        # 1. Twitter Check
        for user in TWITTER_USERS:
            tweet = get_latest_tweet(user)
            if tweet:
                state_key = f"twitter_{user}_guid"
                if state_key in state:
                    if state[state_key] != tweet["guid"]:
                        print(f"New post from {user}: {tweet['title']}")
                        msg = f"🐦 **@{user}**\\n{tweet['title']}\\n🔗 {tweet['link']}\\n\\n🇯🇵 **【翻訳】**\\n{translate_to_ja(tweet['title'])}"
                        send_discord(msg)
                        state[state_key] = tweet["guid"]
                else:
                    state[state_key] = tweet["guid"]
                with open(STATE_FILE, "w") as f:
                    json.dump(state, f)

        # 2. Marathon Check
        m_post = get_latest_marathon_post()
        if m_post:
            if "marathon_id" in state:
                if state["marathon_id"] != str(m_post["id"]):
                    print(f"New Marathon Help Center activity: {m_post['title']}")
                    msg = f"🏃 **Marathon Help Center Activity**\\n{m_post['title']}\\n🔗 {m_post['link']}\\n\\n🇯🇵 **【翻訳】**\\n{translate_to_ja(m_post['title'])}"
                    send_discord(msg)
                    state["marathon_id"] = str(m_post["id"])
            else:
                state["marathon_id"] = str(m_post["id"])
            with open(STATE_FILE, "w") as f:
                json.dump(state, f)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
