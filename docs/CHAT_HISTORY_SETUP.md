# 莨夊ｩｱ螻･豁ｴ縺ｮ豌ｸ邯壼喧 - 繧ｻ繝・ヨ繧｢繝・・繧ｬ繧､繝・
## 讎りｦ・
Elysia AI縺ｫ莨夊ｩｱ螻･豁ｴ縺ｮ豌ｸ邯壼喧讖溯・縺瑚ｿｽ蜉�縺輔ｌ縺ｾ縺励◆縲ゅ％繧後↓繧医ｊ縲√メ繝｣繝・ヨ繧ｻ繝・す繝ｧ繝ｳ縺後ョ繝ｼ繧ｿ繝吶・繧ｹ縺ｫ菫晏ｭ倥＆繧後�∝ｾ後°繧牙盾辣ｧ繝ｻ繧ｨ繧ｯ繧ｹ繝昴・繝医′蜿ｯ閭ｽ縺ｫ縺ｪ繧翫∪縺吶�・
## 讖溯・荳�隕ｧ

### 1. 繧ｻ繝・す繝ｧ繝ｳ邂｡逅・
- 笨・譁ｰ隕上そ繝・す繝ｧ繝ｳ菴懈・
- 笨・繧ｻ繝・す繝ｧ繝ｳ荳�隕ｧ蜿門ｾ・- 笨・繧ｻ繝・す繝ｧ繝ｳ隧ｳ邏ｰ蜿門ｾ・- 笨・繧ｻ繝・す繝ｧ繝ｳ蜑企勁

### 2. 繝｡繝・そ繝ｼ繧ｸ邂｡逅・
- 笨・繝｡繝・そ繝ｼ繧ｸ縺ｮ閾ｪ蜍穂ｿ晏ｭ・- 笨・莨夊ｩｱ螻･豁ｴ縺ｮ蜿門ｾ・
### 3. 繧ｨ繧ｯ繧ｹ繝昴・繝域ｩ溯・

- 笨・JSON蠖｢蠑上〒繧ｨ繧ｯ繧ｹ繝昴・繝・- 笨・Markdown蠖｢蠑上〒繧ｨ繧ｯ繧ｹ繝昴・繝・
### 4. 邨ｱ險域ュ蝣ｱ

- 笨・繝｡繝・そ繝ｼ繧ｸ謨ｰ
- 笨・莨夊ｩｱ譎る俣
- 笨・蟷ｳ蝮・Γ繝・そ繝ｼ繧ｸ髟ｷ

## 繧ｻ繝・ヨ繧｢繝・・

### 1. Prisma繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ螳溯｡・
```powershell
# 繝・・繧ｿ繝吶・繧ｹ繧ｹ繧ｭ繝ｼ繝槭ｒ驕ｩ逕ｨ
bunx prisma migrate dev --name add_chat_sessions

# Prisma繧ｯ繝ｩ繧､繧｢繝ｳ繝育函謌・bunx prisma generate
```

### 2. 繧ｵ繝ｼ繝舌・蜀崎ｵｷ蜍・
```powershell
# 髢狗匱繧ｵ繝ｼ繝舌・
bun run dev

# 縺ｾ縺溘・譛ｬ逡ｪ繧ｵ繝ｼ繝舌・
bun run start
```

## API菴ｿ逕ｨ譁ｹ豕・
### 繧ｻ繝・す繝ｧ繝ｳ菴懈・

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "sweet"
  }'

# 繝ｬ繧ｹ繝昴Φ繧ｹ
{
  "sessionId": "clxxxx..."
}
```

### 繧ｻ繝・す繝ｧ繝ｳ蜿門ｾ・
```bash
curl http://localhost:3000/sessions/{sessionId}

# 繝ｬ繧ｹ繝昴Φ繧ｹ
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
      "content": "縺薙ｓ縺ｫ縺｡縺ｯ",
      "createdAt": "2025-12-05T..."
    }
  ]
}
```

### 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ繧ｻ繝・す繝ｧ繝ｳ荳�隕ｧ

```bash
curl http://localhost:3000/sessions \
  -H "Authorization: Bearer {token}" \
  -G --data-urlencode "limit=20"
```

### 繧ｻ繝・す繝ｧ繝ｳ繧ｨ繧ｯ繧ｹ繝昴・繝・
#### JSON蠖｢蠑・
```bash
curl http://localhost:3000/sessions/{sessionId}/export?format=json \
  -o session.json
