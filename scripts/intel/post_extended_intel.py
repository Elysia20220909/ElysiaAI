import os
import sys
from marathon_templates import MarathonNotifier, FF14_WEBHOOK_URL, ABYSSAL_WEBHOOK_URL
from dotenv import load_dotenv

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

def main():
    notifier = MarathonNotifier()
    
    print("[*] Dispatching Extended Intelligence Package...")

    # --- FF14 Intel (Job Balance Rumors) ---
    notifier.notify_combat_balance(
        category_en="Limit Break System",
        category_ja="リミットブレイク・システム",
        change_summary_en="Speculation regarding 'LB4' implementation for upcoming expansion. Datamined icons suggest unique animations for 8.0 jobs.",
        change_summary_ja="次期拡張に向けた「LB4」実装の憶測。データマイニングされたアイコンは、8.0ジョブ固有のアニメーションを示唆しています。",
        link="https://www.reddit.com/r/ffxiv/",
        webhook_url=FF14_WEBHOOK_URL
    )

    # --- Marathon Intel (World/System) ---
    # notify_kit_update を使用してゲーム内システムの解説風に
    notifier.notify_kit_update(
        kit_name_en="Trauma Management System",
        kit_name_ja="トラウマ（負傷）管理システム",
        changes_en="Unlike traditional health, 'Trauma' reduces max HP until extracted. Critical hits from sniper rifles now apply 'Fracture' debuffs.",
        changes_ja="通常のHPとは異なり、「トラウマ」は脱出するまで最大HPを減少させ続けます。スナイパーライフルのクリティカルヒットは「骨折」デバフを付与するようになります。",
        link="https://www.bungie.net/marathon"
    )

    print("[+] Extended Intelligence Package Dispatched.")

if __name__ == "__main__":
    main()
