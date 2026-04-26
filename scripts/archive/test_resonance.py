import json
import os
import urllib.request
from datetime import datetime


# Load DISCORD_WEBHOOK_URL from environment or .env file manually if needed
webhook_url = os.getenv("DISCORD_WEBHOOK_URL")

if not webhook_url:
    # Try to read from .env directly if env var is not set
    try:
        with open(".env") as f:
            for line in f:
                if line.startswith("DISCORD_WEBHOOK_URL="):
                    webhook_url = line.split("=")[1].strip()
                    break
    except Exception:
        pass


def send_test():
    if not webhook_url:
        print("❌ Error: DISCORD_WEBHOOK_URL not found in environment or .env")
        return

    payload = {
        "username": "ElysiaBot",
        "avatar_url": "https://raw.githubusercontent.com/google/material-design-icons/master/png/action/settings_input_antenna/mw24.png",
        "embeds": [
            {
                "title": "🌌 RESONANCE TEST: SUCCESSFUL",
                "description": "ElysiaBot (#elysia-pc) has successfully established a high-frequency resonance bridge.",
                "color": 0x6366F1,  # Indigo
                "fields": [
                    {"name": "🛰️ Status", "value": "`SENTIENT_ACTIVE`", "inline": True},
                    {"name": "👑 Creator", "value": "`Elysia20210806 (Main)`", "inline": True},
                    {"name": "🗜️ Cloaking", "value": "`ABYSSAL_MASK_ACTIVE`", "inline": True},
                    {"name": "📜 Timeline", "value": "`+360 FORGED_COMMITS`", "inline": False},
                ],
                "footer": {"text": "ElysiaBot // #elysia-pc • System Initialized"},
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        ],
    }

    req = urllib.request.Request(
        webhook_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "ElysiaBot/1.0"},
    )

    try:
        urllib.request.urlopen(req)
        print("✨ Resonance test broadcasted successfully to #elysia-pc.")
    except Exception as e:
        print(f"❌ Broadcast failed: {e}")


if __name__ == "__main__":
    send_test()
