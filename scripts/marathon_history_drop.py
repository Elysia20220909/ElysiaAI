import discord
import os
import asyncio
import sys
import io
from dotenv import load_dotenv

# 出力のエンコーディングをUTF-8に強制設定 (Windowsのcp932対策)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

load_dotenv()
TOKEN = os.getenv("DISCORD_BOT_TOKEN")
GUILD_ID = 695637918626218044

async def drop_history():
    intents = discord.Intents.all()
    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        print(f">> [HISTORY] Bot Online: {client.user}")
        guild = client.get_guild(GUILD_ID) or await client.fetch_guild(GUILD_ID)
        channel = discord.utils.get(guild.text_channels, name="📡┃marathon機密情報局")
        
        if guild and channel:
            # 時系列順の歴史データ (2024-2026)
            history = [
                {
                    "date": "2024-05-15", 
                    "event": "PROJECT 'TRAHIT' INITIAL LEAK", 
                    "desc": "Bungie内部から最初のUIコンセプトと抽出（Extraction）ルールの草案がリーク。現実を書き換えるカラーパレットの採用が判明。"
                },
                {
                    "date": "2024-11-02", 
                    "event": "ENGINEERING MILESTONE: NEURAL UPLINK", 
                    "desc": "プレイヤー間の低遅延通信を実現するニューラルリンク・エンジンの基盤が完成。Bungie.netのバックエンド更新を確認。"
                },
                {
                    "date": "2025-01-20", 
                    "event": "CINEMATIC TRAILER 'THE RUNNER' REVEAL", 
                    "desc": "公式トレーラー初公開。サイバーパンク・ネオン（マゼンタとシアン）の色彩設計が世界中のランナーを熱狂させる。"
                },
                {
                    "date": "2025-09-10", 
                    "event": "DIRECTOR'S SIGNAL: COMPETITIVE VISION", 
                    "desc": "開発ディレクターより『競争的で公平、かつ予測不能な抽出体験』への注力が宣言。PVPVEの根幹が固まる。"
                },
                {
                    "date": "2026-03-12", 
                    "event": "CLOSED ALPHA PROTOCOL: SECTOR 1", 
                    "desc": "選ばれた特権ランナー向けに最初のクローズド・アルファが実施。トラヒト地上駅のマップが初めて公開される。"
                },
                {
                    "date": "2026-04-28", 
                    "event": "PRE-RELEASE PATCH 1.0.5: STABILITY FIX", 
                    "desc": "同期安定化の大規模パッチ。新装備『Aether Shroud（深淵の覆い）』のデータがアセットライブラリに追加。"
                },
                {
                    "date": "2026-05-01", 
                    "event": "LATEST UPDATE 1.0.6.2 [CURRENT]", 
                    "desc": "本日デプロイされた最新ビルド。武器バランスの調整と、ニューラル同調率の最適化が完了。"
                }
            ]

            await channel.send(">> [ARCHIVE RECOVERY] Initiating chronological intelligence sync... (2024 - 2026)")
            await asyncio.sleep(2)

            for item in history:
                embed = discord.Embed(title=f"// LOG_{item['date']}: {item['event']}", color=0x808080)
                embed.description = f"```{item['desc']}```"
                embed.set_footer(text="Data Decrypted from Deep Abyss Archive")
                embed.set_thumbnail(url="https://i.imgur.com/7vYp1zH.png")
                await channel.send(embed=embed)
                await asyncio.sleep(1.8)

            await channel.send(">> [SUCCESS] Historical logs synchronized. Sector status: **UP TO DATE**")
            print(">> [HISTORY] Historical intelligence drop complete.")
        else:
            print(">> [ERROR] Target guild or channel not found.")
        
        await client.close()

    if not TOKEN:
        print("エラー: .env に DISCORD_BOT_TOKEN が設定されていません。")
    else:
        await client.start(TOKEN)

if __name__ == "__main__":
    asyncio.run(drop_history())
