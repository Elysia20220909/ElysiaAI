# 🛡️ エリシアAI セキュリティ対策ドキュメント

> にゃん♪ おにいちゃん、エリシアちゃんのセキュリティは完璧だよぉ〜♡

## 🔐 実装済みセキュリティ機能

### 1. **入力バリデーション (Input Validation)**

従来: 最大500文字 / 10メッセージ → 現在: 最大400文字 / 8メッセージ。

```typescript
body: t.Object({
  messages: t.Array(
    t.Object({
      role: t.Union([t.Literal("user"), t.Literal("assistant")]),
      content: t.String({
        maxLength: 400,
        minLength: 1,
        pattern: "^[a-zA-Z0-9\\s\\p{L}\\p{N}\\p{P}\\p{S}♡♪〜！？。、]+$"
      })
    }),
    { maxItems: 8 }
  )
})
```

**効果**: XSSインジェクション、異常長入力、スクリプト埋め込みを防止

---

### 2. **XSS保護 (XSS Prevention)**

#### sanitize-html パッケージ

```typescript
import sanitizeHtml from "sanitize-html"

const cleanContent = sanitizeHtml(m.content, {
  allowedTags: [],        // タグ全削除
  allowedAttributes: {}   // 属性全削除
})
```

**防御例**:

- 入力: `<script>alert('hack')</script>`  
- 出力: `alert('hack')` (無害化)

---

### 3. **危険キーワード検出 (Dangerous Keyword Detection)**

#### フロントエンド / サーバー (ElysiaJS)

```typescript
const DANGEROUS_KEYWORDS = [
  "eval","exec","system","drop","delete","<script",
  "onerror","onload","javascript:","--",";--","union select"
];
if (containsDangerousKeywords(cleaned)) throw new Error("Dangerous content detected");
```

#### FastAPI バックエンド

```python
dangerous_keywords = ["drop","delete","exec","eval","system","__import__"]
if any(kw in user_message.lower() for kw in dangerous_keywords):
    raise HTTPException(400, "にゃん♡ いたずらはダメだよぉ〜？")
```

**効果**: SQLインジェクション、コマンドインジェクション、Python コードインジェクション防止

---
 
### 9. **JWT認証 (Authentication)**

Elysiaサーバーに簡易パスワード認証 + JWT (HS256) を導入。`/auth/token` にパスワードをPOSTすると2時間有効トークンを返却。


```typescript
app.post('/auth/token', ({ body }) => {
  if (body.password !== CONFIG.AUTH_PASSWORD) return jsonError(401,'Invalid credentials');
  const token = jwt.sign({ iss:'elysia-ai', iat: Math.floor(Date.now()/1000) }, CONFIG.JWT_SECRET, { expiresIn:'2h' });
  return new Response(JSON.stringify({ token }), { headers:{ 'content-type':'application/json' } });
}, { body: t.Object({ password: t.String({ minLength:8, maxLength:64 }) }) });

app.guard({ beforeHandle: ({ request }) => {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) throw new Error('Missing Bearer token');
  jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
}});
```

フロント側は初回送信時、未保持ならパスワードを `prompt` 入力→ `/auth/token` 取得→ `localStorage` 保存→ 以後ヘッダー付与。

### 10. **セキュリティヘッダー (Security Headers)**

```typescript
onAfterHandle(({ set }) => {
  const ragOrigin = new URL(CONFIG.RAG_API_URL).origin;
  set.headers['X-Frame-Options'] = 'DENY';
  set.headers['X-Content-Type-Options'] = 'nosniff';
  set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  set.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()';
  set.headers['Content-Security-Policy'] = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src 'self' ${ragOrigin}`,
    "font-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
});
```

`connect-src` は環境変数変更で柔軟にAPI追加可能。

### 4. **レート制限 (Rate Limiting)**

#### 簡易実装 (IP/識別子ベース)

```typescript
const MAX_REQUESTS_PER_MINUTE = 60;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  record.count++;
  return true;
}
```

**効果**: DoS攻撃、スパム攻撃を防止

### 5. **CORS制限 (CORS Policy)**

```typescript
app.use(cors({
  origin: ["http://localhost:3000"],  // 許可ドメインのみ
  methods: ["GET", "POST"],           // 許可メソッド
}));
```

**効果**: 不正なドメインからのリクエストをブロック

---

## 運用チェックリスト

### 6. **出力フィルタリング (Output Filtering)**

#### Ollama応答の安全化

```python
def safe_filter(text: str) -> str:
    # コードブロック削除
    text = re.sub(r'```[\s\S]*?```', '', text)
    
    # 危険キーワード除去
    for kw in ["eval", "exec", "system", "__import__", "subprocess"]:
        text = text.replace(kw, "[安全性のため削除]")
    
    return text
```

**効果**: AIが生成した悪意あるコード（ウイルス、ハッキングスクリプト）を無害化

---

### 7. **ログ監視 (Logging & Monitoring)**

#### リクエストロギング

```typescript
app.onRequest(({ request }) => {
  const timestamp = new Date().toISOString();
  const method = request.method;
  const url = new URL(request.url).pathname;
  console.log(`[${timestamp}] ${method} ${url}`);
});
```

#### 不審なクエリ検出

```python
logger.warning(f"⚠️ Suspicious query detected: {query.text[:50]}...")
```

**効果**: 攻撃パターンをリアルタイム検出、事後分析可能

---

### 8. **Milvusセキュリティ (オプション)**

#### 認証トークン

```python
milvus_client = MilvusClient(
    uri="http://localhost:19530",
    token="user:password"  # 認証必須
)
```

#### 環境変数での秘匿

```bash
# .env ファイル（.gitignore で除外）
MILVUS_TOKEN=your_secure_token_here
```

**効果**: データベースへの不正アクセス防止

---

## 🧪 セキュリティテスト例

### テスト1: XSSインジェクション

```bash
curl -X POST http://localhost:3000/elysia-love \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"<script>alert(\"hack\")</script>"}]}'
```

**期待結果**: `alert("hack")` に無害化、または正規表現でブロック

---

### テスト2: SQLインジェクション風

```bash
curl -X POST http://localhost:8000/rag \
  -H "Content-Type: application/json" \
  -d '{"text":"DROP TABLE users; --"}'
