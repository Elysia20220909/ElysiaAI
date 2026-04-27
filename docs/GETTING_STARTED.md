# Elysia AI - クイックスタートガイド

## 🚀 5分で始める

### 前提条件

- Bun 1.0.0+ がインストールされていること
- PostgreSQL 14+ が起動していること（オプション）

### ステップ1: プロジェクトのクローン

```bash
git clone https://github.com/Elysia20220909/ElysiaAI.git
cd ElysiaAI
```

### ステップ2: 環境構築 (統合CLI)

ElysiaAI は `manage.ts` を使用してセットアップを一括管理します。

```bash
# 依存関係のインストールと .env の作成
bun scripts/manage.ts setup

# Python 仮想環境 (.venv) の構築
bun scripts/manage.ts setup-python
```

### ステップ3: サーバーの起動

```bash
# ローカルスタック（Server & Kernel）を一括起動
bun scripts/manage.ts dev
```

サーバーが起動したら、ブラウザで以下にアクセス:

- Web UI: http://localhost:3000
- API Docs: http://localhost:3000/swagger
- 🧪 星空の観測: `bun scripts/manage.ts stars`

## 📝 基本的な使い方

### チャットAPI

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "こんにちは"}
    ],
    "mode": "sweet"
  }'
```

### ユーザー登録

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### ログイン

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "password": "SecurePass123!"
  }'
```

レスポンス:

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "1",
    "username": "test_user"
  }
}
```

### フィードバック送信

```bash
curl -X POST http://localhost:3000/feedback \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "category": "response_quality",
    "comment": "とても良かったです！"
  }'
```

## 🎯 主な機能

### 1. AIチャット

3つのモードでAIと会話:

- **sweet**: 親しみやすい口調（デフォルト）
- **normal**: 標準的な口調
- **professional**: ビジネス向けフォーマル

### 2. RAG（Retrieval-Augmented Generation）

ナレッジベースを使った高精度な回答:

```bash
# ナレッジ追加
curl -X POST http://localhost:3000/knowledge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Elysiaは高速なTypeScript Webフレームワークです",
    "tags": ["elysia", "typescript"]
  }'
```

### 3. WebSocket リアルタイム通信

```javascript
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: "chat",
      room: "general",
      data: { message: "Hello!" },
    }),
  );
};
```

### 4. 管理ダッシュボード

http://localhost:3000/admin-extended.html

- ジョブキュー管理
- Cronタスク管理
- 監査ログ検索
- ファイル管理

## 🔧 開発コマンド

```bash
# 開発サーバー起動
bun run dev

# 本番ビルド
bun run build

# テスト実行
bun test

# Lint実行
bun run lint

# フォーマット
bun run format
```

## 📚 次のステップ

- [完全なAPI仕様](./API.md)
- [Phase 5機能ガイド](./PHASE5_COMPLETE.md)
- [デプロイメントガイド](./DEPLOYMENT_GUIDE.md)
- [セキュリティガイド](./SECURITY.md)
- [アーキテクチャ](./ARCHITECTURE.md)

## 💡 ヒント

### Docker で起動

```bash
docker-compose up -d
```

### データベースセットアップ

```bash
# PostgreSQLに接続
psql -U postgres

# データベース作成
CREATE DATABASE elysia_ai;
CREATE USER elysia_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE elysia_ai TO elysia_user;
```

### Redis セットアップ（オプション）

```bash
# Redisインストール
bun add redis

# Redis起動
redis-server

# 環境変数設定
echo "REDIS_URL=redis://localhost:6379" >> .env
```

## ❓ トラブルシューティング

### ポートが使用中

```bash
# プロセスを確認
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# プロセスを終了
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### データベース接続エラー

1. PostgreSQLが起動しているか確認
2. `.env` の `DATABASE_URL` を確認
3. データベースとユーザーが作成されているか確認

### モジュールが見つからない

```bash
# node_modulesをクリーンアップ
rm -rf node_modules bun.lockb
bun install
```

## 🆘 サポート

- GitHub Issues: https://github.com/yourusername/elysia-ai/issues
- Discord: https://discord.gg/your-server
- Email: support@example.com

## 📄 ライセンス

MIT License - 詳細は [LICENSE](../LICENSE) を参照

---

**次は:** [完全なAPIドキュメント](./API.md) を読んで、より高度な機能を試してみましょう！
