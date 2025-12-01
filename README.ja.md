# Elysia AI (RAG + Ollama + Milvus)

Elysia(Bun) で動くAIチャット。FastAPI + Milvus Lite によるRAG、Ollama(LLM)を統合しています。追加で `network_simulation/`（別ライセンス）も同梱。

## 機能
- RAG: FastAPI + Milvus Lite（`all-MiniLM-L6-v2`）
- LLM: Ollama（`llama3.2`）ストリーミング応答
- Web: Elysia + Alpine.js UI（`/elysia-love` エンドポイント）
- モバイル: React Native + Expo（iOS/Androidアプリ）
- デスクトップ: Electron（Windows/Mac/Linuxネイティブアプリ）
- パフォーマンス: C++ネイティブバインディング（高速テキスト処理、オプション）
- GPU加速: CUDA対応（埋め込みベクトル類似度計算、オプション）
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

## モバイルアプリ（iOS/Android）

### セットアップ
```bash
./scripts/setup-mobile.ps1  # Windows
# または
./scripts/setup-mobile.sh   # Linux/macOS
```

### 起動
1. Elysiaサーバーを起動（上記クイックスタート参照）
2. PCのローカルIPアドレスを確認:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` または `ip addr`
3. モバイルアプリを起動:
   ```bash
   cd mobile
   npm start  # または: bun start
   ```
4. [Expo Go](https://expo.dev/client)アプリでQRコードをスキャン
5. アプリ内で⚙️をタップし、サーバーURLに`http://YOUR_IP:3000`を設定

詳細は `mobile/README.md` を参照してください。

## デスクトップアプリ（Windows/Mac/Linux）

### セットアップ
```bash
./scripts/setup-desktop.ps1  # Windows
# または
./scripts/setup-desktop.sh   # Linux/macOS
```

### 起動
1. Elysiaサーバーを起動（上記クイックスタート参照）
2. デスクトップアプリを起動:
   ```bash
   cd desktop
   npm start  # または: bun start
   ```
3. アプリ内で⚙️をクリックし、サーバーURLを設定（デフォルト: `http://localhost:3000`）

## パフォーマンス最適化（オプション）

### C++ネイティブバインディング
高速なテキスト処理が必要な場合、C++モジュールを有効化できます:
- トークン化: 大量テキストの単語分割
- コサイン類似度: ベクトル埋め込みの比較
- 正規化: テキストのクリーンアップ

**要件**: Visual Studio 2017以降（"Desktop development with C++"）

```bash
./scripts/setup-native.ps1  # Visual Studioが必要
```

### CUDA GPU加速
NVIDIA GPUがある場合、埋め込みベクトルの類似度計算を劇的に高速化できます（100倍以上）:

**要件**: 
- NVIDIA GPU（CUDA Compute Capability 7.5以降）
- [CUDA Toolkit](https://developer.nvidia.com/cuda-downloads) 11.0以降
- Visual Studio 2017以降

```bash
./scripts/setup-cuda.ps1  # CUDA Toolkit + Visual Studioが必要
```

**注意**: C++/CUDAモジュールはオプションです。ビルドに失敗してもJavaScriptフォールバックで動作します。

## ビルドと配布
```powershell
bun run build
bun run pack:zip
```
生成した `dist.zip` をリリースに添付できます。

## 補助スクリプト（Windows）
- `./scripts/start-server.ps1`: Elysiaサーバー起動（`PORT`可変）
- `./scripts/test-ai.ps1`: `POST /ai` エンドポイントの疎通テスト
- `./scripts/test-elysia-love.ps1`: `POST /elysia-love`（ストリーミング）テスト
- `./scripts/test-rag.ps1`: FastAPI `POST /rag` のRAG応答テスト
- `./scripts/dev.ps1`: FastAPI → Elysia（+任意でNetworkSim）を一括起動。Enterで一括停止。

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
