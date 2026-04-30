import os
import sys
from marathon_templates import MarathonNotifier, ABYSSAL_WEBHOOK_URL
from dotenv import load_dotenv

# Ensure UTF-8 for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

def dispatch_marathon_intel():
    notifier = MarathonNotifier()
    
    print("[*] Commencing Marathon 'Abyssal Sector' Intel Transfer...")
    
    # Intelligence Data
    intel_items = [
        {
            "title_en": "Theater Update: Abyssal Swamp Map",
            "title_ja": "新マップ: 深淵の沼地 (Abyssal Swamp)",
            "content_en": "Media event leaks confirm the 'Abyssal Swamp' biome. High-hazard terrain with a 15-minute 'Lockdown' trigger. Red bubbles indicate POI entry points.",
            "content_ja": "メディア公開により『深淵の沼地』バイオームが確定。マッチ開始15分で発生する『封鎖』イベントでは、POIが赤い泡に包まれ高難度化します。",
            "source": "Shanghai Media Event / Sector-04 Leak"
        },
        {
            "title_en": "Protocol Delta: C.A.R.R.I. Implementation",
            "title_ja": "プロトコル: C.A.R.R.I. 実装",
            "content_en": "CyberAcme Runner Reinforcement Initiative is now active. Reinforced shield gating and tactical feedback during extraction phases.",
            "content_ja": "CyberAcme Runner Reinforcement Initiative が有効化されました。脱出フェーズ中のシールド性能向上と戦術フィードバックが提供されます。",
            "source": "Patch 1.0.6.2 Release Notes"
        },
        {
            "title_en": "Datamined Strings: Sector-99 & Isolation Zone",
            "title_ja": "解析データ: Sector-99 & 隔離区域",
            "content_en": "Strings for 'Isolation Zone' (Subterranean Lab) and 'Sector-99 Protocol' found in the core binary. Likely Season 2 content.",
            "content_ja": "コアバイナリから『隔離区域（地下研究所）』および『Sector-99 プロトコル』の文字列を検出。シーズン2に向けた伏線の可能性が高いです。",
            "source": "Deep Abyssal Binary Scrape"
        }
    ]

    for item in intel_items:
        notifier.notify_leak_signal(
            title_en=item["title_en"],
            title_ja=item["title_ja"],
            content_en=item["content_en"],
            content_ja=item["content_ja"],
            source=item["source"],
            webhook_url=ABYSSAL_WEBHOOK_URL
        )
    
    print("\n[+] Marathon Intel Transfer Complete.")

if __name__ == "__main__":
    dispatch_marathon_intel()
