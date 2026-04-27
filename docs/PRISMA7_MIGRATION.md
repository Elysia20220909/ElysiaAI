# Prisma 7 + LibSQL 遘ｻ陦後ぎ繧､繝・
## 讎りｦ・
ElysiaAI縺ｯ Prisma 7 縺ｨ LibSQL 繧｢繝�繝励ち繧剃ｽｿ逕ｨ縺励※繝・・繧ｿ繝吶・繧ｹ謗･邯壹ｒ螳溽樟縺励※縺・∪縺吶�ゅ％縺ｮ繧ｬ繧､繝峨〒縺ｯ縲￣risma 7縺ｸ縺ｮ遘ｻ陦後・繝ｭ繧ｻ繧ｹ縺ｨ險ｭ螳壽婿豕輔ｒ隱ｬ譏弱＠縺ｾ縺吶�・
## 荳ｻ縺ｪ螟画峩轤ｹ

### Prisma v6 縺九ｉ v7 縺ｸ縺ｮ螟画峩

1. **`datasourceUrl` 繧ｪ繝励す繝ｧ繝ｳ縺ｮ蜑企勁**
   - Prisma v7 縺ｧ縺ｯ縲√さ繝ｳ繧ｹ繝医Λ繧ｯ繧ｿ縺ｧ `datasourceUrl` 繧呈ｸ｡縺吶％縺ｨ縺後〒縺阪↑縺上↑繧翫∪縺励◆
   - 莉｣繧上ｊ縺ｫ縲√い繝�繝励ち繝代ち繝ｼ繝ｳ繧剃ｽｿ逕ｨ縺励∪縺・
2. **繧ｨ繝ｳ繧ｸ繝ｳ繧ｿ繧､繝励・螟画峩**
   - Bun 繝ｩ繝ｳ繧ｿ繧､繝�縺ｧ縺ｯ繝・ヵ繧ｩ繝ｫ繝医〒 `"client"` 繧ｨ繝ｳ繧ｸ繝ｳ繧ｿ繧､繝励′菴ｿ逕ｨ縺輔ｌ縺ｾ縺・   - `accelerateUrl` 縺ｾ縺溘・繧｢繝�繝励ち縺悟ｿ・�医↓縺ｪ繧翫∪縺励◆

3. **繧｢繝�繝励ち繝代ち繝ｼ繝ｳ縺ｮ蟆主・**
   - `@prisma/adapter-libsql` 縺ｨ `@libsql/client` 繧剃ｽｿ逕ｨ
   - 譟碑ｻ溘↑繝・・繧ｿ繝吶・繧ｹ謗･邯壹′蜿ｯ閭ｽ

## 繧､繝ｳ繧ｹ繝医・繝ｫ

```bash
# Prisma 7 縺ｨ LibSQL 繧｢繝�繝励ち縺ｮ繧､繝ｳ繧ｹ繝医・繝ｫ
bun add @prisma/client@latest
bun add -d prisma@latest
bun add @prisma/adapter-libsql @libsql/client
```

## 險ｭ螳壹ヵ繧｡繧､繝ｫ

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

// 莉悶・繝｢繝・Ν螳夂ｾｩ...
```

### 3. `src/lib/database.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

// LibSQL 繧ｯ繝ｩ繧､繧｢繝ｳ繝井ｽ懈・
const libsql = createClient({
  url: databaseUrl,
});

// Prisma 繧｢繝�繝励ち險ｭ螳・const adapter = new PrismaLibSQL(libsql);

// Prisma 繧ｯ繝ｩ繧､繧｢繝ｳ繝井ｽ懈・
export const prisma = new PrismaClient({ adapter });

// 繧ｹ繧ｭ繝ｼ繝櫁・蜍穂ｽ懈・髢｢謨ｰ
async function ensureSchema() {
  // CREATE TABLE IF NOT EXISTS 繧ｹ繝・・繝医Γ繝ｳ繝・..
}