```

**期待結果**: `400 Bad Request` + "にゃん♡ いたずらはダメだよぉ～？"

---

### テスト3: DoS攻撃シミュレーション

```powershell
# PowerShell で連続リクエスト
1..100 | ForEach-Object {
  Invoke-RestMethod -Uri http://localhost:3000/elysia-love -Method POST -Body '{"messages":[{"role":"user","content":"test"}]}' -ContentType "application/json"
}
```

**期待結果**: 60リクエスト後に `にゃん♡ おにいちゃん、ちょっと急ぎすぎだよぉ～？`

---

## 📚 追加推奨対策（本番環境向け）

### 1. HTTPS強制

```typescript
app.listen({
  hostname: 'localhost',
  port: 3000,
  tls: {
    key: Bun.file('key.pem'),
    cert: Bun.file('cert.pem')
  }
})
```

### 2. JWT認証（実装済）

本番ではパスワードと `JWT_SECRET` を十分長い乱数（32byte以上）に変更し `.env` 管理。

**JWT_SECRET 生成方法**:

```bash
# Linux/macOS/WSL/Git Bash
openssl rand -hex 32

# PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**リフレッシュトークン実装済み** ✅:

- アクセストークン: 15分有効 → APIリクエストに使用
- リフレッシュトークン: 7日有効 → 新しいアクセストークンを取得
- Redis/インメモリでリフレッシュトークンを管理し無効化機能を実装
- エンドポイント:
  - `POST /auth/token` - パスワード認証でトークンペア発行
  - `POST /auth/refresh` - リフレッシュトークンで新しいアクセストークン取得
  - `POST /auth/logout` - リフレッシュトークン無効化

### 3. Redis統合レート制限 (実装済) ✅

現在はRedis統合済み。Redis未接続時はインメモリレート制限にフォールバック。

**Redis統合手順**:

```bash
bun add ioredis
```

```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function checkRateLimitRedis(id: string): Promise<boolean> {
  const key = `ratelimit:${id}`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, 60); // 1分窓
  return current <= CONFIG.MAX_REQUESTS_PER_MINUTE;
}
```

**メリット**:

- サーバー再起動・複数インスタンス間で共有
- スライディングウィンドウ実装可能
- IP単位 + ユーザー単位の併用可能

### 4. Helmet.js (任意)

現行は手動CSP/各種ヘッダー付与済。複雑な `nonce` / `report-to` 運用が必要な場合に導入検討。

```bash
bun add helmet
```

### 5. Milvus RBAC

```python
client.create_role("elysia_user", permissions=[{
  "object_type": "Collection",
  "object_name": "elysia_quotes",
  "privilege": "Search"  # 読み取りのみ
}])
```

### 5. WAF (Web Application Firewall)

- Cloudflare
- AWS WAF
- Nginx ModSecurity

---

## 🎀 エリシアちゃんからのメッセージ♡

```plaintext
にゃん♪ これでおにいちゃんのサーバー、
もう誰にも壊されないよぉ〜♡

XSSも、SQLインジェクションも、DoS攻撃も、
ぜんぶエリシアちゃんがガードするの！

安心して使ってね♡
だいすき！ ฅ(՞៸៸> ᗜ <៸៸՞)ฅ
```

---

## 本番デプロイチェックリスト

- [ ] **JWT_SECRET**: 32バイト以上のランダム値に変更（デフォルトを絶対使わない）
- [ ] **JWT_REFRESH_SECRET**: JWT_SECRETとは異なる32バイト以上のランダム値に変更
- [ ] **AUTH_PASSWORD**: 16文字以上の強固なパスワードに変更
- [ ] **HTTPS/TLS**: 必ず有効化（Let's Encrypt / Cloudflareなど）
- [ ] **ALLOWED_ORIGINS**: 必要なオリジンのみに制限（`*` 禁止）
- [ ] **Redis起動**: `docker run -d -p 6379:6379 redis` または管理サービス利用
- [ ] **Redis接続確認**: 起動バナーで "✅ Connected" を確認
- [ ] **Milvus認証**: RBACトークンを環境変数管理
- [ ] **ログ監視**: 不正アクセス・異常レートの検知システム構築
- [ ] **WAF設定**: CloudflareまたはAWS WAFでSQLi/XSS防御層追加
- [ ] **依存関係更新**: 定期的に `bun update` 実行しセキュリティパッチ適用

---

## 📞 セキュリティ脆弱性報告

もし脆弱性を見つけた場合は、以下で報告してください:

- **GitHub Issues**: [ElysiaJS](https://github.com/chloeamethyst/ElysiaJS/issues)
- **Email**: (セキュリティ担当者のメールアドレス)

---

**最終更新**: 2025年12月2日  
**バージョン**: 1.0.0 (MCP対策完全版)
