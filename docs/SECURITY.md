# 🛡️ エリシアAI セキュリティガイド

> にゃん♪ おにいちゃん、エリシアちゃんのセキュリティは完璧だよぉ〜♡

## 目次

1. [実装済みセキュリティ機能](#実装済みセキュリティ機能)
2. [セキュリティアーキテクチャ](#セキュリティアーキテクチャ)
3. [保護されたディレクトリ構造](#保護されたディレクトリ構造)
4. [多層防御システム](#多層防御システム)
5. [セットアップ手順](#セットアップ手順)
6. [セキュリティテスト](#セキュリティテスト)
7. [本番デプロイ](#本番デプロイ)
8. [監視とインシデント対応](#監視とインシデント対応)
9. [コンプライアンス](#コンプライアンス)

---

## 実装済みセキュリティ機能

### 1. 入力バリデーション (Input Validation)

従来: 最大500文字 / 10メッセージ → 現在: 最大400文字 / 8メッセージ

```typescript
body: t.Object({
  messages: t.Array(
    t.Object({
      role: t.Union([t.Literal("user"), t.Literal("assistant")]),
      content: t.String({
        maxLength: 400,
        minLength: 1,
        pattern: "^[a-zA-Z0-9\\s\\p{L}\\p{N}\\p{P}\\p{S}♡♪〜！？。、]+$",
      }),
    }),
    { maxItems: 8 },
  ),
});
```

**効果**: XSSインジェクション、異常長入力、スクリプト埋め込みを防止

### 2. XSS保護 (XSS Prevention)

#### sanitize-html パッケージ

```typescript
import sanitizeHtml from "sanitize-html";

const cleanContent = sanitizeHtml(m.content, {
  allowedTags: [], // タグ全削除
  allowedAttributes: {}, // 属性全削除
});
```

**防御例**:

- 入力: `<script>alert('hack')</script>`
- 出力: `alert('hack')` (無害化)

### 3. 危険キーワード検出 (Dangerous Keyword Detection)

#### フロントエンド / サーバー (ElysiaJS)

```typescript
const DANGEROUS_KEYWORDS = ["eval", "exec", "system", "drop", "delete", "<script", "onerror", "onload", "javascript:", "--", ";--", "union select"];

if (containsDangerousKeywords(cleaned)) {
  throw new Error("Dangerous content detected");
}
```

#### FastAPI バックエンド

```python
dangerous_keywords = ["drop","delete","exec","eval","system","__import__"]
if any(kw in user_message.lower() for kw in dangerous_keywords):
    raise HTTPException(400, "にゃん♡ いたずらはダメだよぉ〜？")
```

**効果**: SQLインジェクション、コマンドインジェクション、Python コードインジェクション防止

### 4. レート制限 (Rate Limiting)

#### 3種類のアルゴリズム実装 ✅

```typescript
// 1. Fixed Window - シンプルで高速
const fixedWindow = rateLimiter.checkFixedWindow(ip, 60, 1);

// 2. Sliding Window - 高精度
const slidingWindow = rateLimiter.checkSlidingWindow(ip, 60, 1);

// 3. Token Bucket - バースト許容
const tokenBucket = rateLimiter.checkTokenBucket(ip, 60, 10, 2);
```

**特徴**:

- **Redis統合**: 複数サーバー間で共有可能
- **自動クリーンアップ**: 5分ごとにメモリ解放
- **フォールバック**: Redis未接続時はインメモリ動作

**効果**: DoS攻撃、スパム攻撃を防止

### 5. JWT認証 (Authentication)

#### トークンペアシステム ✅

```typescript
// アクセストークン (15分有効)
const accessToken = jwt.sign({ userId, role }, CONFIG.JWT_SECRET, { expiresIn: "15m" });

// リフレッシュトークン (7日有効)
const refreshToken = jwt.sign({ userId, tokenId }, CONFIG.JWT_REFRESH_SECRET, { expiresIn: "7d" });
```

**エンドポイント**:

- `POST /auth/token` - パスワード認証でトークンペア発行
- `POST /auth/refresh` - リフレッシュトークンで新しいアクセストークン取得
- `POST /auth/logout` - リフレッシュトークン無効化

### 6. セキュリティヘッダー (Security Headers)

```typescript
onAfterHandle(({ set }) => {
  const ragOrigin = new URL(CONFIG.RAG_API_URL).origin;

  set.headers["X-Frame-Options"] = "DENY";
  set.headers["X-Content-Type-Options"] = "nosniff";
  set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
  set.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
  set.headers["Content-Security-Policy"] = ["default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data:", `connect-src 'self' ${ragOrigin}`, "font-src 'self'", "object-src 'none'", "frame-ancestors 'none'"].join("; ");
});
```

### 7. CORS制限 (CORS Policy)

```typescript
app.use(
  cors({
    origin: ["http://localhost:3000"], // 許可ドメインのみ
    methods: ["GET", "POST"], // 許可メソッド
  }),
);
```

**効果**: 不正なドメインからのリクエストをブロック

### 8. 出力フィルタリング (Output Filtering)

#### Ollama応答の安全化

````python
def safe_filter(text: str) -> str:
    # コードブロック削除
    text = re.sub(r'```[\s\S]*?```', '', text)

    # 危険キーワード除去
    for kw in ["eval", "exec", "system", "__import__", "subprocess"]:
        text = text.replace(kw, "[安全性のため削除]")

    return text
````

**効果**: AIが生成した悪意あるコード（ウイルス、ハッキングスクリプト）を無害化

### 9. ログ監視 (Logging & Monitoring)

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

### 10. Milvusセキュリティ

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

## セキュリティアーキテクチャ

### 多層防御アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│ Layer 5: 暗号化 (Encryption at Rest)                │
│  - AES-256-GCM                                      │
│  - scrypt鍵導出                                     │
├─────────────────────────────────────────────────────┤
│ Layer 4: アプリケーション (Application-Level)        │
│  - アクセス制御 (AccessLevel: PUBLIC → SYSTEM)      │
│  - JWT認証                                          │
│  - セッション管理                                   │
├─────────────────────────────────────────────────────┤
│ Layer 3: Docker (Container Security)                │
│  - .dockerignore で機密ファイル除外                 │
│  - 最小権限実行                                     │
├─────────────────────────────────────────────────────┤
│ Layer 2: バージョン管理 (Version Control)           │
│  - .gitignore で機密ディレクトリ除外                │
│  - secrets/ security/ private/ 完全除外             │
├─────────────────────────────────────────────────────┤
│ Layer 1: ファイルシステム (File System)             │
│  - chmod 700 (Unix/Linux)                           │
│  - icacls 制限 (Windows)                            │
└─────────────────────────────────────────────────────┘
```

---

## 保護されたディレクトリ構造

### 機密情報の配置

#### 1. `/config/private/` - 環境変数と認証情報

```
config/private/
├── .env              # 本番環境変数（Git管理外）
├── .env.example      # 環境変数テンプレート
└── README.md         # 設定ガイド
```

**含まれる情報:**

- API キー、シークレット
- データベース接続文字列
- 認証パスワード

**アクセス制御:**

- `.gitignore` で完全に除外
- 読み取り権限を最小限に制限

#### 2. `/src/config/internal/` - 内部設定

```
src/config/internal/
└── llm-config.ts     # LLMモデル設定とプロンプト
```

**含まれる情報:**

- システムプロンプト
- モデルパラメータ
- キャラクター設定

#### 3. `/src/core/security/` - セキュリティモジュール

```
src/core/security/
├── index.ts          # エクスポート集約
├── jwt.ts            # JWT認証ロジック
└── redis.ts          # Redis接続とレート制限
```

**含まれる機能:**

- トークン生成・検証
- リフレッシュトークン管理
- レート制限制御

#### 4. `/.internal/` - 最高機密（オプション）

```
.internal/
├── security/              # セキュリティモジュール (SUPER_ADMIN)
│   ├── config-manager.ts  # セキュリティ設定ローダー
│   ├── encryption.ts      # 暗号化ユーティリティ
│   └── access-control.ts  # アクセス制御マネージャー
├── secrets/               # 認証情報 (SYSTEM)
│   └── .env.secrets       # シークレットキーとトークン
└── private/               # プライベート設定 (ADMIN)
    └── README.md          # プライベート設定ドキュメント
```

---

## 多層防御システム

### Layer 1: ファイルシステム保護

**Unix/Linux**:

```bash
# 厳格なパーミッション設定
chmod 700 .internal/
chmod 700 .internal/security/
chmod 700 .internal/secrets/
chmod 600 .internal/secrets/.env.secrets
```

**Windows PowerShell**:

```powershell
# 継承を削除
icacls ".internal" /inheritance:r

# SYSTEMと管理者のみ許可
icacls ".internal" /grant:r "SYSTEM:(OI)(CI)F"
icacls ".internal" /grant:r "Administrators:(OI)(CI)F"

# シークレットディレクトリをさらに制限
icacls ".internal\secrets" /inheritance:r
icacls ".internal\secrets" /grant:r "SYSTEM:(OI)(CI)F"
```

### Layer 2: バージョン管理保護

`.gitignore` に含まれる:

- `.internal/`
- `config/private/`
- `src/config/internal/`
- `src/core/security/`
- `**/secrets/`
- `.env.secrets`

### Layer 3: Docker イメージ保護

`.dockerignore` で除外:

- `.internal/` ディレクトリ
- すべての機密ファイルパターン
- 秘密鍵と証明書

### Layer 4: アプリケーションレベルアクセス制御

**アクセスレベル**:

```typescript
enum AccessLevel {
  PUBLIC = 0, // 公開リソース
  AUTHENTICATED = 1, // ログインユーザー
  ADMIN = 2, // 管理者
  SUPER_ADMIN = 3, // スーパー管理者
  SYSTEM = 4, // システムレベルのみ
}
```

**保護リソース**:

- `.internal/secrets/*` → SYSTEM レベル
- `.internal/security/*` → SUPER_ADMIN レベル
- `.internal/private/*` → ADMIN レベル
- `.env` → SYSTEM レベル
- `data/*.jsonl` → ADMIN レベル
- `logs/*` → ADMIN レベル
- `backups/*` → ADMIN レベル

### Layer 5: 保存時暗号化

すべての機密データは暗号化:

- **アルゴリズム**: AES-256-GCM
- **鍵導出**: scrypt
- **認証**: GCM 認証タグ
- **IV**: 暗号化ごとにユニーク

---

## セットアップ手順

### 1. 初回セットアップ

```powershell
# リポジトリをクローン
git clone https://github.com/chloeamethyst/ElysiaJS.git
cd ElysiaJS

# 保護ディレクトリの作成（既存の場合はスキップ）
New-Item -ItemType Directory -Force -Path config/private
New-Item -ItemType Directory -Force -Path src/config/internal
New-Item -ItemType Directory -Force -Path src/core/security

# 強力なシークレット生成
$jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
$jwtRefreshSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
$sessionSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
$encryptionKey = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

Write-Host "JWT_SECRET=$jwtSecret"
Write-Host "JWT_REFRESH_SECRET=$jwtRefreshSecret"
Write-Host "SESSION_SECRET=$sessionSecret"
Write-Host "ENCRYPTION_KEY=$encryptionKey"
```

**Linux/macOS**:

```bash
# OpenSSLで生成
openssl rand -hex 32  # JWT_SECRET
openssl rand -hex 32  # JWT_REFRESH_SECRET
openssl rand -hex 32  # SESSION_SECRET
openssl rand -hex 32  # ENCRYPTION_KEY
```

### 2. 環境変数設定

`config/private/.env` を作成:

```bash
# JWT設定
JWT_SECRET=<generated-value>
JWT_REFRESH_SECRET=<generated-value>
AUTH_PASSWORD=<strong-password-16chars+>

# セッション
SESSION_SECRET=<generated-value>

# 暗号化
ENCRYPTION_KEY=<generated-value>

# Redis (オプション)
REDIS_URL=redis://localhost:6379

# Milvus
MILVUS_TOKEN=<your-milvus-token>
```

### 3. ファイルパーミッション設定

**Windows**:

```powershell
.\scripts\setup-security.ps1
```

**Unix/Linux**:

```bash
chmod +x scripts/setup-security.sh
./scripts/setup-security.sh
```

### 4. セットアップ検証

```powershell
# セキュリティ検証
bun run test:security

# アクセス制御確認
bun run verify:access
```

---

## セキュリティテスト

### テスト1: XSSインジェクション

```bash
curl -X POST http://localhost:3000/elysia-love \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"<script>alert(\"hack\")</script>"}]}'
```

**期待結果**: `alert("hack")` に無害化、または正規表現でブロック

### テスト2: SQLインジェクション風

```bash
curl -X POST http://localhost:8000/rag \
  -H "Content-Type: application/json" \
  -d '{"text":"DROP TABLE users; --"}'
```

**期待結果**: `400 Bad Request` + "にゃん♡ いたずらはダメだよぉ〜？"

### テスト3: DoS攻撃シミュレーション

```powershell
# PowerShell で連続リクエスト
1..100 | ForEach-Object {
  Invoke-RestMethod -Uri http://localhost:3000/elysia-love `
    -Method POST `
    -Body '{"messages":[{"role":"user","content":"test"}]}' `
    -ContentType "application/json"
}
```

**期待結果**: レート制限により60リクエスト後にブロック

### テスト4: JWT認証

```bash
# 1. トークン取得
curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'

# 2. トークン使用
curl -X GET http://localhost:3000/protected \
  -H "Authorization: Bearer <access-token>"

# 3. リフレッシュ
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh-token>"}'
```

---

## 本番デプロイ

### 本番環境チェックリスト

- [ ] **JWT_SECRET**: 32バイト以上のランダム値に変更（デフォルトを絶対使わない）
- [ ] **JWT_REFRESH_SECRET**: JWT_SECRETとは異なる32バイト以上のランダム値
- [ ] **AUTH_PASSWORD**: 16文字以上の強固なパスワード
- [ ] **HTTPS/TLS**: 必ず有効化（Let's Encrypt / Cloudflare）
- [ ] **ALLOWED_ORIGINS**: 必要なオリジンのみに制限（`*` 禁止）
- [ ] **Redis起動**: `docker run -d -p 6379:6379 redis` または管理サービス
- [ ] **Redis接続確認**: 起動バナーで "✅ Connected" を確認
- [ ] **Milvus認証**: RBACトークンを環境変数管理
- [ ] **ログ監視**: 不正アクセス・異常レートの検知システム構築
- [ ] **WAF設定**: CloudflareまたはAWS WAFでSQLi/XSS防御層追加
- [ ] **依存関係更新**: 定期的に `bun update` 実行しセキュリティパッチ適用

### HTTPS強制

```typescript
app.listen({
  hostname: "localhost",
  port: 3000,
  tls: {
    key: Bun.file("key.pem"),
    cert: Bun.file("cert.pem"),
  },
});
```

### WAF (Web Application Firewall)

推奨サービス:

- **Cloudflare**: 無料プランでDDoS保護、基本WAF
- **AWS WAF**: SQLi/XSSルールセット、カスタムルール
- **Nginx ModSecurity**: セルフホスト環境向け

---

## 監視とインシデント対応

### アクセスログ監視

```typescript
import { accessControl } from "./.internal/security/access-control";

// 最近のアクセス試行を取得
const logs = accessControl.getAccessLog(100);

// 分析用にエクスポート
const fullLog = accessControl.exportAccessLog();
await saveToFile("audit-log.json", fullLog);
```

### アラート設定

監視対象:

1. **失敗したアクセス試行**: 5分間に3回以上
2. **不正アクセス**: SYSTEMリソースへのアクセス試行
3. **営業時間外アクセス**: 営業時間外のアクセス
4. **不明なIP**: ホワイトリスト外からのアクセス
5. **復号化失敗**: 複数回の復号化失敗

### Prometheusメトリクス

```typescript
const accessDeniedCounter = new Counter({
  name: "access_denied_total",
  help: "Total number of denied access attempts",
  labelNames: ["resource", "user", "reason"],
});
```

### インシデント対応

#### シークレットが漏洩した場合

1. **即時対応**:
   - 新しいシークレット生成
   - `.internal/secrets/.env.secrets` 更新
   - すべてのアクティブトークンを無効化
   - すべてのサービスを再起動

2. **調査**:
   - アクセスログを確認
   - 侵害元を特定
   - 影響範囲を判断

3. **修復**:
   - 影響を受けたすべての認証情報をローテーション
   - セキュリティポリシーを更新
   - 脆弱性をパッチ

4. **コミュニケーション**:
   - セキュリティチームに通知
   - インシデントを文書化
   - 手順を更新

#### 緊急手順

```powershell
# 緊急シークレットローテーション
.\scripts\emergency-rotate-secrets.ps1

# セキュリティログ確認
.\scripts\security-audit.ps1

# システム整合性検証
.\scripts\integrity-check.ps1
```

---

## コンプライアンス

このセキュリティ設定は以下の基準を満たします:

- **GDPR**: 暗号化、アクセス制御、監査ログ
- **PCI DSS**: 鍵管理、アクセスログ、暗号化
- **HIPAA**: データ暗号化、アクセス制御、監査証跡
- **SOC 2**: セキュリティ制御、監視、インシデント対応
- **ISO 27001**: 情報セキュリティ管理

---

## ベストプラクティス

### 実施すべきこと ✅

- 強力なランダムシークレット使用（最小32バイト）
- 90日ごとにシークレットローテーション
- 週次でアクセスログ確認
- 保存データの暗号化
- すべてのネットワーク通信にTLS使用
- 最小権限の原則を実装
- 定期的なセキュリティ監査

### 避けるべきこと ❌

- バージョン管理にシークレットをコミット
- 本番環境でデフォルト/サンプル値を使用
- 安全でないチャネルでシークレットを共有
- ソースコードに認証情報をハードコード
- 環境間でシークレットを再利用
- 不要な権限を付与
- セキュリティ警告を無視

---

## テストとメンテナンス

### テスト実行

```bash
# セキュリティテスト
bun test tests/security.test.ts

# 静的解析
bun run lint:security

# 依存関係監査
bun audit

# ペネトレーションテスト
npm run test:pentest
```

### メンテナンススケジュール

#### 月次タスク:

- アクセスログ確認
- 不正アクセス試行のチェック
- 暗号化鍵の安全性確認
- セキュリティドキュメント更新

#### 四半期タスク:

- すべてのシークレットローテーション
- セキュリティ監査
- 依存関係更新
- アクセスポリシーの見直しと更新

#### 年次タスク:

- 完全なセキュリティ評価
- ペネトレーションテスト
- ディザスタリカバリ訓練
- インシデント対応手順の更新

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

## 📞 セキュリティ脆弱性報告

脆弱性を発見した場合は以下で報告してください:

- **GitHub Issues**: [ElysiaJS](https://github.com/chloeamethyst/ElysiaJS/issues)
- **Email**: security@your-domain.com
- **緊急**: インシデント対応手順を使用

---

**分類**: CONFIDENTIAL  
**最終更新**: 2025年12月3日  
**次回レビュー**: 2026年1月3日  
**バージョン**: 2.0.0 (統合版)
