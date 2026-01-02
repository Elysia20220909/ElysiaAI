# Elysia AI - 技術ガイド

このドキュメントは Elysia AI の主要コンポーネント、設計パターン、そしてよくある実装タスクについてカバーしています。

## 技術スタック概要

### Bun

JavaScript/TypeScript ランタイム。Node.js の代替として使用します。

- Node.js より 30-100 倍高速
- TypeScript をネイティブ実行
- パッケージマネージャー、テストランナー、バンドラーが組み込み

実行例：

```bash
bun run dev          # 開発サーバー起動
bun test             # テスト実行
bun install          # 依存パッケージをインストール
```

### Elysia

Bun 上で動作する型安全な Web フレームワーク。

- Express/Fastify よりシンプルで高速
- TypeScript との統合で自動バリデーション
- SSE やリアルタイム通信が容易

## アーキテクチャ層

### API 層 (src/index.ts)

Express ベースのサーバー（将来的に Elysia に移行予定）。

主要エンドポイント:

- `/health` - ヘルスチェック
- `/auth/token` - JWT 発行
- `/feedback` - ユーザーフィードバック記録（JWT 必須）
- `/elysia-love` - AI チャット（SSE ストリーム）
- `/ensemble/stats` - マルチモデル統計情報

認証: JWT ベース。リフレッシュトークンは Redis に保存。デフォルト認証情報は .env から読み込み。

### バリデーション層 (src/lib/validation.ts)

Result 型パターンでエラーハンドリングを統一。

```typescript
const result = validateMessages(["hello", "world"]);
if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

主な検証関数:

- `ok(value)` - 成功結果を返す
- `err(message)` - エラー結果を返す
- `requireString()` - 文字列をバリデート
- `requireEnum()` - 列挙値をバリデート
- `validateMessages()` - メッセージ配列をバリデート
- `validateFeedbackPayload()` - フィードバック送信をバリデート
- `validateChatPayload()` - チャットリクエストをバリデート

エラーメッセージは具体的に:

- ❌ "Invalid messages"
- ✅ "received 10 messages but max is 8"

### RAG システム (python/fastapi_server.py)

Retrieval-Augmented Generation: ユーザーの質問に対して、関連ドキュメントを検索してから AI に渡す。

フロー:

1. ユーザー質問を受け取る
2. ベクトル検索で関連ドキュメントを取得
3. 取得したコンテキストを AI プロンプトに追加
4. AI が応答を生成

メリット:

- ハルシネーション（AI の幻想回答）を減らせる
- 最新情報を提供できる
- AI API コストを削減できる

実装: SentenceTransformers（all-MiniLM-L6-v2）でテキストをベクトル化。埋め込みは 384 次元。オプションで Milvus ベクトル DB を使用。

### チャット実装（SSE）

Server-Sent Events でクライアントにリアルタイムに応答を配信。

```typescript
response.write('data: {"chunk":"Hello"}\n\n');
response.write('data: {"chunk":" world"}\n\n');
response.end();
```

### マルチモデルアンサンブル

複数の LLM に同じ質問を投げて、結果を集約。

戦略:

- `quality` - 最高品質の回答を選択
- `speed` - 最速の回答を返す
- `consensus` - 複数モデルの合意を取る

## 一般的なタスク

### 新しいエンドポイントを追加する

1. バリデーション関数を src/lib/validation.ts に追加
2. src/index.ts でハンドラーを実装
3. tests/api.test.ts にテストを追加
4. テストが通るか確認

テンプレート:

```typescript
export function validateMyPayload(body: unknown): Result<MyType> {
  const parsed = body as Record<string, unknown>;
  return ok({
    /* payload */
  });
}

app.post("/my-endpoint", async (req, res) => {
  const result = validateMyPayload(req.body);
  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ data });
});
```

### エラーメッセージを改善する

ガイドライン:

- 何が悪かったかを明確に
- 受け取った値と期待値を含める
- 修正方法のヒントを提供する

例:

```bash
# 悪い例
"Invalid input"
"messages required"

