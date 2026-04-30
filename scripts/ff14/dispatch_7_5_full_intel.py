import os
import sys
from marathon_templates import MarathonNotifier, FF14_WEBHOOK_URL, ABYSSAL_WEBHOOK_URL
from dotenv import load_dotenv

# Ensure UTF-8 for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

def main():
    notifier = MarathonNotifier()
    
    print("[*] Commencing Full Intelligence Dispatch: FFXIV Patch 7.5 'Trail to the Heavens'...")
    
    # 1. Fashion Intelligence
    fashion_title_en = "Fashion Intel: 'Alternative Dress' & 'Neo Queen' Assets"
    fashion_title_ja = "ファッション・インテリジェンス: 「Alternative Dress」&「Neo Queen」"
    fashion_content_en = (
        "Datamining confirms 'Alternative Dress Attire' (Jirai Kei style) in the 7.5 cycle. "
        "High demand predicted for monochromatic frills. Neo Queen (Sphene) attire now live in store."
    )
    fashion_content_ja = (
        "データマイニングにより「Alternative Dress Attire」（地雷系スタイル）の存在が確定しました。"
        "白黒フリルドレスの需要は極めて高く、リムサでの大流行が必至。スフェーン衣装もストア販売開始。"
    )

    # 2. Collectables (Mounts/Minions)
    collect_title_en = "Recovered Artifacts: New Mounts & Minions identified"
    collect_title_ja = "回収されたアーティファクト: 新マウント・ミニオン特定"
    collect_content_en = (
        "Mounts: Alexandrian Axe Beak (Faux), Wings of Nihility (Enuo Ex), Wings of Legacy (Collection).\n"
        "Minions: Caprino (Clyteum), Junior Jinbei (Fishing), Wind-up Prishe (Alliance)."
    )
    collect_content_ja = (
        "マウント: アレキサンダー・アックスビーク（幻）、虚無の翼（エヌオ極）、レガシー・ウィング（コンプ報酬）。\n"
        "ミニオン: カプリーノ（ID）、ジュニア・ジンベエ（漁）、マメット・プリッシュ（24人レイド）。"
    )

    # 3. Future Trajectory
    roadmap_title_en = "Operational Roadmap: Patch 7.51 'Dancing Mad'"
    roadmap_title_ja = "作戦ロードマップ: パッチ7.51「Dancing Mad」"
    roadmap_content_en = (
        "Patch 7.51 scheduled for June 2, 2026. Features 'Dancing Mad (Ultimate)' raid "
        "and expansion of Cosmic Exploration systems."
    )
    roadmap_content_ja = (
        "パッチ7.51は2026年6月2日を予定。「絶・ケフカ（Ultimate）」の実装、"
        "およびコスミック・エクスプロレーションの拡張が行われます。"
    )

    # Target channels
    targets = [
        ("FF14 NOTIFIER", FF14_WEBHOOK_URL),
        ("ABYSSAL INTEL", ABYSSAL_WEBHOOK_URL)
    ]
    
    for name, url in targets:
        if not url:
            continue
        print(f"[*] Dispatching to {name}...")
        
        # Send sequence of signals
        notifier.notify_leak_signal(
            title_en=fashion_title_en, title_ja=fashion_title_ja,
            content_en=fashion_content_en, content_ja=fashion_content_ja,
            source="Patch 7.5 Fashion Archive", webhook_url=url
        )
        notifier.notify_leak_signal(
            title_en=collect_title_en, title_ja=collect_title_ja,
            content_en=collect_content_en, content_ja=collect_content_ja,
            source="Patch 7.5 Collection Database", webhook_url=url
        )
        notifier.notify_leak_signal(
            title_en=roadmap_title_en, title_ja=roadmap_title_ja,
            content_en=roadmap_content_en, content_ja=roadmap_content_ja,
            source="Square Enix Internal Roadmap", webhook_url=url
        )
    
    print("[+] Comprehensive Intelligence dispatch complete.")

if __name__ == "__main__":
    main()