```

#### Markdown蠖｢蠑・
```bash
curl http://localhost:3000/sessions/{sessionId}/export?format=markdown \
  -o session.md
```

### 繧ｻ繝・す繝ｧ繝ｳ邨ｱ險・
```bash
curl http://localhost:3000/sessions/{sessionId}/stats

# 繝ｬ繧ｹ繝昴Φ繧ｹ
{
  "messageCount": 10,
  "userMessageCount": 5,
  "assistantMessageCount": 5,
  "averageMessageLength": 45,
  "duration": 15.3
}
```

### 繧ｻ繝・す繝ｧ繝ｳ蜑企勁

```bash
curl -X DELETE http://localhost:3000/sessions/{sessionId} \
  -H "Authorization: Bearer {token}"
```

## 螳溯｣・・邨ｱ蜷・
### 繝√Ε繝・ヨ繧ｨ繝ｳ繝峨・繧､繝ｳ繝医〒縺ｮ菴ｿ逕ｨ

譌｢蟄倥・`/elysia-love`繧ｨ繝ｳ繝峨・繧､繝ｳ繝医↓繧ｻ繝・す繝ｧ繝ｳ菫晏ｭ倥ｒ邨ｱ蜷・

```typescript
// 繧ｻ繝・す繝ｧ繝ｳ菴懈・
const sessionId = await createChatSession(userId, mode);

// 繝｡繝・そ繝ｼ繧ｸ菫晏ｭ・await addMessageToSession(sessionId, "user", userMessage);
await addMessageToSession(sessionId, "assistant", assistantResponse);
```

## 閾ｪ蜍輔け繝ｪ繝ｼ繝ｳ繧｢繝・・

蜿､縺・そ繝・す繝ｧ繝ｳ・・0譌･莉･荳奇ｼ峨ｒ螳壽悄逧・↓繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・:

```typescript
// Cron繧ｸ繝ｧ繝悶〒螳溯｡・import { cleanupOldSessions } from "./lib/chat-session";

// 30譌･莉･荳雁燕縺ｮ繧ｻ繝・す繝ｧ繝ｳ繧貞炎髯､
await cleanupOldSessions(30);
```

## UI邨ｱ蜷井ｾ・
### 繧ｻ繝・す繝ｧ繝ｳ荳�隕ｧ陦ｨ遉ｺ

```typescript
// 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ驕主悉縺ｮ繧ｻ繝・す繝ｧ繝ｳ繧貞叙蠕・const sessions = await fetch("/sessions", {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

// 荳�隕ｧ陦ｨ遉ｺ
sessions.forEach((session) => {
  console.log(`${session.id}: ${session.messages.length}莉ｶ縺ｮ繝｡繝・そ繝ｼ繧ｸ`);
});
```

### 繧ｨ繧ｯ繧ｹ繝昴・繝医・繧ｿ繝ｳ

```html
<button onclick="exportSession('markdown')">Markdown縺ｧ繧ｨ繧ｯ繧ｹ繝昴・繝・/button>

<script>
  async function exportSession(format) {
    const sessionId = getCurrentSessionId();
    const blob = await fetch(`/sessions/${sessionId}/export?format=${format}`).then((r) => r.blob());

    // 繝�繧ｦ繝ｳ繝ｭ繝ｼ繝・    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session.${format === "json" ? "json" : "md"}`;
    a.click();
  }
</script>
```

## 繝・・繧ｿ繝吶・繧ｹ繧ｹ繧ｭ繝ｼ繝・
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

## 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ

```powershell
# 繧ｹ繧ｭ繝ｼ繝槭ｒ繝ｪ繧ｻ繝・ヨ
bunx prisma migrate reset

