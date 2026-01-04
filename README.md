# 💜 Elysia AI 🦊✨

[![Made with Bun](https://img.shields.io/badge/Bun-1.0+-000000?logo=bun)](https://bun.sh)
[![Powered by Elysia](https://img.shields.io/badge/Elysia-1.4-6366f1?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiAxMkwxMiAyMkwyMiAxMkwxMiAyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+)](https://elysiajs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://typescriptlang.org)

**エルゴノミックな AI チャット with RAG** - 超高速、型安全、そして楽しい 🦊

[English](./README.en.md) • [日本語](./README.ja.md)

---

## TL;DR

- Bun + Elysia の軽量ゲートウェイが FastAPI ベースの RAG と Ollama を中継するシンプル構成。
- ローカル開発は `bun run dev` だけで FastAPI → Elysia が起動（.env をコピーして最小設定）。
- セキュリティは基本認証 + レート制限をデフォルトとし、JWT/Redis 化や safe_filter 強化は今後の拡張余地あり。

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

### 🧠 **インテリジェント RAG システム**

- **ベクトル検索**: Milvus Lite with `all-MiniLM-L6-v2` 埋め込み
- **コンテキスト取得**: セマンティック類似性マッチング
- **スマートキャッシング**: Redis ベースのレスポンスキャッシュ

### ⚡ **Elysia 駆動**

- **型安全**: Eden Treaty でエンドツーエンド TypeScript
- **高速**: 最適化された Bun ランタイム
- **エルゴノミック**: 直感的な API 設計、最小限のボイラープレート

### 🤖 **LLM 統合**

- **Ollama**: ローカル `llama3.2` モデルとストリーミング
- **リアルタイム**: Server-Sent Events (SSE) によるライブレスポンス
- **柔軟**: モデルとプロバイダーの簡単な切り替え

### 🎨 **美しい UI**

- **Alpine.js**: リアクティブで軽量なフロントエンド
- **レスポンシブ**: モバイルフレンドリーデザイン
- **ダークモード**: 目に優しい 🌙

### 🔐 **セキュリティ第一**

- デフォルトは BASIC 相当の認証（環境変数で資格情報を必須設定）
- シンプルなレート制限（自己防衛でしきい値を動的変更）
- 入出力フィルタでプロンプトインジェクション/危険ワードを軽減
- JWT + Redis ベースの強化認証は拡張候補（docs 参照）
- XSS/SQL インジェクション対策の入力バリデーション/サニタイズ

### 📊 **可観測性**

- Prometheus メトリクス
- Grafana ダッシュボード
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

**v2.0 (2026 年 Q1)**: Kubernetes • マルチテナント • GraphQL • リアルタイムコラボレーション  
**v2.1 (2026 年 Q2)**: 音声入出力 • 画像生成 • 高度な RAG  
**v3.0 (2026 年 Q3)**: エージェントフレームワーク • 関数呼び出し • マルチモーダル AI

---

## 📄 ライセンス

### MIT ライセンス

Copyright (c) 2026 ElysiaAI contributors

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

- **イシュー**: [GitHub Issues](https://github.com/Elysia20220909/ElysiaAI/issues)
- **ディスカッション**: [GitHub Discussions](https://github.com/Elysia20220909/ElysiaAI/discussions)
- **セキュリティ**: [SECURITY.md](docs/SECURITY.md) を参照

---

## 🙏 クレジット

[Elysia](https://elysiajs.com/) • [Bun](https://bun.sh/) • [Ollama](https://ollama.ai/) • [Milvus](https://milvus.io/) • [FastAPI](https://fastapi.tiangolo.com/)

---

❤️ で作成 by [chloeamethyst](https://github.com/chloeamethyst)

⭐ **GitHub でスターをください！**
