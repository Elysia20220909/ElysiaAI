import os
import json
import httpx
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

class MarathonNotifier:
    """
    Marathon (Bungie) thematic notification system for Discord.
    Provides premium-designed embeds for game events.
    """
    
    COLORS = {
        "CRYO": 0x00D2FF,        # Bright Cyan
        "PATCH": 0xFFAB00,       # Warning Orange
        "KIT": 0x7E57C2,         # Deep Purple
        "BALANCE": 0xF44336,     # Danger Red
        "DIRECTOR": 0xE91E63,    # Vibrant Pink/Magenta
        "REDDIT": 0xFF4500,      # Reddit Orange
        "LEAK": 0x000000,        # Black (Clandestine)
        "SENTINEL": 0x212121     # Dark Grey
    }

    @staticmethod
    def send_webhook(embed):
        if not WEBHOOK_URL or "your_discord" in WEBHOOK_URL:
            print("[!] DISCORD_WEBHOOK_URL not configured. Embed would have been:")
            print(json.dumps(embed, indent=2, ensure_ascii=False))
            return

        payload = {
            "embeds": [embed],
            "username": "Marathon Sentinel",
            "avatar_url": "https://raw.githubusercontent.com/hosih/ElysiaAI/main/public/marathon_logo.png"
        }
        
        try:
            with httpx.Client() as client:
                response = client.post(WEBHOOK_URL, json=payload)
                response.raise_for_status()
                print("[+] Notification dispatched successfully.")
        except Exception as e:
            print(f"[-] Failed to dispatch notification: {e}")

    def notify_leak_signal(self, title_en, title_ja, content_en, content_ja, source="Unknown", link=None):
        """リーク・噂話 / Leak & Rumor (Clandestine Signal)"""
        # Wrap content in Discord spoiler tags
        spoilered_ja = f"||{content_ja}||"
        spoilered_en = f"||{content_en}||"
        spoilered_link = f"||{link}||" if link else "Classified"

        embed = {
            "title": f"⚠️ ABYSSAL SIGNAL: LEAK / RUMOR DETECTED",
            "description": f"**[JP] {title_ja}**\n{spoilered_ja}\n\n**[EN] {title_en}**\n{spoilered_en}",
            "color": self.COLORS["LEAK"],
            "fields": [
                {"name": "Origin", "value": f"`{source}`", "inline": True},
                {"name": "Hidden Link", "value": spoilered_link, "inline": True}
            ],
            "footer": {"text": "WARNING: UNVERIFIED DATA - PROCEED WITH CAUTION"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.send_webhook(embed)

    def notify_reddit_signal(self, subreddit, title_en, title_ja, content_en, content_ja, score, link=None):
        """Reddit 信号 / Reddit Signal (Bilingual)"""
        embed = {
            "title": f"🧡 REDDIT TRENDING: r/{subreddit}",
            "description": f"**[JP] ||{title_ja}||**\n||{content_ja}||\n\n**[EN] ||{title_en}||**\n||{content_en}||",
            "color": self.COLORS["REDDIT"],
            "url": link if link else "https://reddit.com/r/" + subreddit,
            "fields": [
                {"name": "Karma Score", "value": f"🔥 {score}", "inline": True},
                {"name": "Status", "value": "Recommended Post", "inline": True}
            ],
            "footer": {"text": "Traxus Data Harvest"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.send_webhook(embed)

    def notify_director_signal(self, author, text_en, text_ja, platform="X/Twitter"):
        """ディレクター発言 / Director's Signal (Bilingual)"""
        embed = {
            "title": f"📡 DIRECTOR'S SIGNAL: {author}",
            "description": f"**[JP]**\n{text_ja}\n\n**[EN]**\n{text_en}",
            "color": self.COLORS["DIRECTOR"],
            "fields": [
                {"name": "Source", "value": platform, "inline": True},
                {"name": "Security Clearance", "value": "Level 5", "inline": True}
            ],
            "footer": {"text": "Traxus Intelligence Intercept"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.send_webhook(embed)

    def notify_cryo_archive(self, item_name_en, item_name_ja, sector_en, sector_ja, rarity="Legendary"):
        """低温アーカイブ通知 / Cryo Archive Notification (Bilingual)"""
        embed = {
            "title": "❄️ CRYO ARCHIVE: DATA RECOVERY SUCCESSFUL",
            "description": f"**[JP]** ||{sector_ja}|| より新たなアーティファクトを抽出しました。\n**[EN]** A new artifact has been extracted from the frozen depths of **{sector_en}**.",
            "color": self.COLORS["CRYO"],
            "fields": [
                {"name": "Item (JP/EN)", "value": f"`{item_name_ja}` / `{item_name_en}`", "inline": True},
                {"name": "Rarity Class", "value": rarity, "inline": True},
                {"name": "Status", "value": "Stored in Secure Terminal", "inline": False}
            ],
            "footer": {"text": f"Archive ID: {datetime.now().strftime('%Y%m%d-%H%M%S')}"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.send_webhook(embed)

    def notify_patch_notes(self, version, summary_en, summary_ja, link=None):
        """パッチ情報 / Patch Information (Bilingual)"""
        embed = {
            "title": f"🛠️ SYSTEM UPDATE: VERSION {version}",
            "description": f"**[JP]** {summary_ja}\n\n**[EN]** {summary_en}",
            "color": self.COLORS["PATCH"],
            "fields": [
                {"name": "Action Required", "value": "Node reboot recommended.", "inline": False}
            ],
            "footer": {"text": "Traxus Global Operations"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if link:
            embed["url"] = link
        self.send_webhook(embed)

    def notify_kit_update(self, kit_name_en, kit_name_ja, changes_en, changes_ja):
        """キット更新 / Kit Update (Bilingual)"""
        embed = {
            "title": f"🎒 KIT CALIBRATION: {kit_name_ja} / {kit_name_en}",
            "description": f"**[JP]** ロードアウトに以下の変更が適用されました。\n**[EN]** The following modifications have been applied to your loadout.",
            "color": self.COLORS["KIT"],
            "fields": [
                {"name": "Modifications (JP)", "value": changes_ja, "inline": False},
                {"name": "Modifications (EN)", "value": changes_en, "inline": False}
            ],
            "footer": {"text": "UEC Supply Requisition"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.send_webhook(embed)

    def notify_combat_balance(self, category_en, category_ja, change_summary_en, change_summary_ja):
        """戦闘バランス変更 / Combat Balance Changes (Bilingual)"""
        embed = {
            "title": f"⚖️ TACTICAL RE-ALIGNMENT: {category_ja} / {category_en}",
            "description": f"**[JP]** 運用均衡を維持するため、戦闘パラメータを調整しました。\n**[EN]** Global combat parameters have been shifted to maintain operational equilibrium.",
            "color": self.COLORS["BALANCE"],
            "fields": [
                {"name": "Summary (JP)", "value": change_summary_ja, "inline": False},
                {"name": "Summary (EN)", "value": change_summary_en, "inline": False}
            ],
            "footer": {"text": "Combat Protocol: V0.7-E"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.send_webhook(embed)

if __name__ == "__main__":
    # Test/Demo
    notifier = MarathonNotifier()
    print("--- Generating Test Notifications ---")
    
    notifier.notify_cryo_archive("Ethereal Core", "Sector-7G", "Exotic")
    notifier.notify_patch_notes("1.0.4", "Optimized node resonance and fixed spectral leaks.", "https://example.com/patch")
    notifier.notify_kit_update("Infiltrator V2", "• Increased jump height by 15%\n• Reduced sound footprint by 20%")
    notifier.notify_combat_balance("Energy Weapons", "Recoil pattern smoothed; damage falloff increased at 50m+.")