# 蜀榊ｺｦ繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ
bunx prisma migrate dev
```

### 繧ｻ繝・す繝ｧ繝ｳ縺御ｿ晏ｭ倥＆繧後↑縺・
1. Prisma繧ｯ繝ｩ繧､繧｢繝ｳ繝医′逕滓・縺輔ｌ縺ｦ縺・ｋ縺狗｢ｺ隱・
```powershell
bunx prisma generate
```

2. 繝・・繧ｿ繝吶・繧ｹ謗･邯壹ｒ遒ｺ隱・
```powershell
bunx prisma studio
```

## 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ譛�驕ｩ蛹・
### 繧､繝ｳ繝・ャ繧ｯ繧ｹ

蠢・ｦ√↑繧､繝ｳ繝・ャ繧ｯ繧ｹ縺ｯ譌｢縺ｫ繧ｹ繧ｭ繝ｼ繝槭↓蜷ｫ縺ｾ繧後※縺・∪縺・

- `sessionId`・磯ｫ倬�溘Γ繝・そ繝ｼ繧ｸ讀懃ｴ｢・・- `userId`・医Θ繝ｼ繧ｶ繝ｼ蛻･繧ｻ繝・す繝ｧ繝ｳ讀懃ｴ｢・・- `createdAt`・域凾邉ｻ蛻励た繝ｼ繝茨ｼ・
### 繧ｯ繧ｨ繝ｪ譛�驕ｩ蛹・
```typescript
// 繝｡繝・そ繝ｼ繧ｸ謨ｰ縺ｮ螟壹＞繧ｻ繝・す繝ｧ繝ｳ縺ｯ limit 繧剃ｽｿ逕ｨ
const recentMessages = await prisma.message.findMany({
  where: { sessionId },
  orderBy: { createdAt: "desc" },
  take: 50, // 譛�譁ｰ50莉ｶ縺ｮ縺ｿ
});
```

## 繧ｻ繧ｭ繝･繝ｪ繝・ぅ閠・・莠矩�・
### 繧｢繧ｯ繧ｻ繧ｹ蛻ｶ蠕｡

- 繧ｻ繝・す繝ｧ繝ｳ菴懈・: 隱崎ｨｼ荳崎ｦ・ｼ亥諺蜷阪そ繝・す繝ｧ繝ｳ蜿ｯ・・- 繧ｻ繝・す繝ｧ繝ｳ蜿門ｾ・ 隱崎ｨｼ荳崎ｦ・ｼ亥・髢紀D・・- 繧ｻ繝・す繝ｧ繝ｳ荳�隕ｧ: 隱崎ｨｼ蠢・�茨ｼ郁・蛻・・繧ｻ繝・す繝ｧ繝ｳ縺ｮ縺ｿ・・- 繧ｻ繝・す繝ｧ繝ｳ蜑企勁: 隱崎ｨｼ蠢・�・
### 繝・・繧ｿ菫晁ｭｷ

- 蛟倶ｺｺ諠・�ｱ繧貞性繧�繝｡繝・そ繝ｼ繧ｸ縺ｯ驕ｩ蛻・↓謇ｱ縺・- 繧ｨ繧ｯ繧ｹ繝昴・繝域凾縺ｫ繧ｻ繝ｳ繧ｷ繝・ぅ繝悶ョ繝ｼ繧ｿ繧偵・繧ｹ繧ｯ・医が繝励す繝ｧ繝ｳ・・- 螳壽悄逧・↑蜿､縺・そ繝・す繝ｧ繝ｳ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・

## 谺｡縺ｮ繧ｹ繝・ャ繝・
1. **UI螳溯｣・* - 繧ｻ繝・す繝ｧ繝ｳ荳�隕ｧ繝ｻ繧ｨ繧ｯ繧ｹ繝昴・繝育判髱｢縺ｮ霑ｽ蜉�
2. **讀懃ｴ｢讖溯・** - 繧ｻ繝・す繝ｧ繝ｳ蜀・Γ繝・そ繝ｼ繧ｸ縺ｮ蜈ｨ譁・､懃ｴ｢
3. **繧ｿ繧ｰ莉倥￠** - 繧ｻ繝・す繝ｧ繝ｳ縺ｫ繧ｿ繧ｰ繧定ｿｽ蜉�縺励※蛻・｡・4. **蜈ｱ譛画ｩ溯・** - 繧ｻ繝・す繝ｧ繝ｳ繧剃ｻ悶・繝ｦ繝ｼ繧ｶ繝ｼ縺ｨ蜈ｱ譛・
---

## 蜿り�・Μ繝ｳ繧ｯ

- [Prisma 繝峨く繝･繝｡繝ｳ繝・(https://www.prisma.io/docs)
- [API莉墓ｧ俶嶌](http://localhost:3000/swagger)
- [繝励Ο繧ｸ繧ｧ繧ｯ繝域ｧ矩��](../STRUCTURE.md)
