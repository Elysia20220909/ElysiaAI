import os
from marathon_templates import MarathonNotifier

def inject_leak_signals():
    notifier = MarathonNotifier()
    print("[*] Intercepting Abyssal signals (Leaks & Rumors)...")

    # 1. New Map Leak
    notifier.notify_leak_signal(
        title_en="New Map Leak: 'The Orbital Spire'",
        title_ja="新マップリーク：『オービタル・スパイア』",
        content_en="Leaked assets show a multi-level vertical map set in a decaying orbital station. Features low-gravity zones and external hull combat.",
        content_ja="流出したアセットによると、崩壊した軌道ステーションを舞台にした垂直構造のマップ。低重力エリアや船外活動での戦闘が含まれるとのこと。",
        source="Abyssal-Data-Miner",
        link="https://marathon.leaks.io/orbital_spire_assets"
    )

    # 2. Exotic Weapon Rumor
    notifier.notify_leak_signal(
        title_en="Rumor: New Exotic Sniper 'Abyssal Gaze'",
        title_ja="噂：新エキゾチック・スナイパー『アビサル・ゲイズ』",
        content_en="Rumored to have a thermal scope that can detect Runners through thin walls for 2 seconds after an extraction signal is triggered.",
        content_ja="脱出信号がトリガーされた後、2秒間だけ薄い壁越しにランナーを検知できるサーマルスコープを搭載しているとの噂。",
        source="Runner-Underground",
        link="https://marathon.rumors.com/abyssal_gaze"
    )

if __name__ == "__main__":
    inject_leak_signals()
