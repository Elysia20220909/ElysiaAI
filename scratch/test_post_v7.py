import html
import json
import re
import time
import urllib.parse
import urllib.request


DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1496527812234969209/FcTRDUfKHIicCDeEeET2jvDkc5T8dVUfhKyZ4Yh_ehOSRRRp-IAQDXN8r5edTY_2hb3n"


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


def send_discord(content, source_name):
    data = json.dumps({"content": content, "username": "Sovereign Watcher"}).encode("utf-8")
    req = urllib.request.Request(
        DISCORD_WEBHOOK_URL, data=data, headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    )
    urllib.request.urlopen(req)
    time.sleep(1)


user = "MarathonTheGame"
mock_title = "Patch Notes 1.5.0 are now live! We've made massive changes to the progression system and balanced several weapons. Read all the details in our latest blog post."
mock_desc = 'Patch Notes 1.5.0 are now live! We\'ve made massive changes to the progression system and balanced several weapons. Read all the details in our latest blog post. <br><a href="https://www.marathonthegame.com/patch-1-5-0">marathonthegame.com/patch-1-5-0</a><br><a href="https://youtube.com/watch?v=dQw4w9WgXcQ">Video Overview</a>'
mock_tweet_link = "https://x.com/MarathonTheGame/status/123456789"

urls = re.findall(r'href=[\'"]?([^\'" >]+)', mock_desc)
extracted_urls = []
for u in urls:
    if "nitter.net" in u and "/status/" in u:
        continue
    if u.startswith("/"):
        continue
    extracted_urls.append(u.replace("nitter.net", "x.com"))

title_clean = html.unescape(mock_title)
title_clean = re.sub("<[^<]+?>", "", title_clean)

translated = translate_to_ja(mock_title)

# Build the super readable Bilingual message
combined_msg = f"🐦 **@{user}**\n\n"
combined_msg += f"🇯🇵 **【翻訳】**\n{translated}\n\n"
combined_msg += f"🇺🇸 **【原文】**\n> {title_clean}\n\n"

combined_msg += "🔗 **【リンク】**\n"
if extracted_urls:
    seen = set()
    unique_urls = [x for x in extracted_urls if not (x in seen or seen.add(x))]
    combined_msg += "\n".join(unique_urls) + "\n"
combined_msg += f"{mock_tweet_link}"

send_discord(combined_msg, user)

print("Test bilingual format complete.")
