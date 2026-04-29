import os
from marathon_templates import MarathonNotifier

def inject_director_posts():
    notifier = MarathonNotifier()
    print("[*] Intercepting Director Joe Ziegler's latest transmissions...")

    # 1. Combat Balance Outliers
    notifier.notify_director_signal(
        author="Joe Ziegler (Game Director)",
        text_en="We are planning balance changes to address outliers in the combat space. Bubble Shields are currently too easy to obtain and overly powerful in many scenarios.",
        text_ja="戦闘環境における『突出した要素』に対処するため、バランス調整を計画しています。特にバブルシールドは現状、入手が容易すぎる一方で、多くの状況で強力すぎると判断しています。"
    )

    # 2. WSTR Shotgun Dominance
    notifier.notify_director_signal(
        author="Joe Ziegler (Game Director)",
        text_en="The WSTR shotgun has become a dominant option that eclipses other short-range alternatives. We want to ensure more counterplay and variety in loadouts.",
        text_ja="WSTRショットガンが支配的な選択肢となり、他の近距離武器の影が薄くなっています。より多くのカウンタープレイを可能にし、装備の多様性を確保したいと考えています。"
    )

    # 3. Experimental Mode
    notifier.notify_director_signal(
        author="Joe Ziegler (Game Director)",
        text_en="Unveiling a new experimental mode: 'Dire Marsh Sponsored'. Restricted to basic white-tier kits to study the 'zero to hero' loop. Good luck Runners.",
        text_ja="新実験モード『Dire Marsh Sponsored』を公開しました。基本の白ティア・キットのみに制限し、『ゼロから英雄へ』のループを検証します。ランナー諸君、幸運を。"
    )

if __name__ == "__main__":
    inject_director_posts()
