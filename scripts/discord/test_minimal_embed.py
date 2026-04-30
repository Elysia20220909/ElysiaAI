import os
import sys
from marathon_templates import MarathonNotifier
from dotenv import load_dotenv

load_dotenv()

def main():
    notifier = MarathonNotifier()
    print("[*] Minimal Embed Test...")
    notifier.notify_kit_update("Test Kit", "テストキット", "No changes", "変更なし")
    print("[+] Minimal Embed Dispatched.")

if __name__ == "__main__":
    main()
