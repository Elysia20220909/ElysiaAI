import html
import json
import re
import time
import urllib.parse
import urllib.request


DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1496525926446530731/mRnNBFHwzXwXhi-KLMulkmO3wtXLwGFm6TlByQiIoKCz9MDjNqECX8Qhcq1XslO076_j"


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
    except Exception:
        return clean_text


def send_discord(content):
    data = json.dumps({"content": content, "username": "Sovereign Watcher"}).encode("utf-8")
    req = urllib.request.Request(
        DISCORD_WEBHOOK_URL, data=data, headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    )
    urllib.request.urlopen(req)
    time.sleep(1)


# Mock tweet
user = "MarathonTheGame"
mock_title = "The path ahead is clear. Welcome to the new era of Marathon."
mock_tweet_link = "https://x.com/MarathonTheGame/status/123456789"

print(f"Testing translation and post for @{user}...")
translated = translate_to_ja(mock_title)

msg = f"🐦 **@{user}** (Test Post)\\n\\n{mock_title}\\n\\n🔗 {mock_tweet_link}\\n\\n🇯🇵 **【翻訳】**\\n{translated}"
send_discord(msg)
print("Test post sent.")
