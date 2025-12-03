# Deep Structure Security Update

## 🔒 新しい深層ディレクトリ構造

重要なファイルをさらに深く隠すために、以下の構造に変更しました:

### 旧構造 → 新構造

| 旧パス | 新パス | 内容 |
|-------|-------|------|
| `config/private/` | `.internal/secure/env/` | 環境変数 (.env) |
| `src/config/internal/` | `.internal/app/llm/` | LLM設定 |
| `src/core/security/` | `.internal/secure/auth/` | JWT/認証 |
| `src/database/config/` | `.internal/secure/db/` | DB接続設定 |

### ディレクトリツリー

```
.internal/
├── secure/
│   ├── env/
│   │   ├── .env
│   │   ├── .env.example
│   │   └── README.md
│   ├── auth/
│   │   ├── index.ts
│   │   ├── jwt.ts
│   │   └── redis.ts
│   └── db/
│       └── index.ts
└── app/
    └── llm/
        └── llm-config.ts
```

## 🎯 変更理由

1. **可視性の低下**: `.internal/` はドットで始まるため、通常のディレクトリリストで目立たない
2. **階層の深化**: 3階層の深い構造により、偶然の発見リスクを低減
3. **論理的分離**: `secure/` と `app/` で機密度を明確化
4. **Git除外**: `.gitignore` で `.internal/` 全体を除外

## ⚙️ コード変更

### src/index.ts

```typescript
// 旧
import { DEFAULT_MODE, ELYSIA_MODES } from "./config/internal/llm-config";
import { checkRateLimitRedis, ... } from "./core/security";
import { DATABASE_CONFIG } from "./database/config";

// 新
import { DEFAULT_MODE, ELYSIA_MODES } from "../.internal/app/llm/llm-config";
import { checkRateLimitRedis, ... } from "../.internal/secure/auth";
import { DATABASE_CONFIG } from "../.internal/secure/db";
```

## 🧹 クリーンアップ

新しい構造が正しく動作することを確認した後、古いディレクトリを削除:

```powershell
# PowerShell
.\scripts\cleanup-old-structure.ps1

# または手動で
Remove-Item -Recurse -Force config\private
Remove-Item -Recurse -Force src\config\internal
Remove-Item -Recurse -Force src\core\security
Remove-Item -Recurse -Force src\database\config
```

## 🔐 .gitignore

新しい `.gitignore` エントリ:

```gitignore
# Deep-hidden secure files (NEW)
/.internal/

# Legacy (keep for now)
/config/private/
/src/config/internal/
/src/core/security/
/src/database/config/
```

## ✅ 検証

1. **ビルド確認**:
```bash
bun run build
# webpack compiled successfully
```

2. **起動確認**:
```bash
bun run src/index.ts
# 🚀 Elysia server is running!
```

3. **Git確認**:
```bash
git status
# .internal/ が表示されないことを確認
```

## 📝 注意事項

### 環境変数の読み込み

`.env` ファイルのパスが変更されたため、以下のいずれかの対応が必要:

1. **ルートディレクトリに .env をシンボリックリンク**:
```powershell
New-Item -ItemType SymbolicLink -Path ".env" -Target ".internal\secure\env\.env"
```

2. **dotenv のパス指定**:
```typescript
import { config } from 'dotenv';
config({ path: '.internal/secure/env/.env' });
```

3. **環境変数で直接指定** (推奨):
```powershell
$env:JWT_SECRET="..."; bun run src/index.ts
```

## 🚀 デプロイメント

本番環境では `.internal/` をクラウドシークレット管理に置き換え:

- **AWS**: Secrets Manager
- **Azure**: Key Vault  
- **GCP**: Secret Manager

## 🔍 監査ログ

- **変更日時**: 2025年12月3日
- **変更内容**: ディレクトリ構造の深層化
- **影響範囲**: src/index.ts のインポートパスのみ
- **後方互換性**: なし（旧パスは削除推奨）
