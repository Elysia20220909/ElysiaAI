import os
import sys

# Add parent directory to sys.path to find marathon_templates
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from marathon_templates import MarathonNotifier, MARATHON_WEBHOOK_URL, ABYSSAL_WEBHOOK_URL
from dotenv import load_dotenv

# Ensure UTF-8 for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

def main():
    notifier = MarathonNotifier()
    
    print("[*] Initiating Abyssal Intelligence Sequence: Marathon 'Nightfall'...")
    
    # 1. Season 2 Intel
    s2_title_en = "Marathon Season 2: 'Nightfall' Roadmap"
    s2_title_ja = "Marathon シーズン2: 「Nightfall」ロードマップ"
    s2_content_en = (
        "Confirmed for June: Sentinel Runner Shell, 'The Cradle' stat system, "
        "and 'Night Marsh' map variant. WSTR-77 Exotic Shotgun datamined."
    )
    s2_content_ja = (
        "6月実装確定: Sentinelシェル、「The Cradle」ステータス調整システム、"
        "「Night Marsh」マップ。WSTR-77 エキゾチック・ショットガンのデータを確認。"
    )

    # 2. Deep Lore / ARG Signals
    lore_title_en = "Deep Data: Traxus IV & Durandal Signals"
    lore_title_ja = "深層データ: Traxus IV および Durandal シグナル"
    lore_content_en = (
        "Hidden process 'DUR_7_RESONANCE' detected in client. Metadata references "
        "to Traxus IV point to a massive narrative shift and upcoming cross-title ARG."
    )
    lore_content_ja = (
        "クライアント内に隠しプロセス「DUR_7_RESONANCE」を検出。Traxus IV への参照は、"
        "物語の大規模な転換とタイトルを跨いだ ARG (代替現実ゲーム) の開始を示唆。"
    )

    # 3. Cross-Title Linkage (FFXIV 8.0)
    cross_title_en = "Cross-Title Intel: 'The Frozen Terminal' (Evercold)"
    cross_title_ja = "タイトル間連携: 「The Frozen Terminal」（Evercold）"
    cross_content_en = (
        "Map ID 'MP_ICE_WORLD_01' matches FFXIV 8.0 'Evercold' metadata. "
        "Bungie and Square Enix assets appear to be synchronizing for a Jan 2027 event."
    )
    cross_content_ja = (
        "Map ID 'MP_ICE_WORLD_01' が FFXIV 8.0 'Evercold' のメタデータと一致。"
        "Bungie とスクエニのアセットが 2027年1月のイベントに向けて同期中。"
    )

    targets = [
        ("MARATHON HUB", MARATHON_WEBHOOK_URL),
        ("ABYSSAL SECTOR", ABYSSAL_WEBHOOK_URL)
    ]
    
    for name, url in targets:
        if not url:
            continue
        print(f"[*] Dispatching to {name}...")
        
        notifier.notify_leak_signal(
            title_en=s2_title_en, title_ja=s2_title_ja,
            content_en=s2_content_en, content_ja=s2_content_ja,
            source="Marathon S2 Staging Branch", webhook_url=url
        )
        notifier.notify_leak_signal(
            title_en=lore_title_en, title_ja=lore_title_ja,
            content_en=lore_content_en, content_ja=lore_content_ja,
            source="UEC Internal Network / DURANDAL.EXE", webhook_url=url
        )
        notifier.notify_leak_signal(
            title_en=cross_title_en, title_ja=cross_title_ja,
            content_en=cross_content_en, content_ja=cross_content_ja,
            source="Cross-Title Synchronized Metadata", webhook_url=url
        )
    
    print("[+] Abyssal dispatch completed. Marathon Resonance at 100%.")

if __name__ == "__main__":
    main()
