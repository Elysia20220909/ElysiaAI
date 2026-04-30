import os
import sys
from marathon_templates import MarathonNotifier, FF14_WEBHOOK_URL
from dotenv import load_dotenv

# Ensure UTF-8 for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

def main():
    notifier = MarathonNotifier()
    
    print("[*] Dispatching FF14 Rumor/Leak Signal...")
    
    # FF14のリーク/噂話風のコンテンツ
    title_en = "Fragmented Data: 'Crystal Tower' Resonance in New Region?"
    title_ja = "断片データ：新リージョンに「クリスタルタワー」の共鳴反応？"
    
    content_en = (
        "Rumors are circulating on Reddit (r/ffxiv) about datamined strings from the latest patch. "
        "A string 'CT_RESONANCE_08' was found alongside coordinates pointing to the unmapped northern archipelago. "
        "Could this be a hint for the upcoming 8.1 Alliance Raid?"
    )
    
    content_ja = (
        "最新パッチのデータマイニングにより、Reddit等で噂が広がっています。"
        "「CT_RESONANCE_08」という文字列が、地図にない北方の諸島を指す座標と共に発見されました。"
        "これは次期パッチ 8.1 のアライアンスレイドに関するヒントなのでしょうか？"
    )
    
    # リーク信号として投稿 (FF14通知用Webhookを指定)
    notifier.notify_leak_signal(
        title_en=title_en,
        title_ja=title_ja,
        content_en=content_en,
        content_ja=content_ja,
        source="Reddit / Datamine Leak",
        link="https://www.reddit.com/r/ffxiv/",
        webhook_url=FF14_WEBHOOK_URL
    )
    
    print("[+] FF14 Rumor Signal Dispatched.")

if __name__ == "__main__":
    main()
