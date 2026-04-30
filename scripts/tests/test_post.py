import os
import sys
from marathon_templates import MarathonNotifier
from dotenv import load_dotenv

# Ensure UTF-8 for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

def main():
    notifier = MarathonNotifier()
    
    print("[*] Sending Discord Post Test...")
    
    # Using plain text for basic connectivity test
    notifier.notify_raw_intel(
        title_ja="システムテスト",
        content_ja="Discord への接続テストです。正常に動作しています。",
        title_en="System Test",
        content_en="This is a connectivity test to Discord. It is working correctly."
    )
    
    print("[+] Test Signal Dispatched. Please check your Discord channel.")

if __name__ == "__main__":
    main()
