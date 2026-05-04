import os
import json
import httpx
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MARATHON_WEBHOOK_URL = os.getenv("MARATHON_WEBHOOK_URL") or os.getenv("DISCORD_WEBHOOK_URL")
ABYSSAL_WEBHOOK_URL = os.getenv("ABYSSAL_WEBHOOK_URL") or MARATHON_WEBHOOK_URL
FF14_WEBHOOK_URL = os.getenv("FF14_WEBHOOK_URL") or MARATHON_WEBHOOK_URL

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
    def send_webhook(content=None, embed=None, username=None, avatar_url="https://raw.githubusercontent.com/hosih/ElysiaAI/main/public/marathon_logo.png", webhook_url=None):
        target_url = webhook_url or MARATHON_WEBHOOK_URL
        if not target_url or "your_discord_webhook_url_here" in target_url:
            print("[!] Webhook URL is not configured; skipping dispatch.")
            return False

        # Use provided username, or environment variable, or fallback
        default_name = os.getenv("METEOR_USERNAME", "𝐌𝐞𝐭𝐞𝐨𝐫")
        final_username = username or default_name

        payload = {
            "username": final_username,
            "avatar_url": avatar_url
        }
        if content:
            payload["content"] = content
        if embed:
            payload["embeds"] = [embed]
        
        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.post(target_url, json=payload)
                response.raise_for_status()
                print(f"[+] Marathon Signal dispatched to {target_url[:40]}...")
                return True
        except Exception as e:
            print(f"[-] Failed to dispatch signal: {e}")
            return False

    def notify_leak_signal(self, title_en, title_ja, content_en, content_ja, source="Unknown", link=None, webhook_url=None):
        """リーク・噂話 / Leak & Rumor (Raw Text Edition)"""
        text = f"**⚠️ ABYSSAL SIGNAL: LEAK / RUMOR DETECTED**\n"
        text += f"**ORIGIN:** {source}\n"
        text += "--------------------------------------------------\n"
        text += f"**[JP] {title_ja}**\n{content_ja}\n\n"
        text += f"**[EN] {title_en}**\n{content_en}\n"
        text += "--------------------------------------------------\n"
        if link:
            text += f"**LINK:** <{link}>\n"
        text += "---"
        return self.send_webhook(content=text, webhook_url=webhook_url or ABYSSAL_WEBHOOK_URL)

    def notify_reddit_signal(self, subreddit, title_en, title_ja, content_en, content_ja, score, link=None, webhook_url=None):
        """Reddit 信号 / Reddit Signal (Raw Text Edition)"""
        text = f"**🧡 REDDIT INTEL: r/{subreddit}**\n"
        text += f"**KARMA:** 🔥 {score}\n"
        text += "--------------------------------------------------\n"
        text += f"**[JP] {title_ja}**\n{content_ja}\n\n"
        text += f"**[EN] {title_en}**\n{content_en}\n"
        text += "--------------------------------------------------\n"
        text += f"**LINK:** <{link if link else 'https://reddit.com/r/'+subreddit}>\n"
        text += "---"
        return self.send_webhook(content=text, webhook_url=webhook_url or ABYSSAL_WEBHOOK_URL)

    def notify_director_signal(self, author, text_en, text_ja, platform="X/Twitter", webhook_url=None):
        """ディレクター発言 / Director's Signal (Plain Text Edition)"""
        text = f"**📡 DIRECTOR'S SIGNAL: {author}**\n"
        text += f"**[JP]**\n{text_ja}\n\n"
        text += f"**[EN]**\n{text_en}\n"
        text += f"**Source:** {platform}\n"
        text += "---\n"
        return self.send_webhook(content=text, webhook_url=webhook_url)

    def notify_cryo_archive(self, item_name_en, item_name_ja, sector_en, sector_ja, rarity="Legendary", link=None, webhook_url=None):
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
            "timestamp": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        }
        if link:
            embed["url"] = link
        return self.send_webhook(embed=embed, webhook_url=webhook_url)

    def notify_patch_notes(self, version, summary_en, summary_ja, link=None, webhook_url=None):
        """パッチ情報 / Patch Information (Plain Text Edition)"""
        text = f"**🛠️ SYSTEM UPDATE: VERSION {version}**\n"
        text += f"**[JP]** {summary_ja}\n"
        text += f"**[EN]** {summary_en}\n"
        if link:
            text += f"**Full Notes:** <{link}>\n"
        text += "---\n"
        return self.send_webhook(content=text, webhook_url=webhook_url)

    def notify_raw_intel(self, title_ja, content_ja, title_en, content_en, webhook_url=None):
        """完全プレーンテキスト形式 / Pure Raw Text Edition"""
        text = f"### {title_ja} / {title_en}\n\n"
        text += f"**[JP]**\n{content_ja}\n\n"
        text += f"**[EN]**\n{content_en}\n"
        text += "---\n"
        return self.send_webhook(content=text, webhook_url=webhook_url)

    def notify_kit_update(self, kit_name_en, kit_name_ja, changes_en, changes_ja, link=None, webhook_url=None):
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
            "timestamp": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        }
        if link:
            embed["url"] = link
        return self.send_webhook(embed=embed, webhook_url=webhook_url)

    def notify_combat_balance(self, category_en, category_ja, change_summary_en, change_summary_ja, link=None, webhook_url=None):
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
        if link:
            embed["url"] = link
        return self.send_webhook(embed=embed, webhook_url=webhook_url)

if __name__ == "__main__":
    # Test/Demo
    notifier = MarathonNotifier()
    print("--- Generating Test Notifications ---")
    
    notifier.notify_cryo_archive("Ethereal Core", "Sector-7G", "Exotic")
    notifier.notify_patch_notes("1.0.4", "Optimized node resonance and fixed spectral leaks.", "https://example.com/patch")
    notifier.notify_kit_update("Infiltrator V2", "• Increased jump height by 15%\n• Reduced sound footprint by 20%")
    notifier.notify_combat_balance("Energy Weapons", "Recoil pattern smoothed; damage falloff increased at 50m+.")
