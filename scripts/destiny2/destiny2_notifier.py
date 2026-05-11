import os
import json
import httpx
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DESTINY2_WEBHOOK_URL = os.getenv("DESTINY2_WEBHOOK_URL", "")

class Destiny2Notifier:
    """
    Destiny 2 thematic notification system for Discord.
    Provides premium-designed embeds for Tower news, Director signals, and Abyssal leaks.
    """
    
    COLORS = {
        "VANGUARD": 0x00B0FF,     # Light Blue (Vanguard/Traveler)
        "DIRECTOR": 0x673AB7,     # Deep Purple (Void/Ahamkara)
        "ABYSSAL": 0x000000,      # Black (Deep Sea/Leaks)
        "PATCH": 0xFFA000,        # Amber (Maintenance/Tower)
        "ALERT": 0xD32F2F,        # Red (Bungie Help/Critical)
        "LIGHT": 0xFFFFFF,        # White (The Traveler)
        "REDDIT": 0xFF4500        # Reddit Orange
    }

    @staticmethod
    def send_webhook(embed, username="Vanguard Communications", avatar_url=None):
        if not DESTINY2_WEBHOOK_URL:
            print("[!] DESTINY2_WEBHOOK_URL not configured. Embed would have been:")
            print(json.dumps(embed, indent=2, ensure_ascii=False))
            return

        payload = {
            "embeds": [embed],
            "username": username,
        }
        if avatar_url:
            payload["avatar_url"] = avatar_url
        
        try:
            with httpx.Client() as client:
                response = client.post(DESTINY2_WEBHOOK_URL, json=payload)
                response.raise_for_status()
                print("[+] Vanguard Signal dispatched successfully.")
        except Exception as e:
            print(f"[-] Failed to dispatch signal: {e}")

    def notify_vanguard_signal(self, title_en, title_ja, summary_en, summary_ja, link=None):
        """公式ニュース (TWID等) / Official News (Vanguard Transmission)"""
        embed = {
            "title": f"🛡️ VANGUARD SIGNAL: {title_ja}",
            "description": f"**[JP]** {summary_ja}\n\n**[EN]** {summary_en}",
            "color": self.COLORS["VANGUARD"],
            "url": link,
            "footer": {"text": "Eyes up, Guardian. - Zavala Control"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.send_webhook(embed, username="Vanguard Tactical")

    def notify_director_order(self, author, text_en, text_ja, platform="X/Twitter"):
        """ディレクター・P/D発言 / Director's Orders (Joe/Luke signals)"""
        embed = {
            "title": f"👁️ DIRECTOR'S INSIGHT: {author}",
            "description": f"**[JP]**\n{text_ja}\n\n**[EN]**\n{text_en}",
            "color": self.COLORS["DIRECTOR"],
            "fields": [
                {"name": "Frequency", "value": platform, "inline": True},
                {"name": "Classification", "value": "Directorate Level", "inline": True}
            ],
            "footer": {"text": "Paracausal data intercept successful."},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.send_webhook(embed, username="The Hidden")

    def notify_abyssal_leak(self, title_en, title_ja, content_en, content_ja, source="Deep Sea", link=None):
        """リーク・噂話 / Abyssal Leak (Classified Intel)"""
        # Wrap content in Discord spoiler tags
        spoilered_ja = f"||{content_ja}||"
        spoilered_en = f"||{content_en}||"
        spoilered_link = f"||{link}||" if link else "REDACTED"

        embed = {
            "title": f"🌑 ABYSSAL TRANSMISSION: CLASSIFIED INTEL",
            "description": f"**[JP] {title_ja}**\n{spoilered_ja}\n\n**[EN] {title_en}**\n{spoilered_en}",
            "color": self.COLORS["ABYSSAL"],
            "fields": [
                {"name": "Origin", "value": f"`{source}`", "inline": True},
                {"name": "Source Link", "value": spoilered_link, "inline": True}
            ],
            "footer": {"text": "DO NOT DISSEMINATE - UNVERIFIED ENTROPY"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.send_webhook(embed, username="Spider's Associate")

    def notify_tower_maintenance(self, version, summary_en, summary_ja, link=None):
        """パッチノート / Patch Notes (Tower Maintenance)"""
        embed = {
            "title": f"🛠️ TOWER MAINTENANCE: UPDATE {version}",
            "description": f"**[JP]** {summary_ja}\n\n**[EN]** {summary_en}",
            "color": self.COLORS["PATCH"],
            "url": link,
            "fields": [
                {"name": "Ghost Scan", "value": "Modifications applied to planetary nodes.", "inline": False}
            ],
            "footer": {"text": "Bungie Foundation Operations"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.send_webhook(embed, username="Banshee-44")

    def notify_ghost_alert(self, message_en, message_ja):
        """緊急アラート (Bungie Help) / Ghost Alert (Critical Status)"""
        embed = {
            "title": "🚨 GHOST ALERT: SYSTEM INSTABILITY",
            "description": f"**[JP]** {message_ja}\n**[EN]** {message_en}",
            "color": self.COLORS["ALERT"],
            "footer": {"text": "Guardian down? - System Diagnostic"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.send_webhook(embed, username="Ghost Shell Support")

    def notify_reddit_signal(self, subreddit, title_en, title_ja, score, link=None):
        """Reddit トレンド / Reddit Signal (Bilingual)"""
        embed = {
            "title": f"🧡 REDDIT TRENDING: r/{subreddit}",
            "description": f"**[JP]** {title_ja}\n\n**[EN]** {title_en}",
            "color": self.COLORS["REDDIT"],
            "url": link if link else f"https://reddit.com/r/{subreddit}",
            "fields": [
                {"name": "Karma Score", "value": f"🔥 {score}", "inline": True},
                {"name": "Status", "value": "Recommended Post", "inline": True}
            ],
            "footer": {"text": "Cryptarch Data Harvest"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.send_webhook(embed, username="Reddit Cryptarch")

if __name__ == "__main__":
    # Test execution
    notifier = Destiny2Notifier()
    print("--- Dispatching Destiny 2 Test Signals ---")
    
    # Example: TWID
    notifier.notify_vanguard_signal(
        "This Week in Destiny - 04/29/2026",
        "今週のDestiny - 2026/04/29",
        "New exotic mission details and weapon balance shifts.",
        "新たなエキゾチックミッションの詳細と武器バランスの調整について。",
        "https://www.bungie.net/7/en/News/article/twid-04-29-2026"
    )
    
    # Example: Director Signal
    notifier.notify_director_order(
        "Bungie Director",
        "We are looking into the feedback regarding the new raid difficulty. Changes coming next week.",
        "新しいレイドの難易度に関するフィードバックを確認しています。来週変更を予定しています。",
        "X (Twitter)"
    )
    
    # Example: Leak
    notifier.notify_abyssal_leak(
        "Possible Year 10 Expansion Title",
        "10年目の拡張コンテンツのタイトル案",
        "The expansion might be called 'The Final Pulse'.",
        "拡張コンテンツの名称は『ザ・ファイナル・パルス』になる可能性があります。",
        "Reddit Leak",
        "https://reddit.com/r/destinythegame"
    )
