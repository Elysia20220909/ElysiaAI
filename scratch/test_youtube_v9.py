import html
import json
import os
import re
import time
import urllib.parse
import urllib.request


DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")


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


# Mock YouTube update
source = "📺 YouTube: MarathonTheGame"
mock_title = "Marathon | Somewhere in the Heavens - Official Trailer"
mock_link = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

translated = translate_to_ja(mock_title)

msg = f"{source} (Test Post)\n\n"
msg += f"🇯🇵 **【翻訳】**\n{translated}\n\n"
msg += f"🇺🇸 **【原文】**\n> {mock_title}\n\n"
msg += "🔗 **【リンク】**\n"
msg += f"ソースURL: {mock_link}"

send_discord(msg)
print("YouTube test post complete.")
