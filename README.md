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
bun run pack:zip
```
生成した `dist.zip` をリリースに添付できます。

## 補助スクリプト（Windows）

## 補助スクリプト（Linux/macOS/WSL）
- `./scripts/start-server.sh`: Elysiaサーバー起動
- `./scripts/start-fastapi.sh`: FastAPI RAG起動
- `./scripts/start-network-sim.sh`: Network Simulation API起動
- `./scripts/dev.sh`: FastAPI → Elysia（+任意でNetworkSim）を一括起動。Ctrl+Cで一括停止。

```bash
# 例: デフォルトで起動
./scripts/dev.sh

# 例: Network Simulation API も一緒に
./scripts/dev.sh --network-sim
```

```powershell
# 例: デフォルトポートで起動
./scripts/dev.ps1

# 例: ポートを変更して起動（Elysia=3100, FastAPI=8100）
./scripts/dev.ps1 -ElysiaPort 3100 -FastApiPort 8100

# 例: Network Simulation API も一緒に
./scripts/dev.ps1 -NetworkSim
```

## npm への公開（任意）
アプリ用途のため公開は必須ではありませんが、公開する場合は以下のとおりです。

1) package.json を確認
- `name`: 一意なパッケージ名（スコープ推奨: `@your-scope/elysia-ai`）
- `version`: セマンティックバージョニング
- `license`: `MIT`
- `main`: `dist/index.js`
- `files`: `dist`, `README.md`, `LICENSE`
- `prepublishOnly`: `bun run build`

2) ログインと公開
```powershell
npm login
npm version patch
npm publish --access public
```

3) 注意
- 本パッケージはサーバー実行用の成果物です（ライブラリAPIは未提供）。
- 依存やモデルのライセンス条件に留意してください。

## ライセンス
- 本リポジトリ（ルート配下のコード）は MIT（`LICENSE`）。
- `network_simulation/` は元のライセンスに従います（同ディレクトリの `LICENSE` を参照）。
- 依存やモデルのライセンスは各提供元に従ってください。詳細は `THIRD_PARTY_NOTICES.md`。

## メタデータ
- ホームページ: https://github.com/chloeamethyst/ElysiaJS
- 問い合わせ: Issues または Discussions