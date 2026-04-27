# トラブルシューチE��ングガイチE- Elysia AI

## サーバ�E起動エラー

### ポ�EチE3000 が既に使用中

```
EADDRINUSE: Failed to start server. Is port 3000 in use?
```

**解決筁E*:

#### Windows PowerShell

```powershell
# Bun プロセス停止
Get-Process bun | Stop-Process -Force

# ポ�Eト使用状況確誁Enetstat -ano | findstr ":3000"

# プロセス ID から強制終亁EStop-Process -Id <PID> -Force
```

#### Linux/macOS

```bash
# ポ�Eト使用状況確誁Elsof -i :3000

# プロセス終亁Ekill -9 <PID>
```

---

### チE�Eタベ�Eス接続エラー

```
⚠�E�EPrisma database not configured, using in-memory fallback
```

**原因**: Prisma 設定不足また�EチE�Eタベ�Eスマイグレーション未実衁E
**解決筁E*:

1. `.env` に `DATABASE_URL` を設定！E
```env
DATABASE_URL="file:./prisma/dev.db"
```

2. Prisma クライアント生成！E
```bash
bunx prisma generate
```

3. マイグレーション実行！E
```bash
bunx prisma migrate dev --name init
```

---

### Health Check エラー

```
Health check failed: database { failures: 1, error: "Check returned false" }
Health check failed: disk_space { failures: 1, error: "Check returned false" }
```

**原因**: チE�Eタベ�Eス未初期化また�EチE��スク容量不足

**解決筁E*:

- チE�Eタベ�Eスマイグレーション実衁E- チE��スク容量確誁E- ロードしすぎたログファイルを削除�E�`rm logs/*.log`

---

## FastAPI 接続エラー

### FastAPI サーバ�Eが応答しなぁE
```
Error: connect ECONNREFUSED 127.0.0.1:8000
```

**解決筁E*:

1. FastAPI が起動してぁE��か確認！E
```powershell
Get-Process python -ErrorAction SilentlyContinue

# 起動されてぁE��ぁE��吁Epython python/fastapi_server.py
```

2. Python 依存関係確認！E
```bash
python -m pip install -r python/requirements.txt
```

3. FastAPI ヘルスチェチE���E�E
```bash
Invoke-WebRequest -Uri "http://localhost:8000/health"
```

---

## Ollama 接続エラー

### Ollama サーバ�Eが応答しなぁE
```
Error: Failed to connect to Ollama at http://localhost:11434
```

**解決筁E*:

1. Ollama が起動してぁE��か確認！E
```bash
ollama list
ollama serve
```

2. モチE��確認！E
```bash
curl http://localhost:11434/api/tags
```

3. チE��ト実行！E
```bash
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2","messages":[{"role":"user","content":"hi"}]}'
```

---

## Redis 接続エラー

### Redis に接続できなぁE
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**解決筁E*:

#### Docker で Redis 起勁E
```bash
docker run -d --name redis -p 6379:6379 redis:alpine

# 確誁Edocker ps | findstr redis

# 停止
docker stop redis
docker rm redis
```

#### Redis 無効化（レート制限が不要な場合！E
```env
REDIS_ENABLED=false
```

---

## TypeScript コンパイルエラー

### `tsconfig.json` エラー

```
TS18002: The 'files' list in config file 'tsconfig.json' is empty.
```

**解決筁E*:

1. `tsconfig.json` に `include` フィールドがあることを確認！E
```json
{
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

2. Webpack 設定でコンフィグファイルを指定！E
```javascript
options: {
  configFile: path.resolve(__dirname, "tsconfig.json"),
  transpileOnly: true,
}
```

---

### 型チェチE��エラー

```
error TS2322: Type 'X' is not assignable to type 'Y'
```

**解決筁E*:

1. 厳寁E��ードを確認！E
```bash
bun run lint
```

2. 型定義をチェチE���E�E
```bash
bun run build
```

3. 忁E��に応じて `// @ts-ignore` コメントを使用�E�一時的�E�E
---

## チE��ト実行エラー

### チE��ト失敁E
```
❁EAll tests failed
```

**解決筁E*:

```bash
# すべてのチE��ト実衁Ebun test

# 特定�EチE��ト実衁Ebun test src/lib/__tests__/database.test.ts

# ウォチE��モーチEbun test --watch
```

---

## ビルドエラー

### Webpack コンパイル失敁E
```
ERROR in main
Module not found: Error: Can't resolve
```

**解決筁E*:

1. エントリーポイント確認！E
```javascript
entry: path.resolve(__dirname, "../../src", "index.ts");
```

2. キャチE��ュクリア�E�E
```bash
bun run clean
bun install
bun run build
```

---

## パフォーマンス問顁E
### メモリ使用量が多い

**解決筁E*:

1. ログレベル調整�E�E
```env
LOG_LEVEL=info
```

2. ヒ�Eプサイズ設定！E
```bash
bun --max-old-space-size=2048 run src/index.ts
```

3. キャチE��ュクリア�E�E
```bash
bun run clean
```

---

### レスポンス時間が遅ぁE
**解決筁E*:

1. Redis キャチE��ュ有効匁E2. 不要なヘルスチェチE��無効匁E3. ログレベル低下：`LOG_LEVEL=warn`

---

## ネットワーク問顁E
### CORS エラー

```
Access to XMLHttpRequest blocked by CORS policy
```

**解決筁E*:

`.env` で許可オリジン設定！E
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

また�E `src/index.ts` で設定！E
```typescript
cors({
  origin: process.env.ALLOWED_ORIGINS?.split(","),
});
```

---

## ログ確誁E
### ログファイルの場所

```
logs/
├── app.log          # アプリケーションログ
├── error.log        # エラーログ
└── audit/           # 監査ログ
```

### ログ確誁E
```powershell
# 最新のエラーログ
Get-Content logs/error.log | Select-Object -Last 50

# リアルタイムログ
Get-Content logs/app.log -Wait

# 特定�Eパターンで検索
Get-Content logs/app.log | Select-String "ERROR"
```

---

## チE��チE��モーチE
### チE��チE��ログ有効匁E
```env
DEBUG=true
LOG_LEVEL=debug
NODE_ENV=development
SOURCE_MAPS=true
```

### チE��チE��ー接綁E
```bash
bun run --inspect src/index.ts
```

---

## サポ�EチE
問題が解決しなぁE��吁E

1. ログを確誁E `logs/error.log`
2. GitHub Issues で検索: https://github.com/Elysia20220909/ElysiaAI/issues
3. 環墁E��報を記録:
   - Bun バ�Eジョン: `bun --version`
   - Node.js バ�Eジョン: `node --version`
   - OS: `$PSVersionTable.OS`

---

**最終更新**: 2025年12朁E日
