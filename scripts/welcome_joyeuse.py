import asyncio
import sys
import io

# Ensure UTF-8 for Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from nte_notifier import NTENotifier

async def welcome():
    notifier = NTENotifier()
    content = notifier.format_terminal(
        "OPERATIVE ONBOARDED: Joyeuse#0603",
        "オペレーティブ着任: Joyeuse#0603",
        "Access granted to the ElysiaAI Intelligence Network. System status: OPTIMAL.",
        "ElysiaAI インテリジェンスネットワークへのアクセスを承認。システムステータス：正常。",
        source="Sovereign Terminal"
    )
    await notifier.send_message(content)

if __name__ == "__main__":
    asyncio.run(welcome())
