# Phase 5 追加機能 API 仕様書

## 概要
Phase 5では、WebSocket統合、監査ログ自動記録、管理画面拡張、パフォーマンス最適化を実装しました。

## WebSocket API

### エンドポイント
```
ws://localhost:3000/ws
```

### 接続
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### メッセージ形式
```json
{
  "type": "chat" | "notification" | "dashboard",
  "room": "room-id",
  "data": { ... }
}
```

### ルーム機能
- チャットルーム
- 通知チャンネル
- ダッシュボードリアルタイム更新

## 管理API

### ジョブキュー統計
```http
GET /admin/jobs/stats
Authorization: Bearer {JWT_TOKEN}
```

**レスポンス:**
```json
{
  "waiting": 10,
  "active": 2,
  "completed": 150,
  "failed": 5
}
```

### メールジョブ追加
```http
POST /admin/jobs/email
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<h1>Hello</h1>"
}
```

### レポート生成ジョブ
```http
POST /admin/jobs/report
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "reportType": "daily" | "weekly" | "monthly",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

### Cron統計
```http
GET /admin/cron/stats
Authorization: Bearer {JWT_TOKEN}
```

**レスポンス:**
```json
{
  "totalTasks": 5,
  "enabledTasks": 4,
  "disabledTasks": 1
}
```

### Cronタスク一覧
```http
GET /admin/cron/tasks
Authorization: Bearer {JWT_TOKEN}
```

**レスポンス:**
```json
{
  "tasks": [
    {
      "name": "daily-report",
      "cronTime": "0 9 * * *",
      "enabled": true,
      "nextRun": "2024-01-02T09:00:00Z"
    }
  ]
}
```

### Cronタスク実行
```http
POST /admin/cron/tasks/{name}/run
Authorization: Bearer {JWT_TOKEN}
```

### 監査ログ統計
```http
GET /admin/audit/stats
Authorization: Bearer {JWT_TOKEN}
```

**レスポンス:**
```json
{
  "totalLogs": 50000,
  "last24Hours": 1200,
  "last7Days": 8500
}
```

### 監査ログ検索
```http
GET /admin/audit/logs?userId={id}&action={action}&resource={resource}&limit=50
Authorization: Bearer {JWT_TOKEN}
```

**クエリパラメータ:**
- `userId` (optional): ユーザーID
- `action` (optional): アクション (READ, CREATE, UPDATE, DELETE)
- `resource` (optional): リソース種別
- `limit` (optional): 取得件数 (デフォルト: 50)

**レスポンス:**
```json
{
  "logs": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "userId": "user123",
      "action": "READ",
      "resource": "feedback",
      "resourceId": "fb456",
      "statusCode": 200,
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

### 監査ログエクスポート
```http
GET /admin/audit/export?format=json|csv
Authorization: Bearer {JWT_TOKEN}
```

**フォーマット:**
- `json`: JSON形式でダウンロード
- `csv`: CSV形式でダウンロード

## 自動監査ログ

### 記録内容
すべてのAPIリクエストが自動的に監査ログに記録されます:

- タイムスタンプ
- ユーザーID (JWT から抽出)
- アクション (HTTP メソッドから判定)
- リソース種別 (URL パスから抽出)
- リソースID
- ステータスコード
- IPアドレス
- User-Agent

### 除外パス
以下のパスは自動記録から除外されます:
- `/ping`
- `/health`
- `/metrics`
- `/swagger`

### アクション判定
| HTTP メソッド | アクション |
|--------------|----------|
| GET          | READ     |
| POST         | CREATE   |
| PUT/PATCH    | UPDATE   |
| DELETE       | DELETE   |

### リソース種別
URLパスから自動判定:
- `/feedback` → feedback
- `/knowledge` → knowledge
- `/user` → user
- `/chat` → chat
- `/files` → file
- `/admin/jobs` → job
- `/admin/cron` → cron
- `/admin/audit` → audit

## パフォーマンス最適化

### Redis キャッシュ

#### 初期化
```typescript
import { cacheService } from "./lib/cache-service";
await cacheService.initialize();
```

#### 基本操作
```typescript
// Set
await cacheService.set("key", { data: "value" }, { ttl: 300 });

// Get
const data = await cacheService.get<{ data: string }>("key");

// Delete
await cacheService.delete("key");

// Check existence
const exists = await cacheService.has("key");

// Pattern invalidation
await cacheService.invalidatePattern("user:*");
```

#### クエリ結果キャッシュ
```typescript
const result = await cacheService.cacheQueryResult(
  "feedback:recent",
  async () => {
    return await db.query("SELECT * FROM feedback LIMIT 10");
  },
  300 // 5 minutes TTL
);
```

#### API キーキャッシュ
```typescript
// Cache API key validation
await cacheService.cacheAPIKey("api_key_123", "user456", 3600);

// Validate
const validation = await cacheService.validateAPIKey("api_key_123");
// => { userId: "user456", valid: true }

// Invalidate
await cacheService.invalidateAPIKey("api_key_123");
```

### クエリ最適化

#### インデックス作成
```typescript
import { queryOptimizer } from "./lib/query-optimizer";

// Get index recommendations
const indexes = queryOptimizer.getIndexRecommendations("feedback");

// Create all indexes
await queryOptimizer.createIndexes(db);
```

#### クエリ分析
```typescript
const analysis = queryOptimizer.analyzeQuery(
  "SELECT * FROM feedback WHERE rating > 3"
);

console.log(analysis);
// {
//   type: "SELECT",
//   tables: ["feedback"],
//   hasWhere: true,
//   hasJoin: false,
//   hasOrderBy: false,
//   hasLimit: false,
//   optimizationSuggestions: [
//     "Consider adding LIMIT to prevent fetching too many rows"
//   ]
// }
```

#### クエリ統計
```typescript
// Record execution time
queryOptimizer.recordQueryExecution(query, executionTime);

// Get slowest queries
const slowQueries = queryOptimizer.getSlowestQueries(10);

// Get most frequent queries
const frequentQueries = queryOptimizer.getMostFrequentQueries(10);

// Reset statistics
queryOptimizer.resetStats();
```

## 管理ダッシュボード UI

### アクセス
```
http://localhost:3000/admin-extended.html
```

### 機能
1. **ジョブキュータブ**
   - 統計表示 (待機中/実行中/完了/失敗)
   - メールジョブ追加
   - レポート生成

2. **Cronタスクタブ**
   - タスク統計
   - タスク一覧表示
   - 手動実行ボタン

3. **監査ログタブ**
   - ログ統計
   - 検索機能 (ユーザー/アクション/リソース)
   - JSON/CSVエクスポート

4. **ファイル管理タブ**
   - ストレージ統計
   - ファイルアップロード
   - マイファイル一覧

### 認証
初回アクセス時にJWTトークンの入力が必要です。

## エラーハンドリング

### 認証エラー
```json
{
  "error": "Missing Bearer token"
}
```
ステータスコード: 401

### レート制限
```json
{
  "error": "Rate limit exceeded"
}
```
ステータスコード: 429

### サーバーエラー
```json
{
  "error": "Internal server error"
}
```
ステータスコード: 500

## セキュリティ

### 推奨事項
1. JWT トークンは安全に保管
2. HTTPS を使用 (本番環境)
3. CORS設定を適切に構成
4. レート制限を有効化
5. 監査ログを定期的にレビュー

### 監査ログのプライバシー
- リクエストボディは記録されません (デフォルト)
- IPアドレスは記録されます
- User-Agentは記録されます

## トラブルシューティング

### WebSocket接続エラー
```
Error: WebSocket connection failed
```
**解決策:**
1. サーバーが起動しているか確認
2. ポート3000が開放されているか確認
3. ファイアウォール設定を確認

### Redis接続エラー
```
Redis cache error: Connection refused
```
**解決策:**
1. Redisサーバーが起動しているか確認
2. `REDIS_URL` 環境変数を確認
3. ネットワーク接続を確認

### 監査ログが記録されない
**確認事項:**
1. 除外パスに含まれていないか確認
2. ミドルウェアが正しく登録されているか確認
3. データベース接続を確認

## パフォーマンスチューニング

### キャッシュTTL推奨値
| データ種別 | TTL |
|----------|-----|
| ユーザーセッション | 3600秒 (1時間) |
| APIキー検証 | 3600秒 (1時間) |
| フィードバック一覧 | 300秒 (5分) |
| 統計情報 | 60秒 (1分) |

### データベースインデックス
自動的に以下のインデックスが作成されます:
- feedback: rating, category, user_id, created_at
- knowledge: user_id, tags (GIN), created_at, full-text search (GIN)
- users: email, created_at
- sessions: user_id, expires_at
- api_keys: user_id, key_hash, expires_at
- audit_logs: user_id, action, resource, timestamp, composite

### クエリ最適化ヒント
1. `SELECT *` を避け、必要なカラムのみ指定
2. `WHERE` 句でフィルタリング
3. `LIMIT` で結果件数を制限
4. 複数の `JOIN` は避ける
5. インデックスを活用

## 開発環境セットアップ

### 必要な環境変数
```bash
PORT=3000
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

### 開発サーバー起動
```bash
bun run dev
```

### テスト実行
```bash
bun test
```

## 本番環境デプロイ

### チェックリスト
- [ ] 環境変数を設定
- [ ] Redisサーバーをセットアップ
- [ ] データベースマイグレーション実行
- [ ] インデックスを作成
- [ ] HTTPS を有効化
- [ ] CORS設定を本番用に変更
- [ ] レート制限を適切に設定
- [ ] 監査ログのローテーション設定
- [ ] バックアップスケジュール設定

### Docker Compose
```bash
docker-compose up -d
```

### ヘルスチェック
```bash
curl http://localhost:3000/health
```

## 更新履歴

### Phase 5 (2024-01)
- ✅ WebSocket統合完了
- ✅ 監査ログ自動記録ミドルウェア実装
- ✅ 管理画面拡張 (ジョブキュー/Cron/監査ログ/ファイル管理)
- ✅ Redisキャッシュサービス実装
- ✅ クエリ最適化ツール実装

### Phase 4
- ジョブキュー実装
- WebSocketマネージャー実装
- ファイルアップロード機能
- Cronスケジューラー実装
- 監査ログ手動記録機能
