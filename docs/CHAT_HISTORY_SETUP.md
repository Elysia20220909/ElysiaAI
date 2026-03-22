# 会話履歴の永続化 - セットアップガイド

## 概要

Elysia AIに会話履歴の永続化機能が追加されました。これにより、チャットセッションがデータベースに保存され、後から参照・エクスポートが可能になります。

## 機能一覧

### 1. セッション管理

- ✅ 新規セッション作成
- ✅ セッション一覧取得
- ✅ セッション詳細取得
- ✅ セッション削除

### 2. メッセージ管理

- ✅ メッセージの自動保存
- ✅ 会話履歴の取得

### 3. エクスポート機能

- ✅ JSON形式でエクスポート
- ✅ Markdown形式でエクスポート

### 4. 統計情報

- ✅ メッセージ数
- ✅ 会話時間
- ✅ 平均メッセージ長

## セットアップ

### 1. Prismaマイグレーション実行

```powershell
# データベーススキーマを適用
bunx prisma migrate dev --name add_chat_sessions

# Prismaクライアント生成
bunx prisma generate
```

### 2. サーバー再起動

```powershell
# 開発サーバー
bun run dev

# または本番サーバー
bun run start
```

## API使用方法

### セッション作成

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "sweet"
  }'

# レスポンス
{
  "sessionId": "clxxxx..."
}
```

### セッション取得

```bash
curl http://localhost:3000/sessions/{sessionId}

# レスポンス
{
  "id": "clxxxx...",
  "userId": null,
  "mode": "sweet",
  "createdAt": "2025-12-05T...",
  "updatedAt": "2025-12-05T...",
  "messages": [
    {
      "id": "clxxxx...",
      "role": "user",
      "content": "こんにちは",
      "createdAt": "2025-12-05T..."
    }
  ]
}
```

### ユーザーのセッション一覧

```bash
curl http://localhost:3000/sessions \
  -H "Authorization: Bearer {token}" \
  -G --data-urlencode "limit=20"
```

### セッションエクスポート

#### JSON形式

```bash
curl http://localhost:3000/sessions/{sessionId}/export?format=json \
  -o session.json
```

#### Markdown形式

```bash
curl http://localhost:3000/sessions/{sessionId}/export?format=markdown \
  -o session.md
```

### セッション統計

```bash
curl http://localhost:3000/sessions/{sessionId}/stats

# レスポンス
{
  "messageCount": 10,
  "userMessageCount": 5,
  "assistantMessageCount": 5,
  "averageMessageLength": 45,
  "duration": 15.3
}
```

### セッション削除

```bash
curl -X DELETE http://localhost:3000/sessions/{sessionId} \
  -H "Authorization: Bearer {token}"
```

## 実装の統合

### チャットエンドポイントでの使用

既存の`/elysia-love`エンドポイントにセッション保存を統合:

```typescript
// セッション作成
const sessionId = await createChatSession(userId, mode);

// メッセージ保存
await addMessageToSession(sessionId, "user", userMessage);
await addMessageToSession(sessionId, "assistant", assistantResponse);
```

## 自動クリーンアップ

古いセッション（30日以上）を定期的にクリーンアップ:

```typescript
// Cronジョブで実行
import { cleanupOldSessions } from "./lib/chat-session";

// 30日以上前のセッションを削除
await cleanupOldSessions(30);
```

## UI統合例

### セッション一覧表示

```typescript
// ユーザーの過去のセッションを取得
const sessions = await fetch("/sessions", {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

// 一覧表示
sessions.forEach((session) => {
  console.log(`${session.id}: ${session.messages.length}件のメッセージ`);
});
```

### エクスポートボタン

```html
<button onclick="exportSession('markdown')">Markdownでエクスポート</button>

<script>
  async function exportSession(format) {
    const sessionId = getCurrentSessionId();
    const blob = await fetch(`/sessions/${sessionId}/export?format=${format}`).then((r) => r.blob());

    // ダウンロード
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session.${format === "json" ? "json" : "md"}`;
    a.click();
  }
</script>
```

## データベーススキーマ

### ChatSession

```prisma
model ChatSession {
  id        String   @id @default(cuid())
  userId    String?
  mode      String   @default("normal")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User?    @relation(...)
  messages  Message[]
}
```

### Message

```prisma
model Message {
  id        String      @id @default(cuid())
  sessionId String
  role      String
  content   String
  createdAt DateTime    @default(now())

  session   ChatSession @relation(...)
}
```

## トラブルシューティング

### マイグレーションエラー

```powershell
# スキーマをリセット
bunx prisma migrate reset

# 再度マイグレーション
bunx prisma migrate dev
```

### セッションが保存されない

1. Prismaクライアントが生成されているか確認

```powershell
bunx prisma generate
```

2. データベース接続を確認

```powershell
bunx prisma studio
```

## パフォーマンス最適化

### インデックス

必要なインデックスは既にスキーマに含まれています:

- `sessionId`（高速メッセージ検索）
- `userId`（ユーザー別セッション検索）
- `createdAt`（時系列ソート）

### クエリ最適化

```typescript
// メッセージ数の多いセッションは limit を使用
const recentMessages = await prisma.message.findMany({
  where: { sessionId },
  orderBy: { createdAt: "desc" },
  take: 50, // 最新50件のみ
});
```

## セキュリティ考慮事項

### アクセス制御

- セッション作成: 認証不要（匿名セッション可）
- セッション取得: 認証不要（公開ID）
- セッション一覧: 認証必須（自分のセッションのみ）
- セッション削除: 認証必須

### データ保護

- 個人情報を含むメッセージは適切に扱う
- エクスポート時にセンシティブデータをマスク（オプション）
- 定期的な古いセッションのクリーンアップ

## 次のステップ

1. **UI実装** - セッション一覧・エクスポート画面の追加
2. **検索機能** - セッション内メッセージの全文検索
3. **タグ付け** - セッションにタグを追加して分類
4. **共有機能** - セッションを他のユーザーと共有

---

## 参考リンク

- [Prisma ドキュメント](https://www.prisma.io/docs)
- [API仕様書](http://localhost:3000/swagger)
- [プロジェクト構造](../STRUCTURE.md)
