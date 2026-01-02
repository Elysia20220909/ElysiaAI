# 📖 Elysia AI - アーキテクチャ用語集 & 教科書

## 目次

1. [基本概念](#基本概念)
2. [アーキテクチャ層](#アーキテクチャ層)
3. [コア技術スタック](#コア技術スタック)
4. [セキュリティ用語](#セキュリティ用語)
5. [データフロー](#データフロー)
6. [キー設計パターン](#キー設計パターン)

---

## 基本概念

### 🦊 Elysia
**Bun** ランタイムで動作する超高速TypeScript Webフレームワーク。Express/Fastify の代替として最適。
- **特徴**: 型安全、自動バリデーション、最小限のボイラープレート
- **用途**: RESTful API サーバー、リアルタイム通信（SSE）
- **開発体験**: 優れた開発者体験（ergonomic）

### 🚀 Bun
**JavaScript/TypeScript ランタイム**。Node.js の代替品で、圧倒的に高速。
- **メリット**: 30〜100倍高速、ネイティブTypeScript実行、一体型ツールチェーン
- **含まれるもの**: パッケージマネージャー、テストランナー、バンドラー
- **使用**: `bun install`, `bun run`, `bun test`

### 🤖 RAG（Retrieval-Augmented Generation）
**検索拡張生成**: AIモデルに、事前に検索したコンテキストを提供してから応答を生成させる手法。
- **フロー**: ユーザー質問 → ベクトル検索 → 類似ドキュメント取得 → LLMに渡す → 応答生成
- **メリット**: ハルシネーション（幻想）の削減、最新情報の提供、コスト削減
- **実装**: `python/fastapi_server.py` で実装

### 🔍 ベクトル埋め込み（Embeddings）
**テキストを数値ベクトルに変換**: 意味論的な類似性を数学的に比較可能にする。
- **モデル**: SentenceTransformers の `all-MiniLM-L6-v2`
- **次元**: 384次元のベクトル
- **用途**: セマンティック検索、テキスト比較
- **例**: "猫" と "ネコ" は似たベクトルを持つ

### 📊 Server-Sent Events（SSE）
**サーバー → クライアント の一方向ストリーミング**: HTTPを使ったリアルタイム通信。
- **特徴**: WebSocketより単純、HTTP互換、ブラウザ標準
- **フォーマット**: `data: {JSON}\n\n`
- **用途**: チャットの段階的応答配信、ライブメトリクス更新

---

## アーキテクチャ層

### 🌐 プレゼンテーション層（UI）

#### Alpine.js
軽量なJavaScriptフレームワーク。
- **特徴**: jQuery的使いやすさ、リアクティビティ、CDN対応
- **コード例**:
  ```html
  <div x-data="{ count: 0 }">
    <button @click="count++">Count: <span x-text="count"></span></button>
  </div>
  ```

#### Htmx
**HTMLの拡張**: Ajax/WebSocket/SSE を HTMLの属性から制御。
- **特徴**: SPAフレームワーク不要、サーバー側の簡単な統合
- **コード例**:
  ```html
  <button hx-post="/feedback" hx-target="#result">
    Send Feedback
  </button>
  ```

#### TailwindCSS
ユーティリティファースト CSSフレームワーク。
- **特徴**: ダーク/ライトモード、レスポンシブ、高速開発

---

### ⚙️ API/ゲートウェイ層（Elysia）

**責務**: ルーティング、認証、バリデーション、メトリクス収集

#### 主要エンドポイント

| エンドポイント | メソッド | 認証 | 説明 |
|---|---|---|---|
| `/health` | GET | なし | ヘルスチェック |
| `/metrics` | GET | なし | Prometheusメトリクス |
| `/auth/token` | POST | なし | JWT発行 |
| `/feedback` | POST | JWT | ユーザーフィードバック記録 |
| `/elysia-love` | POST | JWT | AIチャット（SSE） |
| `/ensemble/stats` | GET | JWT | マルチモデル統計 |

---

### 🧠 ビジネスロジック層

#### 1. **バリデーション層** (`src/lib/validation.ts`)

Result型パターンで、エラーハンドリングを一元化。

```typescript
type Result<T> = 
  | { ok: true; value: T }
  | { ok: false; error: string; status?: number };

export function validateFeedbackPayload(body: unknown): Result<FeedbackPayload>;
```

**利点**:
- エラーをThrowしない（例外処理が不要）
- 型安全（TypeScriptで完全にカバー）
- テストが簡単

#### 2. **認証ミドルウェア** (`requireAuth`)

```typescript
const requireAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!activeTokens.has(token)) return res.status(401).json(...)
  res.locals.token = token;
  next();
}
```

**フロー**:
1. `POST /auth/token` → accessToken + refreshToken 発行
2. `Authorization: Bearer {accessToken}` で保護エンドポイントへ
3. `POST /auth/refresh` → 新しい accessToken 取得

#### 3. **レート制限** (`applyRateLimit`)

ユーザーあたり設定値（デフォルト50）リクエスト/分。

```typescript
function applyRateLimit(key: string): boolean {
  const current = rateLimitCounter.get(key) || 0;
  return current + 1 > rateLimitThreshold;
}
```

---

### 🐍 バックエンド（FastAPI）

**ファイル**: `python/fastapi_server.py`（ポート 8000）

#### 責務

1. **RAG**: Milvus/Weaviate でベクトル検索
2. **チャット**: Ollama へのプロキシ（ストリーミング）
3. **フィルタリング**: 安全性フィルター適用

---

### 💾 データ層

#### **Prisma 7** - ORM

TypeScript で型安全にDB操作。
- **スキーマ**: `prisma/schema.prisma`
- **マイグレーション**: `bun run prisma migrate dev`
- **対応DB**: PostgreSQL, MySQL, SQLite, MongoDB

#### **Redis** - キャッシュ & セッション

高速KVストア。
- **用途**: レート制限カウンター、セッション保存、キャッシング
- **環境**: `REDIS_URL` で接続

#### **Milvus / Weaviate** - ベクトルDB

セマンティック検索用。
- **RAG の心臓**: 大量のドキュメント埋め込みを保存・検索
- **環境**: `USE_MILVUS=true` or Weaviate へのURL

#### **JSONL ファイル** - ログ

アプリケーション データの永続化。
- **ファイル**: `data/feedback.jsonl`, `data/knowledge.jsonl`, `data/voice.jsonl`
- **形式**: 1行 = 1 JSON オブジェクト

---

## コア技術スタック

### 言語・ランタイム
- **TypeScript 5.7**: 型安全
- **Bun 1.3+**: 実行エンジン
- **Python 3.10+**: FastAPI サーバー

### フレームワーク
- **Elysia**: API Webフレームワーク
- **FastAPI**: Python バックエンド
- **Prisma 7**: ORM

### テスト・QA
- **Bun Test**: ネイティブテストランナー
- **Playwright**: E2E テスト
- **Locust**: 負荷テスト

### デプロイ・インフラ
- **Docker**: コンテナ化
- **docker-compose**: ローカル開発
- **AWS CloudFormation**: AWS デプロイ

---

## セキュリティ用語

### 🔐 JWT（JSON Web Token）

自己検証型トークン。署名済みで改ざん検知可能。

**フロー**:
1. サーバー: `sign(payload, secret)` → accessToken
2. クライアント: `Authorization: Bearer {token}` で送信
3. サーバー: `verify(token, secret)` で検証

### 🔄 リフレッシュトークン

accessToken は短命（900秒）。refreshToken で新 accessToken 取得。

### 🛡️ RBAC（Role-Based Access Control）

5つの権限レベル:
1. **Anonymous**: 認証なし
2. **User**: 基本機能
3. **Moderator**: 管理機能
4. **Admin**: 設定変更
5. **SuperAdmin**: 全権限

---

## データフロー

### 📤 チャットリクエスト（`POST /elysia-love`）

```
クライアント
    ↓
Elysia API層（認証 → バリデーション → レート制限）
    ↓
FastAPI バックエンド（RAG & コンテキスト検索）
    ↓
Ollama（LLM で応答生成）
    ↓
SSE ストリーミング
    ↓
クライアント UI（リアルタイム表示）
```

---

## キー設計パターン

### ✅ Result 型パターン

エラーハンドリングを型安全に。

```typescript
type Result<T> = 
  | { ok: true; value: T }
  | { ok: false; error: string; status?: number };

const result = validateFeedbackPayload(body);
if (!result.ok) {
  return res.status(result.status ?? 400).json({ error: result.error });
}
```

**メリット**:
- 例外スロー不要
- TypeScript で未処理を検知
- エラーケースが明示的

---

### 🔀 ミドルウェアチェーン

Express ライク。

```typescript
app.post("/protected", 
  requireAuth,        // 認証チェック
  validateBody,       // バリデーション
  (req, res) => {     // ビジネスロジック
    // req.locals に認証情報が設定済み
  }
)
```

---

### 🎯 責務の分離

```
Handler
  ↓
Validate (純粋関数)
  ↓
Process (ビジネスロジック)
  ↓
Persist (DB/ファイル)
  ↓
Response
```

---

## 開発ワークフロー

### 🚀 ローカル開発

```bash
# 1. 環境構築
bun install
./scripts/setup-python.ps1

# 2. 全サービス起動
bun run dev

# 3. テスト実行
bun test
```

### 📦 ビルド & デプロイ

```bash
# TypeScript ビルド
bun run build

# Docker ビルド
bun run docker:build

# AWS デプロイ
bun run aws:deploy
```

---

## 用語集（クイック参照）

| 用語 | 意味 |
|---|---|
| **API** | Application Programming Interface |
| **SSE** | Server-Sent Events |
| **JWT** | JSON Web Token - 自己検証型トークン |
| **RAG** | Retrieval-Augmented Generation |
| **ORM** | Object-Relational Mapping |
| **RBAC** | Role-Based Access Control |
| **XSS** | Cross-Site Scripting |
| **JSONL** | JSON Lines - 1行1JSON形式 |
| **Embedding** | ベクトル埋め込み |
| **Middleware** | 中間処理 |
| **Result型** | エラーハンドリングパターン |
| **Bun** | JavaScriptランタイム |
| **Elysia** | TypeScript Webフレームワーク |
| **Ollama** | ローカルLLMサーバー |
| **Milvus** | ベクトルDB |

---

**作成日**: 2026-01-02  
**対象**: Elysia AI 1.0.51+  
**言語**: 日本語
