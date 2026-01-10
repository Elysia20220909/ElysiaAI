# セキュリティ機能統合ガイド

## 実装されたセキュリティ機能

### 1. Redis レート制限システム

[src/lib/redis-rate-limiter.ts](../src/lib/redis-rate-limiter.ts)

#### 機能

- IP 単位のレート制限
- ユーザー単位のレート制限
- ログイン試行の制限（5 回/15 分、30 分ブロック）
- API リクエストの制限（Free: 20req/分、Premium: 100req/分）
- チャットリクエストの制限（10 メッセージ/分）

#### 使用例

```typescript
import { redisRateLimiter } from "@/lib/redis-rate-limiter";

// 初期化（サーバー起動時）
await redisRateLimiter.initialize();

// ログイン試行のレート制限
app.post("/api/auth/login", async ({ body, request, set }) => {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  const result = await redisRateLimiter.checkLoginAttempt(ip);

  if (!result.allowed) {
    set.status = 429;
    set.headers["Retry-After"] = result.retryAfter?.toString() || "60";
    return {
      error: "ログイン試行回数が上限を超えました",
      retryAfter: result.retryAfter,
    };
  }

  // ログイン処理...
});

// APIリクエストのレート制限
app.post("/api/chat", async ({ body, request, set }) => {
  const userId = getUserIdFromToken(request);
  const tier = await getUserTier(userId); // 'free' | 'premium'

  const result = await redisRateLimiter.checkApiRequest(userId, tier);

  if (!result.allowed) {
    set.status = 429;
    return {
      error: "レート制限を超えました",
      remaining: result.remaining,
      resetAt: result.resetAt,
    };
  }

  // チャット処理...
});
```

### 2. JWT 管理システム

[src/lib/jwt-manager.ts](../src/lib/jwt-manager.ts)

#### 機能

- アクセストークン（15 分有効）
- リフレッシュトークン（7 日有効）
- トークンのローテーション
- トークンの無効化（ログアウト）
- ユーザーの全トークン無効化

#### 使用例

```typescript
import { jwtManager } from "@/lib/jwt-manager";

// 初期化（サーバー起動時）
await jwtManager.initialize();

// ログイン時：トークンペア生成
app.post("/api/auth/login", async ({ body, set }) => {
  const user = await authenticateUser(body.username, body.password);

  if (!user) {
    set.status = 401;
    return { error: "認証に失敗しました" };
  }

  const tokens = await jwtManager.generateTokenPair({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
  };
});

// トークン検証ミドルウェア
const requireAuth = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return { valid: false, error: "トークンが必要です" };
  }

  const validation = await jwtManager.validateAccessToken(token);

  if (!validation.valid) {
    if (validation.expired) {
      return { valid: false, error: "トークンの有効期限が切れています" };
    }
    return { valid: false, error: "無効なトークンです" };
  }

  return { valid: true, payload: validation.payload };
};

// トークンのリフレッシュ
app.post("/api/auth/refresh", async ({ body, set }) => {
  const { refreshToken } = body;

  const newTokens = await jwtManager.refreshTokens(refreshToken);

  if (!newTokens) {
    set.status = 401;
    return { error: "リフレッシュトークンが無効です" };
  }

  return newTokens;
});

// ログアウト
app.post("/api/auth/logout", async ({ request, set }) => {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const userId = getUserIdFromToken(token);

  await jwtManager.revokeToken(token, userId);

  return { message: "ログアウトしました" };
});
```

### 3. 監査ログシステム

既存の [src/lib/audit-logger.ts](../src/lib/audit-logger.ts) を活用

#### 使用例

```typescript
import { auditLogger } from "@/lib/audit-logger";

// 初期化（サーバー起動時）
auditLogger.initialize();

// 認証成功のログ
auditLogger.logLoginSuccess(user.id, user.username, ipAddress, userAgent);

// 認証失敗のログ
auditLogger.logLoginFailure(username, ipAddress, "Invalid password", userAgent);

// アクセス拒否のログ
auditLogger.logAccessDenied(userId, "/api/admin", "Insufficient permissions", ipAddress);

// カスタムログ
auditLogger.log({
  eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
  severity: AuditSeverity.WARNING,
  userId,
  ipAddress,
  message: "Multiple failed login attempts",
  details: {
    attempts: 5,
    timeframe: "5 minutes",
  },
});

// ログ検索（管理者用）
const recentFailures = await auditLogger.searchLogs({
  eventType: AuditEventType.LOGIN_FAILURE,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 過去24時間
  limit: 100,
});
```

### 4. 入力サニタイゼーション

[src/lib/input-sanitizer.ts](../src/lib/input-sanitizer.ts)

#### 使用例

