import os
import asyncio
import discord
import sys
from dotenv import load_dotenv

# Ensure UTF-8 output for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

# --- Configuration ---
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")

class PurgeBot(discord.Client):
    def __init__(self, channel_id, limit=100):
        intents = discord.Intents.default()
        intents.messages = True
        intents.message_content = True
        super().__init__(intents=intents)
        self.target_channel_id = int(channel_id)
        self.purge_limit = limit

    async def on_ready(self):
        print(f"[*] Logged in as {self.user} (ID: {self.user.id})")
        channel = self.get_channel(self.target_channel_id)
        
        if not channel:
            print(f"[-] Could not find channel with ID {self.target_channel_id}")
            await self.close()
            return

        print(f"[*] Commencing purge in #{channel.name} (Target Limit: {self.purge_limit})...")
        
        try:
            # Check for Manage Messages permission
            permissions = channel.permissions_for(channel.guild.me)
            if not permissions.manage_messages:
                print("[-] Error: Bot lacks 'Manage Messages' permission.")
                await self.close()
                return

            def check(m):
                return True # Delete everything

            deleted = await channel.purge(limit=self.purge_limit, check=check)
            print(f"[*] Successfully removed {len(deleted)} messages.")
        except discord.NotFound:
            print("[!] Warning: Some messages were already deleted or not found.")
        except Exception as e:
            print(f"[-] An error occurred: {e}")
        
        print("[*] Operation complete. Shutting down...")
        await self.close()

async def start_purge(channel_id, limit):
    if not BOT_TOKEN:
        print("[!] DISCORD_BOT_TOKEN not found in .env")
        return

    # Use a basic log level to avoid 429 noise in the terminal
    bot = PurgeBot(channel_id, limit)
    try:
        await bot.start(BOT_TOKEN)
    except discord.LoginFailure:
        print("[!] Invalid Bot Token provided.")
    except Exception as e:
        print(f"[-] Connection error: {e}")

if __name__ == "__main__":
    # Target Configuration
    TARGET_CHANNEL_ID = os.getenv("PURGE_CHANNEL_ID")
    LIMIT = int(os.getenv("PURGE_LIMIT", 1000))

    print("=====================================================")
    print("   ELYSIA DISCORD BOT PURGER (STABLE EDITION)")
    print("=====================================================")

    if not TARGET_CHANNEL_ID:
        print("[!] Error: PURGE_CHANNEL_ID not set.")
        sys.exit(0)

    try:
        asyncio.run(start_purge(TARGET_CHANNEL_ID, LIMIT))
    except KeyboardInterrupt:
        print("\n[!] Purge interrupted by user. Stopping safely...")
