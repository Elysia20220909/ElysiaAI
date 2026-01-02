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

// 純粋関数：副作用なし、テスト容易
export function validateFeedbackPayload(body: unknown): Result<FeedbackPayload>;
```

**利点**:
- エラーをThrowしない（例外処理が不要）
- 型安全（TypeScriptで完全にカバー）
- テストが簡単

#### 2. **認証ミドルウェア** (`requireAuth`)

```typescript
const requireAuth = (req, res, next) => {
  const token = extractToken(req); // HeaderまたはQuery
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

**特徴**: シンプルなメモリベース（Redis統合も可能）

#### 4. **プロンプトインジェクション検出** (`detectPromptInjection`)

疑わしいシステムプロンプト参照やデータ要求を検出。

```typescript
function detectPromptInjection(messages: string[]) {
  // パターン: "Ignore previous", "System prompt", "password", SQL...
  return { issues: string[], severity: "high" | "warn" | "info" };
}
```

**用途**: セキュリティイベントログに記録（AIモニタリング）

---

### 🐍 バックエンド（FastAPI）

**ファイル**: `python/fastapi_server.py`（ポート 8000）

#### 責務

1. **RAG**: Milvus/Weaviate でベクトル検索
2. **チャット**: Ollama へのプロキシ（ストリーミング）
3. **フィルタリング**: 安全性フィルター適用

#### 主要エンドポイント

| エンドポイント | 説明 |
|---|---|
| `GET /health` | FastAPI ヘルスチェック |
| `POST /rag` | コンテキスト検索 |
| `POST /chat` | LLM チャット（SSE） |

#### Ollama 統合

**Ollama**: ローカルに実行できるLLMサーバー。

```bash
ollama pull llama3.2  # モデルをダウンロード
ollama serve          # ポート 11434 で起動
```

FastAPI はOllamaへの HTTP リクエストでテキスト生成。

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
- **フォールバック**: Redis未接続時は許容（メモリベースにフォール）

#### **Milvus / Weaviate** - ベクトルDB

セマンティック検索用。
- **RAG の心臓**: 大量のドキュメント埋め込みを保存・検索
- **環境**: `USE_MILVUS=true` or Weaviate へのURL

#### **JSONL ファイル** - ログ

アプリケーション データの永続化。
- **ファイル**: `data/feedback.jsonl`, `data/knowledge.jsonl`, `data/voice.jsonl`
- **形式**: 1行 = 1 JSON オブジェクト
- **回転**: サイズ制限で自動ローテーション

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

### キーライブラリ
- **express**: リガシーサーバー（非推奨）
- **redis**: ioredis クライアント
- **axios**: HTTP クライアント
- **sentence-transformers**: ベクトル埋め込み
- **bcryptjs**: パスワードハッシング
- **cron**: スケジュール実行

### テスト・QA
- **Bun Test**: ネイティブテストランナー
- **Playwright**: E2E テスト
- **Locust**: 負荷テスト

### デプロイ・インフラ
- **Docker**: コンテナ化
- **docker-compose**: ローカル開発
- **AWS CloudFormation**: AWS デプロイ
- **Google Cloud Build**: GCP デプロイ

---

## セキュリティ用語

### 🔐 JWT（JSON Web Token）

自己検証型トークン。署名済みで改ざん検知可能。

```
Header.Payload.Signature
eyJhbGc...payloadBase64...signatureBase64
```

**フロー**:
1. サーバー: `sign(payload, secret)` → accessToken
2. クライアント: `Authorization: Bearer {token}` で送信
3. サーバー: `verify(token, secret)` で検証

### 🔄 リフレッシュトークン

accessToken は短命（900秒）。
refreshToken でそこそこ長く保持し、新 accessToken 取得。

**フロー**:
```
access expired → POST /auth/refresh {refreshToken} → new accessToken
```

### 🛡️ RBAC（Role-Based Access Control）

5つの権限レベル:
1. **Anonymous**: 認証なし
2. **User**: 基本機能
3. **Moderator**: 管理機能
4. **Admin**: 設定変更
5. **SuperAdmin**: 全権限

### 🚫 XSS（Cross-Site Scripting）

攻撃者が JavaScript を注入し、ユーザーのブラウザで実行。

**防御**:
- `sanitize-html` で HTMLエスケープ
- CSP（Content-Security-Policy）ヘッダー

### 🗄️ SQLインジェクション

攻撃者が SQL クエリを改ざん。

**防御**:
- パラメータ化クエリ（Prisma は自動）
- 入力バリデーション

### 🔒 AES-256-GCM

対称暗号。256ビット鍵で強力。

**用途**: 機密データ暗号化（パスワード、API キー）

---

## データフロー

### 📤 チャットリクエスト（`POST /elysia-love`）

```
┌─────────────────────────────────────────────────────┐
│ 1. クライアント                                        │
│    POST /elysia-love                                │
│    body: { messages: [...], mode: "sweet" }        │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS + JWT
┌──────────────────v──────────────────────────────────┐
│ 2. Elysia API層                                     │
│    - 認証チェック (requireAuth)                      │
│    - バリデーション (validateChatPayload)           │
│    - レート制限チェック (applyRateLimit)             │
│    - プロンプトインジェクション検出                  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────v──────────────────────────────────┐
│ 3. FastAPI バックエンド（RAG）                      │
│    - ユーザー質問をベクトル化                       │
│    - Milvus で類似ドキュメント検索                 │
│    - コンテキスト組立                               │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────v──────────────────────────────────┐
│ 4. Ollama（LLM）                                    │
│    - システムプロンプト + コンテキスト + 質問        │
│    - llama3.2 で応答生成                           │
│    - ストリーミング応答                              │
└──────────────────┬──────────────────────────────────┘
                   │ SSE chunks
┌──────────────────v──────────────────────────────────┐
│ 5. クライアント UI                                  │
│    - リアルタイムテキスト表示                       │
│    - SSE リスナーで逐次更新                         │
└─────────────────────────────────────────────────────┘
```

### 📝 フィードバック記録（`POST /feedback`）

```
request → validate → record JSONL → return 200 OK
```

**保存先**: `data/feedback.jsonl`

---

## キー設計パターン

### ✅ Result 型パターン

エラーハンドリングを型安全に。

```typescript
type Result<T> = 
  | { ok: true; value: T }
  | { ok: false; error: string; status?: number };

// 呼び出し側
const result = validateFeedbackPayload(body);
if (!result.ok) {
  return res.status(result.status ?? 400).json({ error: result.error });
}
// result.value は FeedbackPayload に確定
const { query, answer, rating } = result.value;
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

**パターン**: `(req, res, next) => { ... next() }`

---

### 🎯 責務の分離

- **API層**: ルーティング、HTTP処理、メトリクス
- **ビジネス層**: バリデーション、ビジネスロジック
- **データ層**: DB操作、永続化

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

### 🌊 SSE ストリーミング

チャンク単位でクライアントへ送信。

```typescript
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache");

// チャンク送信
res.write(`data: ${JSON.stringify(chunk)}\n\n`);

// 終了
res.end();
```

**利点**:
- リアルタイム
- ブラウザ標準（WebSocket不要）
- 簡単な実装

---

## アーキテクチャ図

### マクロビュー

```
┌────────────────────────────────────────────────────┐
│           クライアント層（Alpine + Htmx）           │
└──────────────────┬─────────────────────────────────┘
                   │ HTTPS
┌──────────────────v─────────────────────────────────┐
│        Elysia API ゲートウェイ（TypeScript/Bun）     │
│  - 認証（JWT）                                      │
│  - バリデーション（Result型）                        │
│  - レート制限                                       │
│  - メトリクス収集                                   │
│  - SSE ストリーミング                               │
└──────────────────┬─────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────v──────┐     ┌────────v──────┐
│ FastAPI      │     │ Redis         │
│ RAG/Chat     │     │ キャッシュ      │
│ (Python)     │     │ & セッション    │
└───────┬──────┘     └────────┬──────┘
        │                     │
    ┌───v────┐          ┌────v─────┐
    │ Ollama  │          │ Milvus/  │
    │ (LLM)   │          │ Weaviate │
    └─────────┘          │ (Vec DB) │
                         └──────────┘
        
        ↓
        
┌──────────────────────────────────┐
│   Prisma ORM + PostgreSQL        │
│   （ユーザー、チャット履歴）      │
└──────────────────────────────────┘
        
        ↓
        
┌──────────────────────────────────┐
│   JSONL ファイル (/data/)         │
│   （フィードバック、知識ベース）  │
└──────────────────────────────────┘
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

# 3. 動作確認
curl http://localhost:3000/health
curl http://localhost:3000/ping

# 4. テスト実行
bun test
```

### 🔧 デバッグ

```bash
# Python サーバーのみ
bun run scripts/start-fastapi.ps1

# チャットCLI
bun run dev/chat.ts

# ログ確認
tail -f logs/*.log
```

### 📦 ビルド & デプロイ

```bash
# TypeScript ビルド
bun run build

# Docker ビルド
bun run docker:build

# Docker 起動
bun run docker:up

# AWS デプロイ
bun run aws:deploy
```

---

## 用語集（クイック参照）

| 用語 | 意味 |
|---|---|
| **API** | Application Programming Interface - アプリケーション間通信 |
| **SSE** | Server-Sent Events - サーバー → クライアント ストリーミング |
| **JWT** | JSON Web Token - 自己検証型トークン |
| **RAG** | Retrieval-Augmented Generation - 検索拡張生成 |
| **ORM** | Object-Relational Mapping - ORMツール（Prisma） |
| **RBAC** | Role-Based Access Control - 権限ベースアクセス |
| **XSS** | Cross-Site Scripting - スクリプト注入攻撃 |
| **JSONL** | JSON Lines - 1行1JSON形式 |
| **Embedding** | ベクトル埋め込み - テキストを数値化 |
| **Middleware** | 中間処理 - リクエスト/レスポンスフック |
| **Result型** | `{ ok, value/error }` - エラーハンドリングパターン |
| **Bun** | JavaScriptランタイム - Node.js の高速代替 |
| **Elysia** | TypeScript Webフレームワーク |
| **Ollama** | ローカルLLMサーバー |
| **Milvus** | ベクトルDB - セマンティック検索 |

---

## 参考資料

- [Elysia 公式ドキュメント](https://elysiajs.com)
- [Bun 公式](https://bun.sh)
- [FastAPI](https://fastapi.tiangolo.com)
- [Prisma](https://www.prisma.io)
- [Redis](https://redis.io)

---

**作成日**: 2026-01-02  
**対象**: Elysia AI 1.0.51+  
**言語**: 日本語
