# UI/UXカスタマイズ & セキュリティ強化 - 実装完了ガイド

## ✅ 実装内容

### 1. UI/UXカスタマイズ機能

#### プロンプトテンプレート
- **6つのデフォルトテンプレート**
  - 甘々デフォルト / 甘々テンション高め
  - 通常デフォルト / 通常フレンドリー
  - プロフェッショナルデフォルト / プロフェッショナル技術的

```bash
# テンプレート一覧取得
curl http://localhost:3000/customization/templates
```

#### テーマ設定
- **4つのプリセットテーマ**
  - ピンク可愛い (デフォルト)
  - ブループロフェッショナル
  - パープルエレガント
  - ダークモード

```bash
# テーマ一覧取得
curl http://localhost:3000/customization/themes
```

#### チャットモード
- **5つのモード**
  - 💕 甘々モード (temperature: 0.8)
  - 💬 通常モード (temperature: 0.7)
  - 💼 プロフェッショナルモード (temperature: 0.5)
  - 🎨 クリエイティブモード (temperature: 0.9)
  - 🔧 テクニカルモード (temperature: 0.3)

```bash
# モード一覧取得
curl http://localhost:3000/customization/modes
```

#### エクスポート形式
- JSON / Markdown / TXT / HTML

```bash
# エクスポート形式一覧取得
curl http://localhost:3000/customization/export-formats
```

### 2. セキュリティ強化機能

#### 入力サニタイゼーション
- **XSS対策**: HTMLエスケープ (`escapeHtml`)
- **SQLインジェクション対策**: 危険文字除去 (`sanitizeSqlInput`)
- **パストラバーサル対策**: ディレクトリ遡り防止 (`sanitizeFilePath`)

```typescript
import { escapeHtml, sanitizeSqlInput, sanitizeFilePath } from "./lib/security";

// 使用例
const safe = escapeHtml(userInput);
```

#### レート制限
- **メモリベースのレート制限** (本番ではRedis推奨)
- デフォルト: 100リクエスト/分

```typescript
import { checkRateLimit } from "./lib/security";

const result = checkRateLimit(userId, {
  maxRequests: 50,
  windowMs: 60000
});

if (!result.allowed) {
  return error(429, "Rate limit exceeded");
}
```

#### セキュリティヘッダー
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`
- `Referrer-Policy`

```typescript
import { getSecurityHeaders } from "./lib/security";

const headers = getSecurityHeaders();
```

## 📖 API使用例

### プロンプトテンプレートの適用

```typescript
import { applyTemplate } from "./lib/customization";

const template = "にゃん♡ おにいちゃん、{query}について教えてあげるね〜！";
const result = applyTemplate(template, { query: "TypeScript" });
// => "にゃん♡ おにいちゃん、TypeScriptについて教えてあげるね〜！"
```

### テーマの適用

```typescript
import { applyTheme, defaultThemes } from "./lib/customization";

const theme = defaultThemes[0]; // ピンク可愛い
const cssVars = applyTheme(theme);
// CSS変数として適用可能
```

### チャットモードの使用

```bash
# 甘々モードでチャット
curl -X POST http://localhost:3000/elysia-love \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "こんにちは"}],
    "mode": "sweet"
  }'
```

## 🔒 セキュリティベストプラクティス

### 1. ユーザー入力の検証

```typescript
// 常にサニタイゼーション
const cleanInput = escapeHtml(userInput);
const cleanPath = sanitizeFilePath(filePath);
```

### 2. レート制限の適用

```typescript
// エンドポイントごとに適切な制限を設定
app.post("/api/sensitive", async ({ request }) => {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const limit = checkRateLimit(ip, { maxRequests: 10, windowMs: 60000 });

  if (!limit.allowed) {
    return error(429, "Too many requests");
  }

  // 処理続行
});
```

### 3. セキュリティヘッダーの設定

```typescript
// すべてのレスポンスにセキュリティヘッダーを追加
const headers = {
  ...getSecurityHeaders(),
  "Content-Type": "application/json"
};

return new Response(data, { headers });
```

## 🚀 GitHub Collaborator 設定

### 方法1: Invite collaborator (★★★★★ 最強推奨)

**手軽さ**: ★★★★★
**安全性**: ★★★★★
**推奨度**: ★★★★★

#### 手順:
1. GitHubリポジトリページを開く: https://github.com/chloeamethyst/ElysiaAI
2. **Settings** タブをクリック
3. 左サイドバーの **Collaborators** をクリック
4. 「**Add people**」ボタンをクリック
5. GitHub IDに `grok-readonly` と入力
6. **Select a role** で「**Read**」を選択
7. 「**Add to repository**」をクリックして招待送信

#### 特徴:
- ✅ 読み取り専用アクセス
- ✅ リポジトリ全体へのアクセス
- ✅ GitHub UIから簡単に管理可能
- ✅ いつでも削除可能
- ✅ 最もセキュアな方法

### 代替方法: Personal Access Token (非推奨)

セキュリティ上の理由から、CollaboratorのRead権限による招待を強く推奨します。

## 📁 実装ファイル

### 新規作成
- `src/lib/customization.ts` - UI/UXカスタマイズ機能
- `docs/CUSTOMIZATION_SECURITY_GUIDE.md` - このガイド

### 更新
- `src/lib/security.ts` - セキュリティ機能追加
- `src/index.ts` - カスタマイズAPIエンドポイント追加

## 🧪 テスト

```bash
# カスタマイズAPIのテスト
curl http://localhost:3000/customization/templates
curl http://localhost:3000/customization/themes
curl http://localhost:3000/customization/modes
curl http://localhost:3000/customization/export-formats

# セキュリティ機能のテスト
bun test tests/security.test.ts
```

## 📊 次のステップ

1. ✅ UI/UXカスタマイズ機能 - **完了**
2. ✅ セキュリティ強化 - **完了**
3. ⏳ フロントエンドへの統合
4. ⏳ ユーザー設定の永続化
5. ⏳ 本番環境へのデプロイ

---

## 💡 使用例

### デスクトップアプリでのテーマ切り替え

```javascript
// desktop/index.html
async function loadThemes() {
  const themes = await fetch('/customization/themes').then(r => r.json());
  const select = document.getElementById('theme-select');

  themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    select.appendChild(option);
  });
}

function applyTheme(themeId) {
  const theme = themes.find(t => t.id === themeId);
  document.documentElement.style.setProperty('--color-primary', theme.colors.primary);
  // ... 他の色も設定
}
```

### モバイルアプリでのモード選択

```typescript
// mobile/app/ChatScreen.tsx
const modes = await fetch('/customization/modes').then(r => r.json());

<Picker
  selectedValue={selectedMode}
  onValueChange={setSelectedMode}
>
  {modes.map(mode => (
    <Picker.Item
      key={mode.id}
      label={`${mode.icon} ${mode.name}`}
      value={mode.id}
    />
  ))}
</Picker>
```

---

**実装完了日**: 2025年12月5日
**バージョン**: v2.0.0
**担当**: GitHub Copilot
