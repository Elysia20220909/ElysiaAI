import io
import os
import sys

import discord
from dotenv import load_dotenv


if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")


load_dotenv()

TOKEN = os.getenv("DISCORD_BOT_TOKEN", "").strip().strip('"').strip("'")
BOT_STATUS = os.getenv("DISCORD_BOT_STATUS", "Coddex").strip()

if not TOKEN:
    raise SystemExit("[!] DISCORD_BOT_TOKEN is missing in .env")


intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)


@client.event
async def on_ready() -> None:
    print(f"We have logged in as {client.user}")
    await client.change_presence(activity=discord.Game(name=BOT_STATUS))


@client.event
async def on_message(message: discord.Message) -> None:
    if message.author.bot or message.author == client.user:
        return

    content = message.content.strip()

    if content.startswith("hello"):
        await message.channel.send("Hello!")
    elif content.startswith("おもち"):
        await message.channel.send("もちもち")


def main() -> None:
    client.run(TOKEN)


if __name__ == "__main__":
    main()
