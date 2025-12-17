# Prisma 7 + LibSQL 移行ガイド

## 概要

ElysiaAIは Prisma 7 と LibSQL アダプタを使用してデータベース接続を実現しています。このガイドでは、Prisma 7への移行プロセスと設定方法を説明します。

## 主な変更点

### Prisma v6 から v7 への変更

1. **`datasourceUrl` オプションの削除**
   - Prisma v7 では、コンストラクタで `datasourceUrl` を渡すことができなくなりました
   - 代わりに、アダプタパターンを使用します

2. **エンジンタイプの変更**
   - Bun ランタイムではデフォルトで `"client"` エンジンタイプが使用されます
   - `accelerateUrl` またはアダプタが必須になりました

3. **アダプタパターンの導入**
   - `@prisma/adapter-libsql` と `@libsql/client` を使用
   - 柔軟なデータベース接続が可能

## インストール

```bash
# Prisma 7 と LibSQL アダプタのインストール
bun add @prisma/client@latest
bun add -d prisma@latest
bun add @prisma/adapter-libsql @libsql/client
```

## 設定ファイル

### 1. `.env`

```env
DATABASE_URL="file:./dev.db"
REDIS_ENABLED=false
```

### 2. `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id            String          @id @default(uuid())
  username      String          @unique
  email         String?
  passwordHash  String
  role          String          @default("user")
  createdAt     DateTime        @default(now())
  refreshTokens RefreshToken[]
  chatSessions  ChatSession[]
  voiceLogs     VoiceLog[]

  @@index([username])
  @@index([createdAt])
}

// 他のモデル定義...
```

### 3. `src/lib/database.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

// LibSQL クライアント作成
const libsql = createClient({
  url: databaseUrl,
});

// Prisma アダプタ設定
const adapter = new PrismaLibSQL(libsql);

// Prisma クライアント作成
export const prisma = new PrismaClient({ adapter });

// スキーマ自動作成関数
async function ensureSchema() {
  // CREATE TABLE IF NOT EXISTS ステートメント...
}

// データベース接続とスキーマ作成
await ensureSchema();
console.log("✅ Prisma database connected via LibSQL adapter");
```

## 移行手順

### ステップ 1: パッケージ更新

```bash
bun add @prisma/client@latest -d prisma@latest
bun add @prisma/adapter-libsql @libsql/client
```

### ステップ 2: スキーマ更新

`prisma/schema.prisma` を SQLite プロバイダに変更:

```diff
datasource db {
-  provider = "postgresql"
+  provider = "sqlite"
   url      = env("DATABASE_URL")
}
```

### ステップ 3: database.ts 更新

LibSQL アダプタを使用するように変更:

```typescript
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const libsql = createClient({ url: process.env.DATABASE_URL });
const adapter = new PrismaLibSQL(libsql);
export const prisma = new PrismaClient({ adapter });
```

### ステップ 4: Prisma クライアント生成

```bash
bunx prisma generate
```

### ステップ 5: サーバー起動

```bash
bun ./start-server.ts
```

## トラブルシューティング

### エラー: "Invalid `prisma.xxx()` invocation"

**原因**: Prisma クライアントが生成されていない、または古いバージョンが使用されている

**解決策**:
```bash
bunx prisma generate
rm -rf node_modules/.prisma
bun install
```

### エラー: "PrismaClientValidationError: datasourceUrl"

**原因**: Prisma v7 で削除された `datasourceUrl` オプションを使用している

**解決策**: アダプタパターンに移行してください（上記のステップ3参照）

### エラー: "adapter or accelerateUrl is required"

**原因**: Bun ランタイムで client エンジンタイプを使用するにはアダプタが必要

**解決策**: LibSQL アダプタをインストールして設定してください

## 本番環境への展開

### PostgreSQL を使用する場合

```typescript
import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);

export const prisma = new PrismaClient({ adapter });
```

### Turso (LibSQL) を使用する場合

```typescript
import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const adapter = new PrismaLibSQL(libsql);
export const prisma = new PrismaClient({ adapter });
```

## パフォーマンス最適化

### 1. コネクションプール設定

```typescript
const libsql = createClient({
  url: databaseUrl,
  // 本番環境ではコネクションプールを設定
  syncUrl: process.env.TURSO_SYNC_URL,
});
```

### 2. クエリ最適化

```typescript
// インデックスを活用したクエリ
const users = await prisma.user.findMany({
  where: { username: { contains: "test" } },
  orderBy: { createdAt: "desc" },
  take: 10,
});
```

### 3. バッチ処理

```typescript
// 複数のクエリを並列実行
const [users, sessions, messages] = await Promise.all([
  prisma.user.findMany(),
  prisma.chatSession.findMany(),
  prisma.message.findMany(),
]);
```

## 参考リンク

- [Prisma 7 リリースノート](https://www.prisma.io/docs/orm/overview/releases#7.0.0)
- [Prisma Database Adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers)
- [LibSQL Client](https://github.com/tursodatabase/libsql-client-ts)
- [Turso Documentation](https://docs.turso.tech/)