# 良い例
"ensembleStrategy must be one of: quality, speed, consensus"
"received 10 messages but max is 8"
```

### 新しい関数に JSDoc を追加する

すべての新しい関数に JSDoc を付ける。IDE のオートコンプリートと TS チェックに役立つ。

```typescript
/**
 * Validate user feedback submission.
 * Checks required fields and enforces length constraints.
 * @param body - Request body to validate
 * @returns Result with validated feedback or error message
 */
export function validateFeedbackPayload(body: unknown): Result<FeedbackPayload> {
  // ...
}
```

## データ永続化

### ユーザーデータ (JSONL 形式)

data/ ディレクトリに JSONL（改行区切り JSON）形式で保存。

場所:

- `data/feedback.jsonl` - ユーザーフィードバック
- `data/knowledge.jsonl` - ナレッジベース
- `data/voice_logs.jsonl` - 音声ログ

回転スクリプト: scripts/rotate:jsonl でファイルサイズが大きくなった時にローテーション。

### キャッシング

Redis でセッション、レート制限データ、ジョブキューを管理。

設定:

- `REDIS_URL` - Redis 接続文字列
- `RATE_LIMIT_RPM` - 1 分あたりの最大リクエスト数

## セキュリティ

### 認証

JWT ベース。トークンは .env の JWT_SECRET で署名。

```
Authorization: Bearer <token>
```

リフレッシュトークンは Redis に保存し、失効を追跡。

### レート制限

Redis を使用。利用不可の場合は自動的にすべてのトラフィックを許可（バックアップ動作）。

```
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
```

### 監査ログ

すべてのリクエストは logs/ に記録。

## 開発ワークフロー

### ローカル開発

```bash
bun run dev
```

以下を起動:

1. FastAPI サーバー（ポート 8000）
2. Express/Elysia サーバー（ポート 3000）

ログは ./logs/ に出力。

### テスト実行

```bash
bun test
bun test --watch
bun test --coverage
```

### コード品質

```bash
bun run lint       # Biome linter
bun run format     # コード整形（チェックのみ）
bun run fix        # コード整形（実行）
```

### ビルド

```bash
bun run build
```

Webpack を使用してバンドル。出力は dist/ ディレクトリ。

## 環境変数

重要な設定:

- `JWT_SECRET` - JWT 署名キー
- `JWT_REFRESH_SECRET` - リフレッシュトークン署名キー
- `REDIS_URL` - Redis 接続
- `DATABASE_CONFIG.RAG_API_URL` - FastAPI RAG エンドポイント
- `OLLAMA_HOST` - Ollama サーバーアドレス
- `OLLAMA_MODEL` - 使用する LLM モデル
- `USE_MILVUS` - Milvus ベクトル DB を有効化
- `AUTH_USERNAME` - デフォルト認証ユーザー名
- `AUTH_PASSWORD` - デフォルト認証パスワード

詳細は .env.example を参照。

## トラブルシューティング

### サーバーが起動しない

- ログを確認: ./logs/\*.log
- ポート 3000, 8000 が使用中でないか確認
- 依存パッケージをインストール: bun install

### テストが失敗する

- Redis が実行中か確認
- テストログを確認: bun test --verbose
- 個別テストを実行: bun test tests/api.test.ts

### FastAPI サーバーが接続できない

- FastAPI が起動しているか確認: curl http://localhost:8000/health
- OLLAMA_HOST が正しく設定されているか確認
- ファイアウォール設定を確認

## 参考資料

- [Bun ドキュメント](https://bun.sh/docs)
- [Elysia フレームワーク](https://elysiajs.com)
- [FastAPI](https://fastapi.tiangolo.com)
- [RAG パターン](https://python.langchain.com/docs/use_cases/question_answering/)
