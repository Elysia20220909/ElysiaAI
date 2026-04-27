# Prisma 7 繧ｻ繝・ヨ繧｢繝・・繧ｬ繧､繝・- Elysia AI

## 讎りｦ・
縺薙・繧ｬ繧､繝峨・縲・lysia AI 繝励Ο繧ｸ繧ｧ繧ｯ繝医〒 Prisma 7 繧呈ｭ｣縺励￥險ｭ螳壹＠縲√ョ繝ｼ繧ｿ繝吶・繧ｹ繧貞・譛溷喧縺吶ｋ譁ｹ豕輔ｒ隱ｬ譏弱＠縺ｾ縺吶・
## 蜑肴署譚｡莉ｶ

- Bun >= 1.0
- Node.js >= 18 (繧ｪ繝励す繝ｧ繝ｳ)
- SQLite 3

## 繧ｻ繝・ヨ繧｢繝・・謇矩・
### 1. 迺ｰ蠅・､画焚縺ｮ險ｭ螳・
`.env` 繝輔ぃ繧､繝ｫ縺ｫ `DATABASE_URL` 繧定ｨｭ螳壹＠縺ｾ縺呻ｼ・
```env
DATABASE_URL="file:./prisma/dev.db"
```

### 2. Prisma 繧ｯ繝ｩ繧､繧｢繝ｳ繝育函謌・
```bash
bunx prisma generate
```

縺薙・繧ｳ繝槭Φ繝峨〒 `@prisma/client` 縺瑚・蜍慕函謌舌＆繧後∪縺吶・
### 3. 繝・・繧ｿ繝吶・繧ｹ繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ

#### 繧ｪ繝励す繝ｧ繝ｳ A: Prisma Migrate Dev・域耳螂ｨ・・
```bash
bunx prisma migrate dev --name init
```

**豕ｨ諢・*: Bun 縺ｧ螳溯｡後☆繧句ｴ蜷医～prisma.config.js` 縺梧ｭ｣縺励￥隱ｭ縺ｿ霎ｼ縺ｾ繧後ｋ縺薙→繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲・
#### 繧ｪ繝励す繝ｧ繝ｳ B: Node.js 縺ｧ螳溯｡・
```bash
npx prisma migrate dev --name init
```

### 4. Prisma Studio・医が繝励す繝ｧ繝ｳ・・
繝悶Λ繧ｦ繧ｶ縺ｧ 繝・・繧ｿ繝吶・繧ｹ繧堤ｮ｡逅・ｼ・
```bash
bunx prisma studio
```

## Prisma 7 縺ｮ荳ｻ縺ｪ螟画峩轤ｹ

### Schema 縺九ｉ Datasource URL 縺ｮ蜑企勁

**Prisma 7 縺ｧ縺ｯ縲～schema.prisma` 縺ｫ datasource URL 繧定ｨ倩ｿｰ縺ｧ縺阪∪縺帙ｓ縲・*

笶・髢馴＆縺・ｼ・
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

笨・豁｣縺励＞譁ｹ豕包ｼ・
**譁ｹ豕・1: prisma.config.js 縺ｧ險ｭ螳・*

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

**譁ｹ豕・2: PrismaClient 繧ｳ繝ｳ繧ｹ繝医Λ繧ｯ繧ｿ縺ｧ險ｭ螳・*

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "file:./prisma/dev.db",
});
```

## 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### 繧ｨ繝ｩ繝ｼ: "The datasource property is required in your Prisma config file"

**蜴溷屏**: `prisma.config.js` 縺瑚ｦ九▽縺九ｉ縺ｪ縺・°縲～datasources` 縺悟ｮ夂ｾｩ縺輔ｌ縺ｦ縺・↑縺・
**隗｣豎ｺ遲・*:

1. `prisma/prisma.config.js` 縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・2. 繝輔ぃ繧､繝ｫ縺ｫ莉･荳九・蜀・ｮｹ縺後≠繧九％縺ｨ繧堤｢ｺ隱搾ｼ・
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

### 繧ｨ繝ｩ繝ｼ: Prisma database not configured

**蜴溷屏**: PrismaClient 蛻晄悄蛹匁凾縺ｫ `datasourceUrl` 縺瑚ｨｭ螳壹＆繧後※縺・↑縺・
**隗｣豎ｺ遲・*: `src/lib/database.ts` 繧堤｢ｺ隱搾ｼ・
```typescript
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "file:./prisma/dev.db",
});
```

### 繝昴・繝・3000 縺梧里縺ｫ菴ｿ逕ｨ荳ｭ

**隗｣豎ｺ遲・*:

```powershell
# Windows: Bun 繝励Ο繧ｻ繧ｹ繧貞・縺ｦ蛛懈ｭ｢
Get-Process bun | Stop-Process -Force

# Unix/Linux:
killall bun
```

## 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ菴懈・

繧ｹ繧ｭ繝ｼ繝槭ｒ螟画峩縺励◆蠕後∵眠縺励＞繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繧剃ｽ懈・・・
```bash
bunx prisma migrate dev --name <migration_name>
```

萓具ｼ・
```bash
bunx prisma migrate dev --name add_voice_logs
```

## 繝・・繧ｿ繝吶・繧ｹ繝ｪ繧ｻ繝・ヨ・磯幕逋ｺ逕ｨ・・
笞・・**譛ｬ逡ｪ迺ｰ蠅・〒縺ｯ菴ｿ逕ｨ縺励↑縺・〒縺上□縺輔＞**

```bash
bunx prisma migrate reset
```

縺薙・繧ｳ繝槭Φ繝峨・縺吶∋縺ｦ縺ｮ繝・・繧ｿ繧貞炎髯､縺励√・繧､繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ螻･豁ｴ繧貞・譛溷喧縺励∪縺吶・
## 繝励Ο繝繧ｯ繧ｷ繝ｧ繝ｳ迺ｰ蠅・〒縺ｮ繝・・繝ｭ繧､

### 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ驕ｩ逕ｨ

```bash
bunx prisma migrate deploy
```

縺ｾ縺溘・ Node.js 縺ｧ・・
```bash
npx prisma migrate deploy
```

### 譛ｬ逡ｪ迺ｰ蠅・〒縺ｮ險ｭ螳・
`.env.production` 縺ｧ `DATABASE_URL` 繧定ｨｭ螳夲ｼ・
```env
DATABASE_URL="postgresql://user:password@host:port/dbname"
```

## 蜿り・ｳ・侭

- [Prisma 7 Migration Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-to-prisma-7)
- [Prisma Config Documentation](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#datasource)
- [Prisma Migrate Documentation](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/overview)

## 髢｢騾｣繝輔ぃ繧､繝ｫ

- `prisma/schema.prisma` - 繝・・繧ｿ繝吶・繧ｹ繧ｹ繧ｭ繝ｼ繝槫ｮ夂ｾｩ
- `prisma/prisma.config.js` - Prisma 7 險ｭ螳・- `src/lib/database.ts` - PrismaClient 蛻晄悄蛹・- `.env` - 迺ｰ蠅・､画焚
- `prisma/migrations/` - 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ螻･豁ｴ

---

**譛邨よ峩譁ｰ**: 2025蟷ｴ12譛・譌･
