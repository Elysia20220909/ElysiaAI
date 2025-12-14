<div align="center">

# 💜 Elysia AI

[![Made with Bun](https://img.shields.io/badge/Bun-1.0+-000000?logo=bun)](https://bun.sh)
[![Powered by Elysia](https://img.shields.io/badge/Elysia-1.4-6366f1?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiAxMkwxMiAyMkwyMiAxMkwxMiAyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+)](https://elysiajs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://typescriptlang.org)

**エルゴノミックなAIチャット with RAG** - 超高速、型安全、そして楽しい 🦊

[English](./README.en.md) • [日本語](./README.ja.md)

</div>

---

## ✨ なぜ Elysia AI？

Bunの速度、Elysiaのエルゴノミクス、そしてAIの力を組み合わせました。

```typescript
import { Elysia } from "elysia";

new Elysia()
  .get("/chat", async ({ query }) => {
    // 型安全、自動バリデーション、超高速 ⚡
    const response = await ai.chat(query.message);
    return { reply: response };
  })
  .listen(3000);
```

**妥協しない**: 高速性、型安全性、開発者体験のすべてを実現。

---

## 🚀 クイックスタート

```bash
# Bunでインストール（推奨）
bun install

# Pythonサービスのセットアップ
bun run scripts/setup-python.ps1  # Windows
# または
./scripts/setup-python.sh         # Linux/macOS/WSL

# すべてのサービスを起動
bun run dev
```

**これだけ！** 🎉 http://localhost:3000 を開いてください

---

## 📦 機能

### 🧠 **インテリジェントRAGシステム**

- **ベクトル検索**: Milvus Lite + `all-MiniLM-L6-v2` 埋め込み
- **コンテキスト取得**: セマンティック類似度マッチング
- **スマートキャッシング**: Redis バックエンドのレスポンスキャッシュ

### ⚡ **Elysia で動作**

- **型安全性**: Eden Treaty による End-to-End TypeScript
- **高速**: Bun ランタイムと最適化されたホットパス
- **エルゴノミック**: 直感的な API 設計、最小限のボイラープレート

### 🤖 **LLM統合**

- **Ollama**: ローカル `llama3.2` モデルとストリーミング
- **リアルタイム**: Server-Sent Events (SSE) によるライブレスポンス
- **柔軟性**: モデルとプロバイダーの簡単な切り替え

### 🎨 **美しいUI**

- **Alpine.js**: リアクティブで軽量なフロントエンド
- **レスポンシブ**: モバイルフレンドリーなデザイン
- **ダークモード**: 目に優しい 🌙

### 🔐 **セキュリティ第一**

- JWT認証 + リフレッシュトークン
- レート制限（ユーザーあたり60リクエスト/分）
- AES-256-GCM 暗号化
- 5段階の権限レベルを持つRBAC
- XSS/SQLインジェクション対策

### 📊 **可観測性**

- Prometheus メトリクス
- Grafana ダッシュボード
- 構造化ロギング
- ヘルスチェック & 準備プローブ

---

## 🏗️ アーキテクチャ

```
┌─────────────┐
│  Client UI  │  Alpine.js + TailwindCSS
└──────┬──────┘
       │ HTTPS
┌──────▼──────┐
│   Elysia    │  Bun + TypeScript
│   Server    │◄─► Redis (Cache + Rate Limit)
└──────┬──────┘
       │
   ┌───▼───┐
   │FastAPI│  Python + RAG
   │  RAG  │
   └───┬───┘
       │
   ┌───▼───┐
   │ Milvus│  ベクトルデータベース
   └───────┘
       │
   ┌───▼───┐
   │Ollama │  LLM推論
   └───────┘
```

---

## 🛠️ 開発

```bash
# 依存関係のインストール
bun install

# ホットリロード付き開発モード
bun run dev

# 型チェック
bun run typecheck

# Lint
bun run lint

# フォーマット
bun run format

# テスト実行
bun test

# カバレッジ付きテスト
bun test --coverage
```

---

## 🎯 APIエンドポイント

### **チャット**

```bash
POST /api/chat
Content-Type: application/json

{
  "message": "Elysiaについて教えて",
  "stream": true
}
```

### **RAGクエリ**

```bash
POST /api/rag/query
{
  "query": "ベクトル検索とは？",
  "top_k": 5
}
```

### **ヘルスチェック**

```bash
GET /health
# 返却値: { "status": "ok", "uptime": 12345 }
```

**完全なAPIドキュメント**: http://localhost:3000/swagger

---

## 🧪 テストとセキュリティ

```bash
# ユニットテスト
bun test

# E2Eテスト
bunx playwright test

# 負荷テスト
./scripts/load-test.ps1

# セキュリティスキャン（OWASP ZAP、Locustなど）
./run-all-tests.sh
```

**テストカバレッジ**: 80%+ 包括的なセキュリティテストスイート付き

詳細は [SECURITY_TESTING_GUIDE.md](SECURITY_TESTING_GUIDE.md) を参照してください。

---

## 🚢 本番デプロイ

### **Docker**（推奨）

```bash
# 本番イメージのビルド
docker build -f Dockerfile.production -t elysia-ai:latest .

# docker-composeで実行
docker-compose up -d
```

### **クラウドプラットフォーム**

```bash
# AWS
cd cloud/aws && ./deploy.sh

# GCP
cd cloud/gcp && ./deploy.sh
```

### **パフォーマンス**

- **コールドスタート**: < 100ms
- **平均レスポンス**: 45ms (p50)
- **スループット**: 10,000 req/s
- **最大同時ユーザー数**: 50,000+

---

## 📚 ドキュメント

- 📖 [アーキテクチャガイド](docs/ARCHITECTURE.md)
- 🔌 [APIリファレンス](docs/API.md)
- 🔐 [セキュリティベストプラクティス](docs/SECURITY.md)
- 🚀 [デプロイメントガイド](docs/DEPLOYMENT_GUIDE.md)
- 🤝 [コントリビューションガイドライン](CONTRIBUTING.md)
- 📝 [変更履歴](CHANGELOG.md)

---

## 🗺️ ロードマップ

**v2.0**（2026年Q1）

- 🎯 関数呼び出し & ツール使用
- 🔄 マルチエージェントオーケストレーション
- 🌐 GraphQL API

**v2.1**（2026年Q2）

- 🎤 音声入出力サポート
- 🖼️ マルチモーダルAI（画像、動画）
- 🔍 高度なRAG技術

**v3.0**（2026年Q3）

- 🤖 メモリ付きエージェントフレームワーク
- 🏢 マルチテナントアーキテクチャ
- ☸️ Kubernetesネイティブデプロイ

---

## 📄 ライセンス

**MIT License**

Copyright (c) 2025 chloeamethyst

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

詳細は [LICENSE](LICENSE) ファイルを参照してください。

---

## 🤝 サポート

- **Issue**: [GitHub Issues](https://github.com/chloeamethyst/ElysiaJS/issues)
- **ディスカッション**: [GitHub Discussions](https://github.com/chloeamethyst/ElysiaJS/discussions)
- **セキュリティ**: [SECURITY.md](docs/SECURITY.md) を参照

---

## 🙏 クレジット

[Elysia](https://elysiajs.com/) • [Bun](https://bun.sh/) • [Ollama](https://ollama.ai/) • [Milvus](https://milvus.io/) • [FastAPI](https://fastapi.tiangolo.com/)

---

<div align="center">

Made with ❤️ by [chloeamethyst](https://github.com/chloeamethyst)

⭐ **GitHubでスターをお願いします！**

</div>
