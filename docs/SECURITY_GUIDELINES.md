# セキュリティ実装ガイドライン

## 基本原則

### 1. クライアントサイドは信用しない

**クライアントサイドは無法地帯です。**すべての入力を検証し、サニタイズする必要があります。

```typescript
// ❌ BAD - クライアントから受け取った値をそのまま使用
app.post("/api/user", ({ body }) => {
  const user = await db.createUser(body.username, body.password);
  return { user }; // パスワードハッシュなどもそのまま返してしまう
});

// ✅ GOOD - サーバーサイドで検証し、機密情報をフィルタリング
app.post("/api/user", ({ body, set }) => {
  // 1. 入力検証
  const validation = validateUsername(body.username);
  if (!validation.isValid) {
    set.status = 400;
    return { error: validation.errors[0] };
  }

  const passwordValidation = validatePassword(body.password);
  if (!passwordValidation.isValid) {
    set.status = 400;
    return { error: passwordValidation.errors[0] };
  }

  // 2. サニタイズ
  const sanitizedUsername = body.username.trim();

  // 3. 処理
  const user = await db.createUser(sanitizedUsername, body.password);

  // 4. レスポンスから機密情報を除外
  const { password, passwordHash, ...safeUser } = user;
  return { user: safeUser };
});
```

### 2. 秘密を保持できるのはサーバーだけ

**クライアントに送信した情報は、すべて攻撃者に読まれると想定してください。**

```typescript
// ❌ BAD - 環境変数やAPIキーをクライアントに送信
app.get("/config", () => {
  return {
    apiKey: process.env.API_KEY,
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
  };
});

// ✅ GOOD - 公開可能な設定のみ送信
app.get("/config", () => {
  return {
    appName: "Elysia AI",
    version: "1.0.0",
    features: ["chat", "rag"],
  };
});
```

### 3. すべての入力を検証する

```typescript
import { validateUserInput, sanitizeHtml } from "@/lib/input-sanitizer";

app.post("/api/chat", ({ body, set }) => {
  // 1. 型チェック
  if (!body.message || typeof body.message !== "string") {
    set.status = 400;
    return { error: "不正な入力です" };
  }

  // 2. サーバーサイド検証
  const validation = validateUserInput(body.message, 1000);
  if (!validation.isValid) {
    set.status = 400;
    return { error: validation.errors[0] };
  }

  // 3. サニタイズ
  const sanitizedMessage = sanitizeHtml(body.message);

  // 4. 処理続行
  return processChat(sanitizedMessage);
});
```

## 実装チェックリスト

### 入力検証

- [ ] すべてのユーザー入力を検証
- [ ] 最大長の制限
- [ ] 型チェック
- [ ] SQL インジェクションパターンの検出
- [ ] プロンプトインジェクションパターンの検出
- [ ] XSS 攻撃パターンの検出
- [ ] 制御文字の除去

### レスポンスのフィルタリング

- [ ] パスワード/パスワードハッシュを除外
- [ ] API キー/トークンを除外
- [ ] データベース接続文字列を除外
- [ ] 内部設定値を除外
- [ ] エラーメッセージから実装詳細を除外

### 認証・認可

- [ ] すべての保護エンドポイントで認証チェック
- [ ] トークンの有効期限チェック
- [ ] リフレッシュトークンの適切な管理
- [ ] ブルートフォース攻撃対策（レート制限）
- [ ] タイミング攻撃対策（常に同じ時間かけて応答）
- [ ] 権限レベルのチェック

### 秘密情報の管理

- [ ] 環境変数から読み込む
- [ ] デフォルト値を本番環境で使用しない
- [ ] ログに秘密情報を出力しない
- [ ] クライアントに秘密情報を送信しない
- [ ] コミットに秘密情報を含めない

## よくある脆弱性パターン

### 1. 情報漏洩

```typescript
// ❌ BAD
app.get("/user/:id", async ({ params }) => {
  const user = await db.getUser(params.id);
  return user; // すべてのフィールドを返す
});

// ✅ GOOD
app.get("/user/:id", async ({ params }) => {
  const user = await db.getUser(params.id);
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
    // password, email, etc. は含めない
  };
});
```

### 2. エラーメッセージからの情報漏洩

```typescript
// ❌ BAD - 実装詳細を漏らす
app.post("/login", async ({ body, set }) => {
  const user = await db.findUser(body.username);
  if (!user) {
    set.status = 401;
    return { error: "ユーザーが存在しません" }; // ユーザー名の存在を教えている
  }

  if (!(await bcrypt.compare(body.password, user.passwordHash))) {
    set.status = 401;
    return { error: "パスワードが間違っています" }; // パスワードが原因だと教えている
  }

  return { token: generateToken(user) };
});

// ✅ GOOD - 汎用的なエラーメッセージ
app.post("/login", async ({ body, set }) => {
  await new Promise((resolve) => setTimeout(resolve, 200)); // タイミング攻撃対策

  const user = await db.findUser(body.username);
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    set.status = 401;
    return { error: "ユーザー名またはパスワードが正しくありません" };
  }

  return { token: generateToken(user) };
});
```

### 3. レート制限の欠如

```typescript
// ❌ BAD - レート制限なし
app.post("/login", handleLogin);

// ✅ GOOD - レート制限あり
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

app.post("/login", async ({ body, request, set }) => {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();

  // レート制限チェック
  const attempts = loginAttempts.get(ip);
  if (attempts) {
    if (now < attempts.resetAt) {
      if (attempts.count >= 5) {
        set.status = 429;
        return { error: "試行回数が多すぎます。しばらくしてから再度お試しください" };
      }
      attempts.count++;
    } else {
      loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    }
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
  }

  return handleLogin({ body, request, set });
});
```

## セキュリティヘッダー

すべてのレスポンスに適切なセキュリティヘッダーを設定：

```typescript
app.use((req, res, next) => {
  // XSS対策
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // HTTPS強制（本番環境）
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  // CSP
  res.setHeader("Content-Security-Policy", "default-src 'self'");

  next();
});
```

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## 定期的なセキュリティレビュー

- [ ] 依存関係の脆弱性スキャン（`npm audit`, `bun audit`）
- [ ] コードレビューでセキュリティチェック
- [ ] ペネトレーションテスト
- [ ] セキュリティログの監視
