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

**これだけ！** 🎉 <http://localhost:3000> を開く

---

## 📦 機能

### 🧠 **インテリジェントRAGシステム**

- **ベクトル検索**: Milvus Lite with `all-MiniLM-L6-v2` 埋め込み
- **コンテキスト取得**: セマンティック類似性マッチング
- **スマートキャッシング**: Redisベースのレスポンスキャッシュ

### ⚡ **Elysia駆動**

- **型安全**: Eden Treatyでエンドツーエンド TypeScript
- **高速**: 最適化されたBunランタイム
- **エルゴノミック**: 直感的なAPI設計、最小限のボイラープレート

### 🤖 **LLM統合**

- **Ollama**: ローカル `llama3.2` モデルとストリーミング
- **リアルタイム**: Server-Sent Events (SSE) によるライブレスポンス
- **柔軟**: モデルとプロバイダーの簡単な切り替え

### 🎨 **美しいUI**

- **Alpine.js**: リアクティブで軽量なフロントエンド
- **レスポンシブ**: モバイルフレンドリーデザイン
- **ダークモード**: 目に優しい 🌙

### 🔐 **セキュリティ第一**

- リフレッシュトークン付きJWT認証
- レート制限（ユーザーあたり60リクエスト/分）
- AES-256-GCM暗号化
- 5つの権限レベルを持つRBAC
- XSS/SQLインジェクション防止

### 📊 **可観測性**

- Prometheusメトリクス
- Grafanaダッシュボード
- 構造化ログ
- ヘルスチェック＆レディネスプローブ

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
