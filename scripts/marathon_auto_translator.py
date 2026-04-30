import os
import asyncio
import discord
import sys
from dotenv import load_dotenv
from deep_translator import GoogleTranslator
from marathon_templates import MarathonNotifier

# Ensure UTF-8 output for Windows
# if sys.platform == "win32":
#     import io
#     sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
TARGET_CHANNELS = [
    1478425018898841701, # #マラソン公式-お知らせ / Marathonメイン
    1499058397734109295, # #reddit＆リーク噂話🤫
    1480228067787149353, # #情報収集保管庫ch
    1359654977991082317, # #marathon-news
    1461490806329180334, # #social-comms
    1475611837910356132, # #dev-updates
    1475547886392709253  # #server-status
]

class MarathonTranslatorBot(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        intents.messages = True
        intents.message_content = True
        super().__init__(intents=intents)
        self.notifier = MarathonNotifier()
        self.translator = GoogleTranslator(source='en', target='ja')

    async def on_ready(self):
        print(f"[*] Marathon Auto-Translator: ACTIVE as {self.user}")
        print(f"[*] Monitoring {len(TARGET_CHANNELS)} channels for intelligence...")

    async def on_message(self, message):
        # Ignore all bot messages (including own and webhooks) to prevent loops
        if message.author.bot:
            return

        # Check if message is in targeted channels
        if message.channel.id not in TARGET_CHANNELS:
            return

        # Ignore empty messages
        if not message.content and not message.embeds:
            return

        print(f"[*] New intel detected in #{message.channel.name}. Processing...")

        # Extract content (preferring embeds if original is an announcement)
        raw_text = message.content
        if not raw_text and message.embeds:
            e = message.embeds[0]
            raw_text = f"{e.title}\n{e.description}" if e.title and e.description else (e.description or e.title or "")

        if not raw_text:
            return

        try:
            # Perform translation
            translated_text = self.translator.translate(raw_text)
            
            # Determine template based on channel name
            ch_name = message.channel.name.lower()
            
            if "status" in ch_name:
                self.notifier.notify_patch_notes(
                    version="LIVE STATUS",
                    summary_en=raw_text[:500],
                    summary_ja=translated_text[:500],
                    link=f"https://discord.com/channels/{message.guild.id}/{message.channel.id}/{message.id}"
                )
            elif "reddit" in ch_name or "leak" in ch_name or "噂" in ch_name:
                self.notifier.notify_leak_signal(
                    title_en="ABYSSAL INTERCEPT",
                    title_ja="深淵インテル傍受",
                    content_en=raw_text[:1000],
                    content_ja=translated_text[:1000],
                    source=f"#{message.channel.name}",
                    link=f"https://discord.com/channels/{message.guild.id}/{message.channel.id}/{message.id}"
                )
            elif "dev" in ch_name or "news" in ch_name:
                self.notifier.notify_director_signal(
                    author="Bungie Official",
                    text_en=raw_text[:1000],
                    text_ja=translated_text[:1000],
                    platform=f"#{message.channel.name}"
                )
            elif "情報" in ch_name or "保管庫" in ch_name:
                self.notifier.notify_cryo_archive(
                    item_name_en=raw_text[:50],
                    item_name_ja=translated_text[:50],
                    sector_en="Intelligence Storage",
                    sector_ja="情報収集保管庫",
                    rarity="Exotic",
                    link=f"https://discord.com/channels/{message.guild.id}/{message.channel.id}/{message.id}"
                )
            else:
                self.notifier.notify_leak_signal(
                    title_en="Channel Update",
                    title_ja="チャンネル更新",
                    content_en=raw_text[:1000],
                    content_ja=translated_text[:1000],
                    source=f"#{message.channel.name}",
                    link=None
                )
            
            print(f"[+] Translated and dispatched bilingual signal for #{message.channel.name}")

        except Exception as e:
            print(f"[-] Translation/Dispatch error: {e}")

if __name__ == "__main__":
    print("[*] Starting Bot...")
    if not BOT_TOKEN:
        print("[!] Token not found.")
        sys.exit(1)

    print("[*] Connecting...")
    bot = MarathonTranslatorBot()
    try:
        asyncio.run(bot.start(BOT_TOKEN))
    except KeyboardInterrupt:
        print("\n[*] Shutting down safely...")
    except Exception as e:
        print(f"[!] Critical Error: {e}")
