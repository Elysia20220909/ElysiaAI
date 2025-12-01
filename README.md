# Elysia AI (RAG + Ollama + Milvus + VOICEVOX♡)

Elysia(Bun) で動くAIチャット。FastAPI + Milvus Lite によるRAG、Ollama(LLM)を統合。**VOICEVOX対応**でエリシアちゃんが本物の声で喋る♡

## ✨ 新機能（v2.0）
- 🎤 **VOICEVOX統合**: 四国めたん（井上麻里奈風）で100%エリシアちゃん声♡
- 💕 **感情表現**: 喜び/照れ/普通で自動ピッチ変化
- 👤 **ユーザー名呼び**: 「おにいちゃん」じゃなくて名前で甘える♡
- 📋 **ボイスログ保存**: 喋った内容を全部記録（最大100件）
- 🛡️ **完全セキュリティ**: XSS/SQLi/DoS/プロンプトインジェクション対策

## 機能
- **RAG**: FastAPI + Milvus Lite（`all-MiniLM-L6-v2`、50セリフ学習済み）
- **LLM**: Ollama（`llama3.2`）ストリーミング応答
- **ボイス**: Web Speech API + VOICEVOX（四国めたん）
- **セキュリティ**: 入力バリデーション、XSS保護、レート制限、CORS
- **UI**: Elysia + Alpine.js、Glassmorphism デザイン
- **追加**: `network_simulation/`（AbyssGrid: Blackwall Simulation）

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

<div align="center">

# Elysia AI (RAG + Ollama + Milvus)

Language / 言語: [English](./README.en.md) | [日本語](./README.ja.md)

AI chat app with Elysia (Bun), FastAPI + Milvus Lite (RAG), and Ollama (LLM).

</div>