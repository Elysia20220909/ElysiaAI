# Elysia AI (RAG + Ollama + Milvus)

Elysia(Bun) で動くAIチャット。FastAPI + Milvus Lite によるRAG、Ollama(LLM)を統合しています。追加で `network_simulation/`（別ライセンス）も同梱。

## 機能
- RAG: FastAPI + Milvus Lite（`all-MiniLM-L6-v2`）
- LLM: Ollama（`llama3.2`）ストリーミング応答
- Web: Elysia + Alpine.js UI（`/elysia-love` エンドポイント）
- 追加: `network_simulation/`（AbyssGrid: Blackwall Simulation）

## クイックスタート
```powershell
# 1) 依存を取得（Node/JS）
bun install

# 2) Python環境
./scripts/setup-python.ps1

# 3) サーバー起動（別ターミナルで順に）
./scripts/start-fastapi.ps1      # RAG / 127.0.0.1:8000
./scripts/start-network-sim.ps1  # NetworkSim API / 127.0.0.1:8001

# 4) Elysiaを起動
bun run src/index.ts             # http://localhost:3000
```

Linux/macOS/WSL の場合は `.sh` スクリプトを使用してください。

## ビルドと配布
```powershell
bun run build
Compress-Archive -Path dist/* -DestinationPath dist.zip -Force
```
生成した `dist.zip` をリリースに添付できます。

## ライセンス
- 本リポジトリ（ルート配下のコード）は MIT（`LICENSE`）。
- `network_simulation/` は元のライセンスに従います（同ディレクトリの `LICENSE` を参照）。
- 依存やモデルのライセンスは各提供元に従ってください。詳細は `THIRD_PARTY_NOTICES.md`。

## メタデータ
- ホームページ: https://github.com/chloeamethyst/ElysiaJS
- 問い合わせ: Issues または Discussions
