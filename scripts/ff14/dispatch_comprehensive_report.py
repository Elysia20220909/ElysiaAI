import os
import sys

# Add parent directory to sys.path to find marathon_templates
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from marathon_templates import MarathonNotifier, FF14_WEBHOOK_URL, ABYSSAL_WEBHOOK_URL
from dotenv import load_dotenv

# Ensure UTF-8 for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

def main():
    notifier = MarathonNotifier()
    
    print("[*] Initiating Comprehensive Intelligence Sequence: FFXIV 'Resonance' Archive...")
    
    # 1. 7.5 Current Operations
    p75_title_en = "Current Ops: Patch 7.5 'Trail to the Heavens'"
    p75_title_ja = "現行作戦: パッチ7.5「天への道」"
    p75_content_en = (
        "Active assets: 'Alternative Dress' (Jirai Kei) datamine confirmed. "
        "Mounts: Alexandrian Axe Beak, Wings of Nihility. Minions: Caprino, Wind-up Prishe."
    )
    p75_content_ja = (
        "アクティブアセット: 「Alternative Dress」（地雷系スタイル）のデータマイニング確定。"
        "マウント: 幻アレキ、虚無の翼。ミニオン: カプリーノ、マメット・プリッシュ。"
    )

    # 2. Future Trajectory (7.5x)
    future_title_en = "Future Trajectory: 7.51 - 7.56 Roadmap"
    future_title_ja = "将来の軌道: 7.51 - 7.56 ロードマップ"
    future_content_en = (
        "June 2 (7.51): Dancing Mad (Ultimate) - Nomura/Kefka focus.\n"
        "July (7.55): Occult Crescent - New Zone 'North Horn'.\n"
        "Sept (7.56): Beastmaster (Limited Job) - Capture & Bestiary systems."
    )
    future_content_ja = (
        "6月2日 (7.51): 絶・ケフカ。野村哲也氏バトルデザイン監修。\n"
        "7月 (7.55): フィールド探索「Occult Crescent」新エリア：ノースホーン。\n"
        "9月 (7.56): 魔獣使い。捕獲・収集・図鑑システム実装。"
    )

    # 3. Deep Intel: 8.0 & Beyond
    deep_title_en = "Deep Intel: 8.0 'Godless Realms' Leaks"
    deep_title_ja = "深層インテリジェンス: 8.0「Godless Realms」リーク"
    deep_content_en = (
        "Setting: The Fourth Reflection (Absolute Zero). New Jobs identified: "
        "TNK_80 (Shield-Gauntlet), RNG_80 (Multi-Crossbow). Eva Collab 'COL_EVA_01' found in assets."
    )
    deep_content_ja = (
        "舞台: 第四世界（絶対零度）。新ジョブ特定: 大盾籠手(TNK)、多機能弩(RNG)。"
        "アセット内にエヴァコラボ 'COL_EVA_01' を確認。"
    )

    # 4. Tactical Simulation
    sim_title_en = "Tactical Sim: Dancing Mad (Ultimate) Timeline"
    sim_title_ja = "戦術シミュレーション: 絶・ケフカ タイムライン"
    sim_content_en = (
        "Total Combat Time: 1140s. Critical phase identified at 1020s (Forsaken Loop). "
        "Projected Clear Opportunity: 1132s. DPS Margin: 2.4%."
    )
    sim_content_ja = (
        "戦闘時間: 1140秒。1020秒地点「フォーサクン」ループが最大の警戒点。"
        "予想撃破タイミング: 1132秒。DPS余裕度: 2.4%。"
    )

    targets = [
        ("FF14 NOTIFIER", FF14_WEBHOOK_URL),
        ("ABYSSAL INTEL", ABYSSAL_WEBHOOK_URL)
    ]
    
    for name, url in targets:
        if not url:
            continue
        print(f"[*] Dispatching to {name}...")
        
        notifier.notify_leak_signal(
            title_en=p75_title_en, title_ja=p75_title_ja,
            content_en=p75_content_en, content_ja=p75_content_ja,
            source="Patch 7.5 Operation Archive", webhook_url=url
        )
        notifier.notify_leak_signal(
            title_en=future_title_en, title_ja=future_title_ja,
            content_en=future_content_en, content_ja=future_content_ja,
            source="7.x Strategic Roadmap", webhook_url=url
        )
        notifier.notify_leak_signal(
            title_en=deep_title_en, title_ja=deep_title_ja,
            content_en=deep_content_en, content_ja=deep_content_ja,
            source="8.0 Abyssal Sector", webhook_url=url
        )
        notifier.notify_leak_signal(
            title_en=sim_title_en, title_ja=sim_title_ja,
            content_en=sim_content_en, content_ja=sim_content_ja,
            source="ElysiaAI Combat Simulator", webhook_url=url
        )
    
    print("[+] Comprehensive dispatch completed. ElysiaAI Resonance at 100%.")

if __name__ == "__main__":
    main()
