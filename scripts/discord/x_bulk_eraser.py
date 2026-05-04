import os
import json
import time
import httpx
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

# Ensure UTF-8 output for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- Requirements ---
# pip install tweepy python-dotenv httpx
# --------------------

import tweepy

load_dotenv()

# Optional report webhook. Keep the real URL in .env only.
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")

# X (Twitter) Credentials
API_KEY = os.getenv("X_API_KEY")
API_SECRET = os.getenv("X_API_SECRET")
ACCESS_TOKEN = os.getenv("X_ACCESS_TOKEN")
ACCESS_TOKEN_SECRET = os.getenv("X_ACCESS_TOKEN_SECRET")

class ElysiaXEraser:
    """
    Abyssal Deletion Protocol for X (Twitter).
    Safely purges digital footprints with real-time reporting to Discord.
    """
    
    def __init__(self, dry_run=True):
        self.dry_run = dry_run
        self.stats = {"deleted": 0, "failed": 0, "total": 0}
        self.batch_size = 10
        self.client = None
        
        if not self.dry_run:
            try:
                self.client = tweepy.Client(
                    consumer_key=API_KEY,
                    consumer_secret=API_SECRET,
                    access_token=ACCESS_TOKEN,
                    access_token_secret=ACCESS_TOKEN_SECRET
                )
            except Exception as e:
                print(f"[!] Tweepy auth failed: {e}")
        
    def send_discord_report(self, title_en, title_ja, description_en, description_ja, color=0x000000):
        if not DISCORD_WEBHOOK_URL:
            return
            
        embed = {
            "title": f"🌑 {title_ja} / {title_en}",
            "description": f"**[JP]** {description_ja}\n**[EN]** {description_en}",
            "color": color,
            "footer": {"text": "ElysiaAI - Digital Memory Sanitization"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        payload = {
            "embeds": [embed],
            "username": "ElysiaX-Eraser (Abyssal Protocol)"
        }
        
        try:
            with httpx.Client() as client:
                client.post(DISCORD_WEBHOOK_URL, json=payload)
        except Exception as e:
            print(f"[-] Discord reporting failed: {e}")

    def delete_tweets_from_archive(self, archive_path):
        """Processes tweets from a Twitter Archive JSON file (tweets.js)"""
        print(f"[*] Initiating Archive Erasure: {archive_path}")
        
        try:
            with open(archive_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Remove the 'window.YTD.tweets.part0 = ' prefix if present
                if content.startswith('window.YTD.tweets.part0 = '):
                    content = content[content.index('=') + 1:]
                tweets = json.loads(content)
        except Exception as e:
            print(f"[-] Failed to load archive: {e}")
            return

        self.stats["total"] = len(tweets)
        self.send_discord_report(
            "ERASURE PROTOCOL INITIATED", "抹消プロトコル開始",
            f"Target: {archive_path}\nTotal Tweets: {self.stats['total']}\nDry Run: {self.dry_run}",
            f"対象: {archive_path}\n総ツイート数: {self.stats['total']}\nテストモード: {self.dry_run}"
        )

        for i, entry in enumerate(tweets):
            tweet = entry.get('tweet', {})
            tweet_id = tweet.get('id_str') or tweet.get('id')
            
            if not tweet_id:
                continue

            try:
                if self.dry_run:
                    print(f"[DRY-RUN] Would delete tweet: {tweet_id}")
                    self.stats["deleted"] += 1
                else:
                    if self.client:
                        # ACTUAL DELETION - Proceed with caution
                        self.client.delete_tweet(id=tweet_id)
                        print(f"[+] Deleted: {tweet_id}")
                        self.stats["deleted"] += 1
                        time.sleep(1.5) # Rate limit respect
                    else:
                        print("[!] Deletion failed: No API client initialized.")
                        self.stats["failed"] += 1
                
                # Send periodic status updates
                if self.stats["deleted"] % self.batch_size == 0:
                    self.send_discord_report(
                        "ERASURE PROGRESS UPDATE", "抹消進捗状況",
                        f"Progress: {self.stats['deleted']}/{self.stats['total']} tweets processed.",
                        f"進捗: {self.stats['deleted']}/{self.stats['total']} ツイート処理済み。",
                        color=0x212121
                    )

            except Exception as e:
                print(f"[-] Error deleting {tweet_id}: {e}")
                self.stats["failed"] += 1

        self.send_discord_report(
            "ERASURE COMPLETE", "抹消完了",
            f"Successfully purged: {self.stats['deleted']}\nErrors: {self.stats['failed']}",
            f"抹消成功: {self.stats['deleted']}\nエラー: {self.stats['failed']}",
            color=0x00FF00 if self.stats["failed"] == 0 else 0xFFA000
        )

if __name__ == "__main__":
    # Instruction for the user
    print("=====================================================")
    print("   ELYSIA X-ERASER: ABYSSAL DELETION PROTOCOL")
    print("=====================================================")
    print("Note: This tool requires a Twitter Archive (tweets.js)")
    print("or X API credentials to perform actual deletions.")
    print("-----------------------------------------------------")
    
    # Example usage (Activated for erasure)
    eraser = ElysiaXEraser(dry_run=False)
    
    # Path to your archive file
    archive_file = "tweets.js" 
    
    if os.path.exists(archive_file):
        eraser.delete_tweets_from_archive(archive_file)
    else:
        print(f"[!] Archive file '{archive_file}' not found.")
        print("[!] Please place your Twitter Archive 'tweets.js' in this directory.")
        
        # Mock run for Discord demonstration
        eraser.send_discord_report(
            "ERASER READY", "消去ツール待機中",
            "The Abyssal Eraser is ready. Waiting for archive input or API keys.",
            "抹消ツールが起動しました。アーカイブファイルまたはAPIキーの入力を待機しています。"
        )
