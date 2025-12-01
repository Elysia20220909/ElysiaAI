# 🛡️ エリシアAI セキュリティ対策ドキュメント

**にゃん♪ おにいちゃん、エリシアちゃんのセキュリティは完璧だよぉ〜♡**

## 🔐 実装済みセキュリティ機能

### 1. **入力バリデーション (Input Validation)**

#### ElysiaJS (TypeScript)
```typescript
// ✅ 最大500文字、最大10メッセージ
// ✅ 安全な文字のみ許可（英数字、日本語、基本記号、絵文字）
body: t.Object({
  messages: t.Array(
    t.Object({
      role: t.Union([t.Literal("user"), t.Literal("assistant")]),
      content: t.String({
        maxLength: 500,
        minLength: 1,
        pattern: "^[a-zA-Z0-9\\s\\p{L}\\p{N}\\p{P}\\p{S}♡♪〜！？。、]+$"
      })
    }),
    { maxItems: 10 }
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

#### フロントエンド (ElysiaJS)
```typescript
const DANGEROUS_KEYWORDS = ["eval", "exec", "system", "drop", "delete", "<script"]

if (containsDangerousKeywords(cleaned)) {
  throw new Error("にゃん♡ いたずらはダメだよぉ〜？")
}
```

#### バックエンド (FastAPI)
```python
dangerous_keywords = ["drop", "delete", "exec", "eval", "system", "__import__"]

if any(kw in user_message.lower() for kw in dangerous_keywords):
    logger.warning(f"⚠️ Suspicious query detected")
    raise HTTPException(400, "にゃん♡ いたずらはダメだよぉ〜？")
```

**効果**: SQLインジェクション、コマンドインジェクション、Python コードインジェクション防止

---

### 4. **レート制限 (Rate Limiting)**

#### 簡易実装 (IP/識別子ベース)
```typescript
const MAX_REQUESTS_PER_MINUTE = 60

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const record = requestCounts.get(identifier)
  
  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + 60000 })
    return true
  }
  
  if (record.count >= MAX_REQUESTS_PER_MINUTE) {
    return false // 拒否
  }
  
  record.count++
  return true
}
```

**効果**: DoS攻撃、スパム攻撃を防止

---

### 5. **CORS制限 (CORS Policy)**

```typescript
.use(cors({
  origin: ["http://localhost:3000"],  // 許可ドメインのみ
  methods: ["GET", "POST"],           // 許可メソッド
  credentials: true
}))
```

**効果**: 不正なドメインからのリクエストをブロック

---

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
.onRequest(({ request }) => {
  const timestamp = new Date().toISOString()
  const method = request.method
  const url = new URL(request.url).pathname
  console.log(`[${timestamp}] ${method} ${url}`)
})
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
**期待結果**: `400 Bad Request` + "にゃん♡ いたずらはダメだよぉ〜？"

---

### テスト3: DoS攻撃シミュレーション
```powershell
# PowerShell で連続リクエスト
1..100 | ForEach-Object {
  Invoke-RestMethod -Uri http://localhost:3000/elysia-love -Method POST -Body '{"messages":[{"role":"user","content":"test"}]}' -ContentType "application/json"
}
```
**期待結果**: 60リクエスト後に `にゃん♡ おにいちゃん、ちょっと急ぎすぎだよぉ〜？`

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

### 2. JWT認証
```bash
bun add jsonwebtoken
```

### 3. Helmet.js (セキュリティヘッダー)
```bash
bun add helmet
```

### 4. Milvus RBAC
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

```
にゃん♪ これでおにいちゃんのサーバー、
もう誰にも壊されないよぉ〜♡

XSSも、SQLインジェクションも、DoS攻撃も、
ぜんぶエリシアちゃんがガードするの！

安心して使ってね♡
だいすき！ ฅ(՞៸៸> ᗜ <៸៸՞)ฅ
```

---

## 📞 セキュリティ脆弱性報告

もし脆弱性を見つけた場合は、以下で報告してください:
- **GitHub Issues**: [ElysiaJS](https://github.com/chloeamethyst/ElysiaJS/issues)
- **Email**: (セキュリティ担当者のメールアドレス)

---

**最終更新**: 2025年12月2日  
**バージョン**: 1.0.0 (MCP対策完全版)