```typescript
import { validateUserInput, validateUsername, validatePassword, sanitizeResponse, containsSqlInjection, containsPromptInjection } from "@/lib/input-sanitizer";

// 包括的な入力検証
app.post("/api/chat", async ({ body, set }) => {
  const validation = validateUserInput(body.message, 1000);

  if (!validation.isValid) {
    set.status = 400;
    return { error: validation.errors[0] };
  }

  // 警告がある場合はログに記録
  if (validation.warnings.length > 0) {
    auditLogger.logSuspiciousActivity(AuditEventType.PROMPT_INJECTION_ATTEMPT, "Potential security issue detected", { warnings: validation.warnings, input: body.message }, ipAddress);
  }

  // 処理続行...
});

// ユーザー登録時の検証
app.post("/api/auth/register", async ({ body, set }) => {
  const usernameValidation = validateUsername(body.username);
  const passwordValidation = validatePassword(body.password);

  if (!usernameValidation.isValid) {
    set.status = 400;
    return { error: usernameValidation.errors[0] };
  }

  if (!passwordValidation.isValid) {
    set.status = 400;
    return { error: passwordValidation.errors[0] };
  }

  // ユーザー作成...
});

// レスポンスから機密情報を除去
app.get("/api/user/:id", async ({ params }) => {
  const user = await db.getUser(params.id);
  const safeUser = sanitizeResponse(user);
  return safeUser;
});
```

## 統合手順

### 1. 依存関係のインストール

```bash
bun add redis
```

### 2. 環境変数の設定

`.env`:

```env
# Redis
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this

# 監査ログ
AUDIT_LOG_DIR=./logs/audit
```

### 3. サーバー起動時の初期化

[src/index.ts](../src/index.ts) に追加:

```typescript
import { redisRateLimiter } from "@/lib/redis-rate-limiter";
import { jwtManager } from "@/lib/jwt-manager";
import { auditLogger } from "@/lib/audit-logger";

// サーバー起動時
async function startServer() {
  // セキュリティサービスの初期化
  await redisRateLimiter.initialize();
  await jwtManager.initialize();
  auditLogger.initialize();

  // サーバー起動
  app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`);
  });
}

// シャットダウン時のクリーンアップ
process.on("SIGTERM", async () => {
  logger.info("Shutting down gracefully...");

  await redisRateLimiter.disconnect();
  await jwtManager.disconnect();
  auditLogger.shutdown();

  process.exit(0);
});
```

### 4. 既存のルートに統合

各エンドポイントに適切なセキュリティチェックを追加:

```typescript
// 認証が必要なエンドポイント
app.post("/api/protected", async ({ request, set }) => {
  // 1. JWT検証
  const auth = await requireAuth(request);
  if (!auth.valid) {
    set.status = 401;
    return { error: auth.error };
  }

  // 2. レート制限
  const rateLimitResult = await redisRateLimiter.checkApiRequest(auth.payload.userId);
  if (!rateLimitResult.allowed) {
    set.status = 429;
    return { error: "Rate limit exceeded" };
  }

  // 3. 入力検証
  const validation = validateUserInput(body.data);
  if (!validation.isValid) {
    set.status = 400;
    return { error: validation.errors[0] };
  }

  // 4. 監査ログ
  auditLogger.log({
    eventType: AuditEventType.ACCESS_GRANTED,
    severity: AuditSeverity.INFO,
    userId: auth.payload.userId,
    endpoint: "/api/protected",
    message: "Protected resource accessed",
  });

  // 処理...
});
```

## セキュリティスキャンの実行

### 手動実行

```bash
# Windows
bun run security:audit

# Linux/Mac
bun run security:audit:unix

# または直接
bun audit
npm audit
```

### CI/CD 統合

`.github/workflows/security.yml`:

```yaml
name: Security Audit

on:
  schedule:
    - cron: "0 0 * * *" # 毎日午前0時
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      # actions/checkout@v4.1.1
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11

      # oven-sh/setup-bun@v1.2.2
      - name: Setup Bun
        uses: oven-sh/setup-bun@f4d14e03ff726c06358e8fd14ba449ca428e1f43

      - name: Install dependencies
        run: bun install

      - name: Run security audit
        run: bun run security:audit:unix

      # actions/upload-artifact@v3.1.3
      - name: Upload security logs
        if: always()
        uses: actions/upload-artifact@a8a3f3ad30e3422c9c7b888a15615d19a852ae32
        with:
          name: security-logs
          path: logs/security/
```

## モニタリング

### 監査ログの確認

```bash
# 最新の監査ログを確認
tail -f logs/audit/audit.jsonl

# 特定のイベントを検索
grep "login_failure" logs/audit/audit.jsonl | jq .
```

### セキュリティダッシュボード

管理者用エンドポイントでセキュリティ統計を公開:

```typescript
app.get("/api/admin/security/stats", async ({ request, set }) => {
  // 管理者権限チェック
  const auth = await requireAuth(request);
  if (auth.payload?.role !== "admin") {
    set.status = 403;
    return { error: "Forbidden" };
  }

  const recentFailures = await auditLogger.searchLogs({
    eventType: AuditEventType.LOGIN_FAILURE,
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });

  const recentBlocks = await auditLogger.searchLogs({
    eventType: AuditEventType.RATE_LIMIT_BLOCKED,
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });

  return {
    loginFailures: recentFailures.length,
    rateLimitBlocks: recentBlocks.length,
    timestamp: new Date().toISOString(),
  };
});
```

## トラブルシューティング

### Redis に接続できない

```typescript
// フォールバック動作を確認
if (!redisRateLimiter.isEnabled()) {
  logger.warn("Redis rate limiter is disabled. Rate limiting is not active.");
}
```

### トークンが無効化されない

- Redis の接続を確認
- トークンキーの TTL を確認: `redis-cli TTL "revoked_token:..."`

### 監査ログが記録されない

- ログディレクトリの権限を確認
- バッファフラッシュが正常に動作しているか確認
