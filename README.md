# 💜 Elysia AI 🦊✨

[![Made with Bun](https://img.shields.io/badge/Bun-1.0+-000000?logo=bun)](https://bun.sh)
[![Powered by Elysia](https://img.shields.io/badge/Elysia-1.4-6366f1?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiAxMkwxMiAyMkwyMiAxMkwxMiAyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+)](https://elysiajs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://typescriptlang.org)

**エルゴノミックなAIチャット with RAG** - 超高速、型安全、そして楽しい 🦊

[English](./README.en.md) • [日本語](./README.ja.md)

---

## ✨ これが Elysia AI

```typescript
import { Elysia } from "elysia";

new Elysia()
  .get("/chat", async ({ query }) => {
    // 型安全、自動検証、超高速 ⚡
    const response = await ai.chat(query.message);
    return { reply: response };
  })
  .listen(3000);
```

**妥協なし**: 速さ ⚡、型安全 🛡️、そして作っていて楽しい 💜

---

## 🚀 クイックスタート & 保守

```bash
# Bunでインストール（推奨）
bun install

# Prisma クライアントを生成
bunx prisma generate

# 開発サーバーを起動（SQLiteは自動作成されます）
cd ElysiaAI
bun ./start-server.ts

# Pythonサービスのセットアップ（オプション - RAG機能用）
bun run scripts/setup-python.ps1  # Windows
# または
./scripts/setup-python.sh         # Linux/macOS/WSL

# コード品質・保守
# TypeScript/JavaScriptのESLint自動修正（FlatConfig対応）
npm install eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser --save-dev
# FlatConfig設定例は eslint.config.js を参照
npx eslint ElysiaAI/src/**/*.ts --fix

# Python未使用import自動削除（手動またはIDE推奨）
# src/配下の全ファイルも定期的にクリーンアップ
```

**これだけ！** 🎉 <http://localhost:3000> を開く

### 📡 利用可能なエンドポイント

- **メイン**: http://localhost:3000/
- **Swagger API**: http://localhost:3000/swagger
- **Health Check**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics

---

## 📦 機能・品質向上

### 🧠 **インテリジェントRAGシステム & 保守性**

- **ベクトル検索**: Milvus Lite with `all-MiniLM-L6-v2` 埋め込み
- **コンテキスト取得**: セマンティック類似性マッチング
  - **スマートキャッシング**: Redisベースのレスポンスキャッシュ
  - **自動コード保守**: ESLint/FlatConfig・未使用import削除・src/全体クリーンアップ

### ⚡ **Elysia駆動 & 高品質TypeScript**

- **型安全**: Eden Treatyでエンドツーエンド TypeScript
- **高速**: 最適化されたBunランタイム
- **エルゴノミック**: 直感的なAPI設計、最小限のボイラープレート
- **ESLint/FlatConfig**: 最新のLintルールで品質維持

### 🤖 **LLM統合 & Python保守**

- **Ollama**: ローカル `llama3.2` モデルとストリーミング
- **リアルタイム**: Server-Sent Events (SSE) によるライブレスポンス
- **柔軟**: モデルとプロバイダーの簡単な切り替え
- **Python未使用import削除**: クリーンなAIバックエンド

### 🎨 **美しいUI & 開発体験**

- **Alpine.js**: リアクティブで軽量なフロントエンド
- **レスポンシブ**: モバイルフレンドリーデザイン
- **ダークモード**: 目に優しい 🌙
- **開発体験**: コード保守・自動品質向上

### 🔐 **セキュリティ第一**

- リフレッシュトークン付きJWT認証
- レート制限（ユーザーあたり60リクエスト/分）
- AES-256-GCM暗号化
- 5つの権限レベルを持つRBAC
- XSS/SQLインジェクション防止

### � **データ永続化**

- **Prisma 7**: 最新のTypeScript ORM with LibSQL adapter
- **SQLite**: 開発環境用の軽量データベース（自動作成）
- **PostgreSQL対応**: 本番環境向け（.envで切り替え可能）
- **自動スキーマ**: 起動時にテーブル自動生成
- **型安全**: PrismaによるエンドツーエンドTypeScript型推論

### 📊 **可観測性**

- Prometheusメトリクス
- Grafanaダッシュボード
- 構造化ログ
- ヘルスチェック＆レディネスプローブ（database, ollama, disk_space）

---

## 🏗️ アーキテクチャ

```text
┌─────────────┐
│  クライアントUI  │  Alpine.js + TailwindCSS
└──────┬──────┘
       │ HTTPS
┌──────▼──────┐
│   Elysia    │  Bun + TypeScript
│   サーバー    │◄─► Redis (キャッシュ + レート制限)
└──────┬──────┘
       │
   ┌───▼───┐
   │Prisma 7│  ORM + LibSQL Adapter
   │ SQLite │  データ永続化
   └───────┘
       │
   ┌───▼───┐
   │FastAPI│  Python + RAG (オプション)
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

## 🔄 ロードマップ

**v2.0 (2026年Q1)**: Kubernetes • マルチテナント • GraphQL • リアルタイムコラボレーション
**v2.1 (2026年Q2)**: 音声入出力 • 画像生成 • 高度なRAG
**v3.0 (2026年Q3)**: エージェントフレームワーク • 関数呼び出し • マルチモーダルAI

---

## 📄 ライセンス

### MITライセンス

Copyright (c) 2025 chloeamethyst

このソフトウェアおよび関連文書ファイル（以下「ソフトウェア」）のコピーを取得した人は、
無償でソフトウェアを制限なく扱うことができます。これには、使用、複製、修正、統合、
公開、配布、サブライセンス、および/またはソフトウェアのコピーの販売が含まれます。

上記の著作権表示およびこの許諾表示は、ソフトウェアのすべてのコピーまたは
重要な部分に含める必要があります。

ソフトウェアは「現状のまま」提供され、明示的か黙示的かを問わず、商品性、
特定目的への適合性、および非侵害性の保証を含むがこれに限定されない、
いかなる種類の保証もありません。著者または著作権者は、契約、不法行為、
またはその他の方法にかかわらず、ソフトウェアまたはソフトウェアの使用または
その他の取引に起因または関連する請求、損害、またはその他の責任について、
一切責任を負いません。

全文は [LICENSE](LICENSE) を参照してください。

---

## 🤝 サポート

- **イシュー**: [GitHub Issues](https://github.com/chloeamethyst/ElysiaJS/issues)
- **ディスカッション**: [GitHub Discussions](https://github.com/chloeamethyst/ElysiaJS/discussions)
- **セキュリティ**: [SECURITY.md](docs/SECURITY.md) を参照

---

## 🙏 クレジット

[Elysia](https://elysiajs.com/) • [Bun](https://bun.sh/) • [Ollama](https://ollama.ai/) • [Milvus](https://milvus.io/) • [FastAPI](https://fastapi.tiangolo.com/)

---

❤️ で作成 by [chloeamethyst](https://github.com/chloeamethyst)

⭐ **GitHubでスターをください！**
