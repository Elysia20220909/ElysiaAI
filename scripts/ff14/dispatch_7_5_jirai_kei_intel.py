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
    
    print("[*] Processing Intelligence: FFXIV Patch 7.5 Fashion Assets...")
    
    # Intelligence Data: Alternative Dress Attire (Jirai Kei)
    title_en = "Patch 7.5 Datamine: 'Alternative Dress Attire' (Jirai Kei Style)"
    title_ja = "パッチ7.5 データマイニング: 「Alternative Dress Attire」(地雷系スタイル)"
    
    content_en = (
        "Intelligence recovered regarding upcoming Patch 7.5 fashion assets. The 'Alternative Dress Attire' "
        "has been identified as a 'Jirai Kei' (Landmine Girl) style set, featuring a monochromatic frilled dress, "
        "specialized boots, and legwear. Analysts predict extreme demand (potential Mog Station blockbuster) "
        "and widespread use for 'Saber' (Fate/stay night) cosplay and Limsa Lominsa fashion trends. Dyeability confirmed."
    )
    
    content_ja = (
        "パッチ7.5のデータマイニングにより、新たな衣装「Alternative Dress Attire」の情報が回収されました。"
        "「地雷系（jirai kei）」スタイルに分類されるこのセットは、白黒のフリル付きドレス、ブーツ、レッグウェアで構成されています。"
        "コミュニティでは「3年分の開発費を賄えるほど売れる」と冗談が出るほどの高い期待が寄せられており、"
        "染色対応、セイバーのコスプレ需要、およびリムサ・ロミンサでの大流行が予測されています。"
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
        notifier.notify_leak_signal(
            title_en=title_en,
            title_ja=title_ja,
            content_en=content_en,
            content_ja=content_ja,
            source="FFXIV Patch 7.5 Datamine / Sector-75 Intelligence",
            webhook_url=url
        )
    
    print("[+] Intelligence dispatch complete.")

if __name__ == "__main__":
    main()
