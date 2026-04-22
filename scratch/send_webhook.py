import json
import urllib.request


webhook_url = "https://discord.com/api/webhooks/1496525926446530731/mRnNBFHwzXwXhi-KLMulkmO3wtXLwGFm6TlByQiIoKCz9MDjNqECX8Qhcq1XslO076_j"
with open("c:/Users/hosih/GitHub/ElysiaAI/docs/philosophies/awakening_8856E215_RESOLVED.md", encoding="utf-8") as f:
    text = f.read()

data = json.dumps({"content": text}).encode("utf-8")
req = urllib.request.Request(
    webhook_url, data=data, headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
)
try:
    response = urllib.request.urlopen(req)
    print("Webhook sent successfully!", response.read())
except Exception as e:
    print("Failed to send webhook:", e)
