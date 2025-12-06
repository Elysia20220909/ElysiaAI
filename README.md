# 💜 Elysia AI 🦊✨

[![Made with Bun](https://img.shields.io/badge/Bun-1.0+-000000?logo=bun)](https://bun.sh)
[![Powered by Elysia](https://img.shields.io/badge/Elysia-1.4-6366f1?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiAxMkwxMiAyMkwyMiAxMkwxMiAyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+)](https://elysiajs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://typescriptlang.org)

**Bunで動くパワフルなAIチャットボット** 💜  
ElysiaJSベースの超高速WebSocket API | RAG搭載 | 型安全で楽しい開発体験

エリシア（速さ）× キュレネ（守り）で、開発も体験も軽やかに。

他言語: [英語版はこちら](./README.en.md) ｜ [日本語詳細版](./README.ja.md)

---

## ✨ なぜ Elysia AI？

Bunの速度 ⚡、Elysiaのエルゴノミクス 🎯、そしてAIの力 🧠 を組み合わせました。

```typescript
import { Elysia } from 'elysia'

new Elysia()
  .get('/chat', async ({ query }) => {
    // 型安全、自動検証、超高速 ⚡
    const response = await ai.chat(query.message)
    return { reply: response }
  })
  .listen(3000)
```

**妥協しない**: 高速性 ⚡、型安全性 🛡️、開発者体験 💜 のすべてを実現。

---

## 🚀 クイックスタート

最短3コマンドで走り出せます。迷ったらこの順でOK。

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

**これだけ！** 🎉 <http://localhost:3000> を開いてエリシアと会話しよう 💬

---

## 📦 機能

エリシアが攻めて、キュレネが守る。役割が噛み合う構成です。

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

全体像はこんな感じ。どこでエリシアが走り、どこでキュレネが守るか一目で把握。

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

## 🔐 セキュリティ

- **認証**: JWT + リフレッシュトークン (アクセス15分 + リフレッシュ7日)
- **レート制限**: ユーザーあたり60リクエスト/分 (Redis)
- **暗号化**: AES-256-GCM で機密データ保護
- **RBAC**: PUBLIC → AUTHENTICATED → ADMIN → SUPER_ADMIN → SYSTEM
- **入力検証**: XSS/SQLインジェクション防止
- **セキュリティヘッダー**: CSP、X-Frame-Options、HSTS

---

## 📊 監視とモニタリング

```bash
# モニタリングスタックを起動
cd monitoring && docker-compose up -d

# Grafanaにアクセス: http://localhost:3001 (admin/admin)
```

**メトリクス**: HTTPリクエスト • レスポンス時間 (p50/p95/p99) • エラー率 • 認証試行 • RAGクエリ

**アラート**: 高エラー率 • 遅いレスポンス • サービス停止 • 高メモリ使用量
（キュレネが危険を見つけたらすぐ知らせてくれます）

---

## 🧪 テスト

```bash
bun test                    # 全テスト実行
bun test --coverage        # カバレッジ付き
bunx playwright test       # E2Eテスト
.\scripts\load-test.ps1    # 負荷テスト
```

---

## 📈 パフォーマンスベンチマーク

| メトリクス | 値 |
|-----------|----|
| コールドスタート | < 100ms |
| 平均レスポンス | 45ms (p50) |
| p95レスポンス | 120ms |
| スループット | 10,000 req/s |
| 最大同時ユーザー | 50,000+ |
| メモリ使用量 | アイドル150MB、負荷時800MB |

> 💜 測定環境: AWS t3.xlarge (4vCPU, 16GB RAM)

---

## 🚢 デプロイ

### 🐳 Docker

```bash
docker build -f Dockerfile.production -t elysia-ai .
docker-compose up -d
```

### ☁️ クラウドデプロイ

**AWS**: `cd cloud/aws && ./deploy.sh`  
**GCP**: `cd cloud/gcp && ./deploy.sh`

---

## 📖 ドキュメント

- [アーキテクチャ](docs/ARCHITECTURE.md) - システム設計
- [APIリファレンス](docs/API.md) - 全エンドポイント
- [セキュリティガイド](docs/SECURITY.md) - ベストプラクティス
- [デプロイガイド](docs/DEPLOYMENT_GUIDE.md) - 本番環境セットアップ
- [コントリビューション](CONTRIBUTING.md) - 貢献方法
- [変更履歴](CHANGELOG.md) - バージョン履歴

---

## 🗺️ ロードマップ

✨ **v2.0 (2026年Q1)**: Kubernetes • マルチテナント • GraphQL • リアルタイムコラボレーション  
🎨 **v2.1 (2026年Q2)**: 音声入出力 • 画像生成 • 高度なRAG  
🚀 **v3.0 (2026年Q3)**: エージェントフレームワーク • 関数呼び出し • マルチモーダルAI

---

## 📄 ライセンス

### MITライセンス

Copyright (c) 2025 chloeamethyst 💜

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

困ったことがあったら、いつでもエリシアに相談してね 💜

- 💬 **イシュー**: [GitHub Issues](https://github.com/chloeamethyst/ElysiaAI/issues)
- 💭 **ディスカッション**: [GitHub Discussions](https://github.com/chloeamethyst/ElysiaAI/discussions)
- 🔐 **セキュリティ**: [SECURITY.md](docs/SECURITY.md) を参照

---

## 🙏 感謝

素晴らしいツールを作ってくれた皆さんに感謝 ✨

[Elysia](https://elysiajs.com/) 🦊 • [Bun](https://bun.sh/) ⚡ • [Ollama](https://ollama.ai/) 🤖 • [Milvus](https://milvus.io/) 🔍 • [FastAPI](https://fastapi.tiangolo.com/) 🚀

---

💜 エリシアと一緒に、もっと楽しいAI体験を 🦊✨

作者: [chloeamethyst](https://github.com/chloeamethyst)

⭐ **気に入ったらスターしてね！** ⭐
