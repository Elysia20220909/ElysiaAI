import os
from marathon_templates import MarathonNotifier

def inject_news():
    notifier = MarathonNotifier()
    print("[*] Injecting real-world Marathon news signals (Bilingual Mode)...")

    # 1. Patch Information
    notifier.notify_patch_notes(
        version="1.0.6.2",
        summary_en="Focused on weapon balancing for the WSTR Combat Shotgun and quality-of-life improvements. Added vent covers in Biostock and Preservation zones.",
        summary_ja="WSTRコンバットショットガンのバランス調整とQoLの向上に焦点を当てました。BiostockとPreservationゾーンに通気口カバーを追加しました。",
        link="https://www.bungie.net/en/Explore/Detail/News/51234"
    )

    # 2. Combat Balance
    notifier.notify_combat_balance(
        category_en="Weapon Tuning (Update 1.0.6.2)",
        category_ja="武器調整 (Update 1.0.6.2)",
        change_summary_en="**WSTR Combat Shotgun:** Base damage 78 -> 85; Crit multiplier 1.15x -> 1.05x.\n**MIPS Slug Converter:** Crit multiplier 1.15x -> 1.9x.",
        change_summary_ja="**WSTRコンバットショットガン:** ベースダメージ 78 -> 85; クリティカル倍率 1.15x -> 1.05x.\n**MIPSスラッグコンバーター:** クリティカル倍率 1.15x -> 1.9x."
    )

    # 3. Kit Update
    notifier.notify_kit_update(
        kit_name_en="Cryo Archive Sponsored Kit",
        kit_name_ja="低温アーカイブ・スポンサードキット",
        changes_en="Weekly Reward: Players can now claim one free sponsored kit each week. Available at the terminal.",
        changes_ja="週次報酬: 毎週1つの無料スポンサードキットを受け取れるようになりました。ターミナルから入手可能です。"
    )

    # 4. Cryo Archive
    notifier.notify_cryo_archive(
        item_name_en="MIPS Slug Converter Mod",
        item_name_ja="MIPSスラッグコンバーター・モッド",
        sector_en="Preservation Zone",
        sector_ja="Preservationゾーン",
        rarity="Legendary"
    )

if __name__ == "__main__":
    inject_news()
