# Prisma 7 セットアップガイド - Elysia AI

## 概要

このガイドは、Elysia AI プロジェクトで Prisma 7 を正しく設定し、データベースを初期化する方法を説明します。

## 前提条件

- Bun >= 1.0
- Node.js >= 18 (オプション)
- SQLite 3

## セットアップ手順

### 1. 環境変数の設定

`.env` ファイルに `DATABASE_URL` を設定します：

```env
DATABASE_URL="file:./prisma/dev.db"
```

### 2. Prisma クライアント生成

```bash
bunx prisma generate
```

このコマンドで `@prisma/client` が自動生成されます。

### 3. データベースマイグレーション

#### オプション A: Prisma Migrate Dev（推奨）

```bash
bunx prisma migrate dev --name init
```

**注意**: Bun で実行する場合、`prisma.config.js` が正しく読み込まれることを確認してください。

#### オプション B: Node.js で実行

```bash
npx prisma migrate dev --name init
```

### 4. Prisma Studio（オプション）

ブラウザで データベースを管理：

```bash
bunx prisma studio
```

## Prisma 7 の主な変更点

### Schema から Datasource URL の削除

**Prisma 7 では、`schema.prisma` に datasource URL を記述できません。**

❌ 間違い：

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

✅ 正しい方法：

**方法 1: prisma.config.js で設定**

```javascript
// prisma/prisma.config.js
require("dotenv/config");

module.exports = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:./prisma/dev.db",
    },
  },
};
```

**方法 2: PrismaClient コンストラクタで設定**

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "file:./prisma/dev.db",
});
```

## トラブルシューティング

### エラー: "The datasource property is required in your Prisma config file"

**原因**: `prisma.config.js` が見つからないか、`datasources` が定義されていない

**解決策**:

1. `prisma/prisma.config.js` が存在することを確認
2. ファイルに以下の内容があることを確認：

```javascript
require("dotenv/config");

module.exports = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:./prisma/dev.db",
    },
  },
};
```

### エラー: Prisma database not configured

**原因**: PrismaClient 初期化時に `datasourceUrl` が設定されていない

**解決策**: `src/lib/database.ts` を確認：

```typescript
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "file:./prisma/dev.db",
});
```

### ポート 3000 が既に使用中

**解決策**:

```powershell
# Windows: Bun プロセスを全て停止
Get-Process bun | Stop-Process -Force

# Unix/Linux:
killall bun
```

## マイグレーション作成

スキーマを変更した後、新しいマイグレーションを作成：

```bash
bunx prisma migrate dev --name <migration_name>
```

例：

```bash
bunx prisma migrate dev --name add_voice_logs
```

## データベースリセット（開発用）

⚠️ **本番環境では使用しないでください**

```bash
bunx prisma migrate reset
```

このコマンドはすべてのデータを削除し、マイグレーション履歴を初期化します。

## プロダクション環境でのデプロイ

### マイグレーション適用

```bash
bunx prisma migrate deploy
```

または Node.js で：

```bash
npx prisma migrate deploy
```

### 本番環境での設定

`.env.production` で `DATABASE_URL` を設定：

```env
DATABASE_URL="postgresql://user:password@host:port/dbname"
```

## 参考資料

- [Prisma 7 Migration Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-to-prisma-7)
- [Prisma Config Documentation](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#datasource)
- [Prisma Migrate Documentation](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/overview)

## 関連ファイル

- `prisma/schema.prisma` - データベーススキーマ定義
- `prisma/prisma.config.js` - Prisma 7 設定
- `src/lib/database.ts` - PrismaClient 初期化
- `.env` - 環境変数
- `prisma/migrations/` - マイグレーション履歴

---

**最終更新**: 2025年12月4日
