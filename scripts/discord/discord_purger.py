import os
import time
import httpx
import sys
from dotenv import load_dotenv

# Ensure UTF-8 output for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

# --- SECURITY WARNING ---
# Using a user token to automate your account (Self-botting) 
# is against Discord's Terms of Service. 
# USE AT YOUR OWN RISK. Your account may be banned.
# ------------------------

DISCORD_TOKEN = os.getenv("DISCORD_USER_TOKEN")

class DiscordPurger:
    def __init__(self, token):
        self.headers = {
            "Authorization": token,
            "Content-Type": "application/json"
        }
        self.base_url = "https://discord.com/api/v9"

    def get_messages(self, channel_id, author_id, limit=100):
        """Fetch messages from a channel to identify deletion targets."""
        url = f"{self.base_url}/channels/{channel_id}/messages?limit={limit}"
        response = httpx.get(url, headers=self.headers)
        if response.status_code != 200:
            print(f"[-] Failed to fetch messages: {response.text}")
            return []
        
        # Filter messages sent by the user
        messages = response.json()
        return [m["id"] for m in messages if m["author"]["id"] == author_id]

    def delete_message(self, channel_id, message_id):
        """Delete a single message with rate-limit respect."""
        url = f"{self.base_url}/channels/{channel_id}/messages/{message_id}"
        response = httpx.delete(url, headers=self.headers)
        
        if response.status_code == 204:
            return True
        elif response.status_code == 429:
            retry_after = response.json().get("retry_after", 5)
            print(f"[!] Rate limited. Waiting {retry_after}s...")
            time.sleep(retry_after)
            return self.delete_message(channel_id, message_id)
        else:
            print(f"[-] Failed to delete {message_id}: {response.status_code}")
            return False

    def purge(self, channel_id, author_id, limit=50):
        print(f"[*] Starting Discord Purge for Author {author_id} in Channel {channel_id}")
        message_ids = self.get_messages(channel_id, author_id, limit)
        
        if not message_ids:
            print("[!] No messages found to delete.")
            return

        print(f"[*] Found {len(message_ids)} messages. Commencing erasure...")
        
        deleted = 0
        for m_id in message_ids:
            if self.delete_message(channel_id, m_id):
                deleted += 1
                print(f"[+] Deleted: {m_id} ({deleted}/{len(message_ids)})")
                # Safety delay to avoid immediate flagging
                time.sleep(1.5) 
            
        print(f"[*] Purge complete. {deleted} messages removed.")

if __name__ == "__main__":
    # This requires manual input of IDs
    if not DISCORD_TOKEN:
        print("[!] DISCORD_USER_TOKEN not found in .env")
        sys.exit(1)

    # USER MUST PROVIDE THESE
    TARGET_CHANNEL_ID = "" # Provide Channel ID
    MY_USER_ID = ""        # Provide your User ID

    if not TARGET_CHANNEL_ID or not MY_USER_ID:
        print("=====================================================")
        print("   ELYSIA DISCORD PURGER: ABYSSAL CLEANUP")
        print("=====================================================")
        print("[!] Configuration required in scripts/discord_purger.py")
        print("[!] Please set TARGET_CHANNEL_ID and MY_USER_ID.")
        sys.exit(0)

    purger = DiscordPurger(DISCORD_TOKEN)
    purger.purge(TARGET_CHANNEL_ID, MY_USER_ID)
