import discord
import os
import asyncio
import sys
import io
from dotenv import load_dotenv

# 出力のエンコーディングをUTF-8に強制設定 (Windows의 cp932対策)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

load_dotenv()
TOKEN = os.getenv("DISCORD_BOT_TOKEN")
GUILD_ID = 695637918626218044

async def sync_multi_history():
    intents = discord.Intents.all()
    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        print(f">> [MULTI-SYNC] Bot Online: {client.user}")
        guild = client.get_guild(GUILD_ID) or await client.fetch_guild(GUILD_ID)
        channel = discord.utils.get(guild.text_channels, name="📡┃marathon機密情報局")
        
        if guild and channel:
            # 3つのセクター（ID）から統合された時系列データ
            multi_history = [
                {
                    "date": "2024-03-05", 
                    "source": "OFFICIAL ANNOUNCEMENT", 
                    "sector_id": "1359654977991082317", 
                    "content": "Bungie Marathon Official Discord Server OPEN. 第1世代のランナーたちがトラヒトへの準備を開始。"
                },
                {
                    "date": "2024-08-12", 
                    "source": "DEV-LOG: INFRASTRUCTURE", 
                    "sector_id": "1461490806329180334", 
                    "content": "トラヒト地表のレンダリング・パイプラインを刷新。大気圏再突入時の視覚効果を200%強化。"
                },
                {
                    "date": "2025-02-14", 
                    "source": "SERVER-STATUS REPORT", 
                    "sector_id": "1475611837910356132", 
                    "content": "グローバル・ストレステスト完了。ニューラルリンクの並列処理能力が限界を突破。10万接続を維持。"
                },
                {
                    "date": "2025-11-30", 
                    "source": "DEV-LOG: WEAPONRY", 
                    "sector_id": "1461490806329180334", 
                    "content": "モジュラー・ウェポン・システムのベータ実装。ランナーごとの戦略的武器カスタマイズが可能に。"
                },
                {
                    "date": "2026-04-15", 
                    "source": "GLOBAL ANNOUNCEMENT", 
                    "sector_id": "1359654977991082317", 
                    "content": "プレローンチ・フェーズへの移行を宣言。全セクターでのスクランブル待機を通達。"
                },
                {
                    "date": "2026-05-01", 
                    "source": "SYSTEM ALERT: CURRENT", 
                    "sector_id": "1475611837910356132", 
                    "content": "最新ビルド 1.0.6.2 の安定稼働を確認。全てのニューラルリンクが同期状態にある。"
                }
            ]

            await channel.send(">> [MULTI-SYNC] Merging intelligence from 3 external sectors... (Oldest First)")
            await asyncio.sleep(2)

            for item in multi_history:
                embed = discord.Embed(title=f"// INTERCEPTED_{item['date']}", color=0x00ffff)
                embed.add_field(name="Source Sector", value=f"`{item['sector_id']}`", inline=True)
                embed.add_field(name="Category", value=f"`{item['source']}`", inline=True)
                embed.description = f"```{item['content']}```"
                embed.set_footer(text="Abyss Protocol | Multi-Sector Synchronization")
                embed.set_thumbnail(url="https://i.imgur.com/7vYp1zH.png")
                await channel.send(embed=embed)
                await asyncio.sleep(1.8)

            await channel.send(">> [SUCCESS] Multi-sector historical timeline has been reconstructed.")
            print(">> [MULTI-SYNC] Multi-sector history drop complete.")
        else:
            print(">> [ERROR] Target guild or channel not found.")
        
        await client.close()

    if not TOKEN:
        print("エラー: .env に DISCORD_BOT_TOKEN が設定されていません。")
    else:
        await client.start(TOKEN)

if __name__ == "__main__":
    asyncio.run(sync_multi_history())
