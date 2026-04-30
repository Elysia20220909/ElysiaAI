import asyncio
from nte_notifier import NTENotifier

async def dispatch_nte_launch_intel():
    notifier = NTENotifier()
    
    print("[*] Commencing NTE Global Launch Intelligence Broadcast...")
    
    # Intelligence Package 01: Launch Success & Codes
    content_01 = notifier.format_terminal(
        "NTE Launch: Operational Status & Gift Codes",
        "NTE ローンチ状況 & ギフトコード報告",
        "Global servers are online. Active codes: NTE0429, NTENANALLYGO, NTENOWTOENJOY.",
        "グローバルサーバーがオンラインになりました。有効なコード: NTE0429, NTENANALLYGO, NTENOWTOENJOY。",
        source="Hesperia Launch Monitor"
    )
    await notifier.send_message(content_01)
    
    # Intelligence Package 02: Porsche Collaboration Leak
    content_02 = notifier.format_terminal(
        "Datamined: Porsche x NTE Collaboration",
        "データマイニング: ポルシェ × NTE コラボ",
        "Internal assets for Porsche vehicles and a dedicated showroom found in the launch build. Official announcement expected in V1.1.",
        "ローンチビルド内にポルシェの実車アセットと専用ショールームのデータを発見。Ver 1.1での正式発表が予想されます。",
        source="City Data Scrape"
    )
    await notifier.send_message(content_02)
    
    # Intelligence Package 03: Performance Optimization (PS5 Pro)
    content_03 = notifier.format_terminal(
        "Technical Intel: PS5 Pro PSSR Support",
        "技術情報: PS5 Pro PSSR 対応確認",
        "Analysis of common.dat reveals PSSR (PlayStation Spectral Super Resolution) flags for stable 4K/60Hz output.",
        "common.dat の解析により、4K/60Hzの安定出力を実現する PSSR (PlayStation Spectral Super Resolution) フラグの存在が確認されました。",
        source="Hardware Synthesis"
    )
    await notifier.send_message(content_03)

if __name__ == "__main__":
    asyncio.run(dispatch_nte_launch_intel())
