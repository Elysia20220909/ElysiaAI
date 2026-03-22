# トラブルシューティングガイド - Elysia AI

## サーバー起動エラー

### ポート 3000 が既に使用中

```
EADDRINUSE: Failed to start server. Is port 3000 in use?
```

**解決策**:

#### Windows PowerShell

```powershell
# Bun プロセス停止
Get-Process bun | Stop-Process -Force

# ポート使用状況確認
netstat -ano | findstr ":3000"

# プロセス ID から強制終了
Stop-Process -Id <PID> -Force
```

#### Linux/macOS

```bash
# ポート使用状況確認
lsof -i :3000

# プロセス終了
kill -9 <PID>
```

---

### データベース接続エラー

```
⚠️ Prisma database not configured, using in-memory fallback
```

**原因**: Prisma 設定不足またはデータベースマイグレーション未実行

**解決策**:

1. `.env` に `DATABASE_URL` を設定：

```env
DATABASE_URL="file:./prisma/dev.db"
```

2. Prisma クライアント生成：

```bash
bunx prisma generate
```

3. マイグレーション実行：

```bash
bunx prisma migrate dev --name init
```

---

### Health Check エラー

```
Health check failed: database { failures: 1, error: "Check returned false" }
Health check failed: disk_space { failures: 1, error: "Check returned false" }
```

**原因**: データベース未初期化またはディスク容量不足

**解決策**:

- データベースマイグレーション実行
- ディスク容量確認
- ロードしすぎたログファイルを削除：`rm logs/*.log`

---

## FastAPI 接続エラー

### FastAPI サーバーが応答しない

```
Error: connect ECONNREFUSED 127.0.0.1:8000
```

**解決策**:

1. FastAPI が起動しているか確認：

```powershell
Get-Process python -ErrorAction SilentlyContinue

# 起動されていない場合
python python/fastapi_server.py
```

2. Python 依存関係確認：

```bash
python -m pip install -r python/requirements.txt
```

3. FastAPI ヘルスチェック：

```bash
Invoke-WebRequest -Uri "http://localhost:8000/health"
```

---

## Ollama 接続エラー

### Ollama サーバーが応答しない

```
Error: Failed to connect to Ollama at http://localhost:11434
```

**解決策**:

1. Ollama が起動しているか確認：

```bash
ollama list
ollama serve
```

2. モデル確認：

```bash
curl http://localhost:11434/api/tags
```

3. テスト実行：

```bash
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2","messages":[{"role":"user","content":"hi"}]}'
```

---

## Redis 接続エラー

### Redis に接続できない

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**解決策**:

#### Docker で Redis 起動

```bash
docker run -d --name redis -p 6379:6379 redis:alpine

# 確認
docker ps | findstr redis

# 停止
docker stop redis
docker rm redis
```

#### Redis 無効化（レート制限が不要な場合）

```env
REDIS_ENABLED=false
```

---

## TypeScript コンパイルエラー

### `tsconfig.json` エラー

```
TS18002: The 'files' list in config file 'tsconfig.json' is empty.
```

**解決策**:

1. `tsconfig.json` に `include` フィールドがあることを確認：

```json
{
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

2. Webpack 設定でコンフィグファイルを指定：

```javascript
options: {
  configFile: path.resolve(__dirname, "tsconfig.json"),
  transpileOnly: true,
}
```

---

### 型チェックエラー

```
error TS2322: Type 'X' is not assignable to type 'Y'
```

**解決策**:

1. 厳密モードを確認：

```bash
bun run lint
```

2. 型定義をチェック：

```bash
bun run build
```

3. 必要に応じて `// @ts-ignore` コメントを使用（一時的）

---

## テスト実行エラー

### テスト失敗

```
❌ All tests failed
```

**解決策**:

```bash
# すべてのテスト実行
bun test

# 特定のテスト実行
bun test src/lib/__tests__/database.test.ts

# ウォッチモード
bun test --watch
```

---

## ビルドエラー

### Webpack コンパイル失敗

```
ERROR in main
Module not found: Error: Can't resolve
```

**解決策**:

1. エントリーポイント確認：

```javascript
entry: path.resolve(__dirname, "../../src", "index.ts");
```

2. キャッシュクリア：

```bash
bun run clean
bun install
bun run build
```

---

## パフォーマンス問題

### メモリ使用量が多い

**解決策**:

1. ログレベル調整：

```env
LOG_LEVEL=info
```

2. ヒープサイズ設定：

```bash
bun --max-old-space-size=2048 run src/index.ts
```

3. キャッシュクリア：

```bash
bun run clean
```

---

### レスポンス時間が遅い

**解決策**:

1. Redis キャッシュ有効化
2. 不要なヘルスチェック無効化
3. ログレベル低下：`LOG_LEVEL=warn`

---

## ネットワーク問題

### CORS エラー

```
Access to XMLHttpRequest blocked by CORS policy
```

**解決策**:

`.env` で許可オリジン設定：

```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

または `src/index.ts` で設定：

```typescript
cors({
  origin: process.env.ALLOWED_ORIGINS?.split(","),
});
```

---

## ログ確認

### ログファイルの場所

```
logs/
├── app.log          # アプリケーションログ
├── error.log        # エラーログ
└── audit/           # 監査ログ
```

### ログ確認

```powershell
# 最新のエラーログ
Get-Content logs/error.log | Select-Object -Last 50

# リアルタイムログ
Get-Content logs/app.log -Wait

# 特定のパターンで検索
Get-Content logs/app.log | Select-String "ERROR"
```

---

## デバッグモード

### デバッグログ有効化

```env
DEBUG=true
LOG_LEVEL=debug
NODE_ENV=development
SOURCE_MAPS=true
```

### デバッガー接続

```bash
bun run --inspect src/index.ts
```

---

## サポート

問題が解決しない場合:

1. ログを確認: `logs/error.log`
2. GitHub Issues で検索: https://github.com/chloeamethyst/ElysiaJS/issues
3. 環境情報を記録:
   - Bun バージョン: `bun --version`
   - Node.js バージョン: `node --version`
   - OS: `$PSVersionTable.OS`

---

**最終更新**: 2025年12月4日