// 繝・・繧ｿ繝吶・繧ｹ謗･邯壹→繧ｹ繧ｭ繝ｼ繝樔ｽ懈・
await ensureSchema();
console.log("笨・Prisma database connected via LibSQL adapter");
```

## 遘ｻ陦梧焔鬆・
### 繧ｹ繝・ャ繝・1: 繝代ャ繧ｱ繝ｼ繧ｸ譖ｴ譁ｰ

```bash
bun add @prisma/client@latest -d prisma@latest
bun add @prisma/adapter-libsql @libsql/client
```

### 繧ｹ繝・ャ繝・2: 繧ｹ繧ｭ繝ｼ繝樊峩譁ｰ

`prisma/schema.prisma` 繧・SQLite 繝励Ο繝舌う繝�縺ｫ螟画峩:

```diff
datasource db {
-  provider = "postgresql"
+  provider = "sqlite"
   url      = env("DATABASE_URL")
}
```

### 繧ｹ繝・ャ繝・3: database.ts 譖ｴ譁ｰ

LibSQL 繧｢繝�繝励ち繧剃ｽｿ逕ｨ縺吶ｋ繧医≧縺ｫ螟画峩:

```typescript
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const libsql = createClient({ url: process.env.DATABASE_URL });
const adapter = new PrismaLibSQL(libsql);
export const prisma = new PrismaClient({ adapter });
```

### 繧ｹ繝・ャ繝・4: Prisma 繧ｯ繝ｩ繧､繧｢繝ｳ繝育函謌・
```bash
bunx prisma generate
```

### 繧ｹ繝・ャ繝・5: 繧ｵ繝ｼ繝舌・襍ｷ蜍・
```bash
bun ./start-server.ts
```

## 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### 繧ｨ繝ｩ繝ｼ: "Invalid `prisma.xxx()` invocation"

**蜴溷屏**: Prisma 繧ｯ繝ｩ繧､繧｢繝ｳ繝医′逕滓・縺輔ｌ縺ｦ縺・↑縺・�√∪縺溘・蜿､縺・ヰ繝ｼ繧ｸ繝ｧ繝ｳ縺御ｽｿ逕ｨ縺輔ｌ縺ｦ縺・ｋ

**隗｣豎ｺ遲・*:
```bash
bunx prisma generate
rm -rf node_modules/.prisma
bun install
```

### 繧ｨ繝ｩ繝ｼ: "PrismaClientValidationError: datasourceUrl"

**蜴溷屏**: Prisma v7 縺ｧ蜑企勁縺輔ｌ縺・`datasourceUrl` 繧ｪ繝励す繝ｧ繝ｳ繧剃ｽｿ逕ｨ縺励※縺・ｋ

**隗｣豎ｺ遲・*: 繧｢繝�繝励ち繝代ち繝ｼ繝ｳ縺ｫ遘ｻ陦後＠縺ｦ縺上□縺輔＞・井ｸ願ｨ倥・繧ｹ繝・ャ繝・蜿ら・・・
### 繧ｨ繝ｩ繝ｼ: "adapter or accelerateUrl is required"

**蜴溷屏**: Bun 繝ｩ繝ｳ繧ｿ繧､繝�縺ｧ client 繧ｨ繝ｳ繧ｸ繝ｳ繧ｿ繧､繝励ｒ菴ｿ逕ｨ縺吶ｋ縺ｫ縺ｯ繧｢繝�繝励ち縺悟ｿ・ｦ・
**隗｣豎ｺ遲・*: LibSQL 繧｢繝�繝励ち繧偵う繝ｳ繧ｹ繝医・繝ｫ縺励※險ｭ螳壹＠縺ｦ縺上□縺輔＞

## 譛ｬ逡ｪ迺ｰ蠅・∈縺ｮ螻暮幕

### PostgreSQL 繧剃ｽｿ逕ｨ縺吶ｋ蝣ｴ蜷・
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

### Turso (LibSQL) 繧剃ｽｿ逕ｨ縺吶ｋ蝣ｴ蜷・
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

## 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ譛�驕ｩ蛹・
### 1. 繧ｳ繝阪け繧ｷ繝ｧ繝ｳ繝励・繝ｫ險ｭ螳・
```typescript
const libsql = createClient({
  url: databaseUrl,
  // 譛ｬ逡ｪ迺ｰ蠅・〒縺ｯ繧ｳ繝阪け繧ｷ繝ｧ繝ｳ繝励・繝ｫ繧定ｨｭ螳・  syncUrl: process.env.TURSO_SYNC_URL,
});
```

### 2. 繧ｯ繧ｨ繝ｪ譛�驕ｩ蛹・
```typescript
// 繧､繝ｳ繝・ャ繧ｯ繧ｹ繧呈ｴｻ逕ｨ縺励◆繧ｯ繧ｨ繝ｪ
const users = await prisma.user.findMany({
  where: { username: { contains: "test" } },
  orderBy: { createdAt: "desc" },
  take: 10,
});
```

### 3. 繝舌ャ繝∝・逅・
```typescript
// 隍・焚縺ｮ繧ｯ繧ｨ繝ｪ繧剃ｸｦ蛻怜ｮ溯｡・const [users, sessions, messages] = await Promise.all([
  prisma.user.findMany(),
  prisma.chatSession.findMany(),
  prisma.message.findMany(),
]);
```

## 蜿り�・Μ繝ｳ繧ｯ

- [Prisma 7 繝ｪ繝ｪ繝ｼ繧ｹ繝弱・繝・(https://www.prisma.io/docs/orm/overview/releases#7.0.0)
- [Prisma Database Adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers)
- [LibSQL Client](https://github.com/tursodatabase/libsql-client-ts)
- [Turso Documentation](https://docs.turso.tech/)
