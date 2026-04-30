import os
import sys
from marathon_templates import MarathonNotifier, MARATHON_WEBHOOK_URL, ABYSSAL_WEBHOOK_URL, FF14_WEBHOOK_URL
from dotenv import load_dotenv

# Ensure UTF-8 for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

def main():
    notifier = MarathonNotifier()
    
    targets = [
        ("MARATHON MAIN", MARATHON_WEBHOOK_URL),
        ("ABYSSAL/LEAKS", ABYSSAL_WEBHOOK_URL),
        ("FF14 NOTIFIER", FF14_WEBHOOK_URL)
    ]
    
    print(f"[*] Commencing Global Broadcast Test for {len(targets)} channels...")
    
    for name, url in targets:
        if not url:
            print(f"[!] Skipping {name}: Webhook URL not set.")
            continue
            
        print(f"[*] Dispatching to {name}...")
        notifier.notify_raw_intel(
            title_ja=f"全チャンネル通信テスト - {name}",
            content_ja=f"こちらは {name} チャンネルの通信テストです。接続状況：正常。",
            title_en=f"Global Broadcast Test - {name}",
            content_en=f"Connectivity test for {name} channel. Status: Operational.",
            webhook_url=url
        )
    
    print("\n[+] Global Broadcast Test Complete.")

if __name__ == "__main__":
    main()
