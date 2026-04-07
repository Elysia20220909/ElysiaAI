# データベース設計とベストプラクティス

## 目次
1. [スキーマ設計](#スキーマ設計)
2. [インデックス戦略](#インデックス戦略)
3. [パフォーマンス最適化](#パフォーマンス最適化)
4. [セキュリティ](#セキュリティ)
5. [移行とバックアップ](#移行とバックアップ)

## スキーマ設計

### 現在のデータモデル

```prisma
model User {
  id            String          @id @default(uuid())
  username      String          @unique
  email         String?
  passwordHash  String
  role          String          @default("user")
  createdAt     DateTime        @default(now())
  
  // Relations
  refreshTokens RefreshToken[]
  chatSessions  ChatSession[]
  voiceLogs     VoiceLog[]

  @@index([username])
  @@index([createdAt])
}

model ChatSession {
  id        String    @id @default(uuid())
  userId    String
  title     String    @default("New Chat")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]

  @@index([userId])
  @@index([createdAt])
}

model Message {
  id            String      @id @default(uuid())
  sessionId     String
  role          String      // 'user' | 'assistant' | 'system'
  content       String
  timestamp     DateTime    @default(now())
  
  session       ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([timestamp])
}
```

### 設計原則

#### 1. 正規化 vs 非正規化

**正規化を使用する場合**:
- データの整合性が重要
- 更新頻度が高い
- データの重複を避けたい

**非正規化を使用する場合**:
- 読み取りパフォーマンスが重要
- 更新頻度が低い
- 複雑なJOINを避けたい

例: メッセージテーブルにユーザー名をコピー（読み取り最適化）

```prisma
model Message {
  id            String      @id @default(uuid())
  sessionId     String
  role          String
  content       String
  timestamp     DateTime    @default(now())
  
  // 非正規化: パフォーマンス向上のためユーザー名をキャッシュ
  username      String?
  
  session       ChatSession @relation(fields: [sessionId], references: [id])
}
```

#### 2. カスケード削除

適切なカスケード設定でデータ整合性を保証:

```prisma
model ChatSession {
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Message {
  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

## インデックス戦略

### 基本ルール

1. **頻繁に検索されるカラムにインデックス**
2. **複合インデックスの順序に注意**
3. **不要なインデックスは削除**（書き込み性能への影響）

### 推奨インデックス

```prisma
model User {
  @@index([username])        // ログイン検索
  @@index([email])           // メール検索
  @@index([createdAt])       // ソート・範囲検索
  @@index([role, createdAt]) // 複合検索
}

model Message {
  @@index([sessionId, timestamp]) // セッション内のメッセージ取得
  @@index([role, timestamp])      // ロール別メッセージ
}

model ChatSession {
  @@index([userId, createdAt])    // ユーザーのセッション一覧
  @@index([updatedAt])            // 最近の更新順
}
```

### インデックスパフォーマンステスト

```typescript
// インデックスなし
const start1 = performance.now();
const messages1 = await prisma.message.findMany({
  where: { sessionId: "xxx" },
  orderBy: { timestamp: "desc" },
});
console.log(`Without index: ${performance.now() - start1}ms`);

// インデックスあり（@@index([sessionId, timestamp])）
const start2 = performance.now();
const messages2 = await prisma.message.findMany({
  where: { sessionId: "xxx" },
  orderBy: { timestamp: "desc" },
});
console.log(`With index: ${performance.now() - start2}ms`);
```

## パフォーマンス最適化

### 1. N+1 問題の回避

**悪い例**:
```typescript
const sessions = await prisma.chatSession.findMany();
for (const session of sessions) {
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  }); // N回のクエリ
}
```

**良い例**:
```typescript
const sessions = await prisma.chatSession.findMany({
  include: {
    user: true, // 1回のクエリで取得
  },
});
```

### 2. ページネーション

**カーソルベース**（大規模データに適している）:
```typescript
const messages = await prisma.message.findMany({
  take: 20,
  skip: 1,
  cursor: {
    id: lastMessageId,
  },
  orderBy: {
    timestamp: "desc",
  },
});
```

**オフセットベース**（小規模データ向け）:
```typescript
const messages = await prisma.message.findMany({
  skip: page * pageSize,
  take: pageSize,
  orderBy: { timestamp: "desc" },
});
```

### 3. 選択的フィールド取得

```typescript
// 必要なフィールドのみ取得
const users = await prisma.user.findMany({
  select: {
    id: true,
    username: true,
    // passwordHash は含めない
  },
});
```

### 4. バッチ処理

```typescript
// 複数レコードを一度に作成
await prisma.message.createMany({
  data: [
    { sessionId: "1", role: "user", content: "Hello" },
    { sessionId: "1", role: "assistant", content: "Hi!" },
  ],
});

// トランザクションで複数操作
await prisma.$transaction([
  prisma.user.create({ data: { username: "alice" } }),
  prisma.chatSession.create({ data: { userId: "xxx" } }),
]);
```

## セキュリティ

### 1. パスワードハッシュ

```typescript
import { hash, verify } from "@node-rs/argon2";

// ユーザー登録
const passwordHash = await hash(password, {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
});

await prisma.user.create({
  data: {
    username,
    passwordHash,
  },
});

// ログイン検証
const user = await prisma.user.findUnique({ where: { username } });
const valid = await verify(user.passwordHash, password);
```

### 2. SQL インジェクション防止

Prisma は自動的にパラメータ化するため安全:

```typescript
// 安全（Prisma が自動でエスケープ）
const user = await prisma.user.findMany({
  where: {
    username: {
      contains: userInput, // エスケープ不要
    },
  },
});
```

生SQLを使用する場合はプレースホルダを使用:

```typescript
// 安全（プレースホルダ使用）
const users = await prisma.$queryRaw`
  SELECT * FROM User WHERE username = ${userInput}
`;

// 危険（文字列結合）
const users = await prisma.$queryRawUnsafe(
  `SELECT * FROM User WHERE username = '${userInput}'`
); // 使用しない！
```

### 3. RBAC (ロールベースアクセス制御)

```typescript
// ミドルウェアでロールチェック
const requireRole = (role: string) => {
  return async ({ user }: Context) => {
    if (user.role !== role) {
      throw new Error("Unauthorized");
    }
  };
};

// 使用例
app.delete("/admin/user/:id", requireRole("admin"), async ({ params }) => {
  await prisma.user.delete({ where: { id: params.id } });
});
```

## 移行とバックアップ

### 1. スキーマ移行

```bash
# 開発環境: スキーマ同期
bunx prisma db push

# 本番環境: マイグレーション適用
bunx prisma migrate deploy

# マイグレーション作成
bunx prisma migrate dev --name add_user_email
```

### 2. データバックアップ

```bash
# SQLite バックアップ
cp dev.db dev.db.backup

# PostgreSQL バックアップ
pg_dump $DATABASE_URL > backup.sql

# リストア
psql $DATABASE_URL < backup.sql
```

### 3. データシード

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      { username: "admin", passwordHash: "...", role: "admin" },
      { username: "user1", passwordHash: "...", role: "user" },
    ],
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```bash
# シード実行
bunx prisma db seed
```

## モニタリング

### クエリログ

```typescript
const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "stdout", level: "error" },
  ],
});

prisma.$on("query", (e) => {
  console.log("Query: " + e.query);
  console.log("Duration: " + e.duration + "ms");
});
```

### パフォーマンスメトリクス

```typescript
// 長時間実行クエリの検出
prisma.$on("query", (e) => {
  if (e.duration > 100) {
    console.warn(`Slow query detected: ${e.query} (${e.duration}ms)`);
  }
});
```

## ベストプラクティスまとめ

✅ **すべき事**:
- インデックスを適切に設定
- N+1 問題を回避
- トランザクションを使用
- パスワードをハッシュ化
- バックアップを定期的に実施

❌ **避けるべき事**:
- 生SQLの文字列結合
- 不要なフィールドの取得
- 深いネストの include
- 大量データの一括取得
- インデックスなしの検索
