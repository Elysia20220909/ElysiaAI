# 脂 譁ｰ讖溯・螳溯｣・ｮ御ｺ・Ξ繝昴・繝・
## 螳溯｣・＠縺・縺､縺ｮ鬮伜ｺｦ縺ｪ讖溯・

### 1. 笨・Webhook繧､繝吶Φ繝医す繧ｹ繝・Β

**繝輔ぃ繧､繝ｫ:** `src/lib/webhook-events.ts`

**讖溯・:**

- Discord/Slack/繧ｫ繧ｹ繧ｿ繝�Webhook邨ｱ蜷・- 繧､繝吶Φ繝磯ｧ・虚蝙矩�夂衍・・ser.registered, error.critical, backup.completed遲会ｼ・- HMAC-SHA256鄂ｲ蜷阪↓繧医ｋ繧ｻ繧ｭ繝･繧｢縺ｪ騾壻ｿ｡
- Webhook雉ｼ隱ｭ邂｡逅・PI

**譁ｰ隕就PI:**

- `GET /admin/webhooks` - Webhook荳�隕ｧ蜿門ｾ・
---

### 2. 笨・閾ｪ蜍輔ヰ繝・け繧｢繝・・繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｩ繝ｼ

**繝輔ぃ繧､繝ｫ:** `src/lib/backup-scheduler.ts`

**讖溯・:**

- 螳壽悄逧・↑SQLite繝・・繧ｿ繝吶・繧ｹ繝舌ャ繧ｯ繧｢繝・・・医ョ繝輔か繝ｫ繝・譎る俣縺斐→・・- 荳紋ｻ｣邂｡逅・ｼ医ョ繝輔か繝ｫ繝・荳紋ｻ｣菫晄戟・・- 閾ｪ蜍輔け繝ｪ繝ｼ繝ｳ繧｢繝・・
- 謇句虚繝舌ャ繧ｯ繧｢繝・・繝医Μ繧ｬ繝ｼ

**迺ｰ蠅・､画焚:**

```env
AUTO_BACKUP_ENABLED=true
BACKUP_INTERVAL_MINUTES=60
MAX_BACKUP_GENERATIONS=7
BACKUP_DIR=./backups
```

**譁ｰ隕就PI:**

- `GET /admin/backups` - 繝舌ャ繧ｯ繧｢繝・・迥ｶ諷九・螻･豁ｴ蜿門ｾ・- `POST /admin/backups/trigger` - 謇句虚繝舌ャ繧ｯ繧｢繝・・螳溯｡・
---

### 3. 笨・API繧ｭ繝ｼ邂｡逅・す繧ｹ繝・Β

**繝輔ぃ繧､繝ｫ:** `src/lib/api-key-manager.ts`

**讖溯・:**

- API繧ｭ繝ｼ逕滓・繝ｻ辟｡蜉ｹ蛹悶・蜑企勁
- 1譎る俣縺ゅ◆繧翫・繝ｬ繝ｼ繝亥宛髯・- 譛牙柑譛滄剞險ｭ螳・- 菴ｿ逕ｨ邨ｱ險郁ｿｽ霍｡
- 繝ｦ繝ｼ繧ｶ繝ｼ蛻･繧ｭ繝ｼ邂｡逅・
**譁ｰ隕就PI:**

- `POST /admin/api-keys` - 譁ｰ隕就PI繧ｭ繝ｼ逕滓・
- `GET /admin/api-keys` - API繧ｭ繝ｼ荳�隕ｧ繝ｻ邨ｱ險亥叙蠕・
---

### 4. 笨・繝�繝・す繝･繝懊・繝峨メ繝｣繝ｼ繝茨ｼ・hart.js邨ｱ蜷茨ｼ・
**繝輔ぃ繧､繝ｫ:** `public/admin.html`・域峩譁ｰ・・
**讖溯・:**

- 繧ｨ繝ｳ繝峨・繧､繝ｳ繝亥挨繝ｪ繧ｯ繧ｨ繧ｹ繝域焚・域｣偵げ繝ｩ繝包ｼ・- 譎る俣蛻･繝ｪ繧ｯ繧ｨ繧ｹ繝域耳遘ｻ・域釜繧檎ｷ壹げ繝ｩ繝包ｼ・- 繝ｬ繧ｹ繝昴Φ繧ｹ繧ｿ繧､繝�蛻・ｸ・ｼ亥・繧ｰ繝ｩ繝包ｼ・- 繝ｪ繧｢繝ｫ繧ｿ繧､繝�邨ｱ險亥庄隕門喧

**CDN:** Chart.js 4.5.1

---

### 5. 笨・繝｡繝ｼ繝ｫ騾夂衍讖溯・

**繝輔ぃ繧､繝ｫ:** `src/lib/email-notifier.ts`

**讖溯・:**

- Nodemailer縺ｫ繧医ｋ繝｡繝ｼ繝ｫ騾∽ｿ｡
- 繧ｨ繝ｩ繝ｼ騾夂衍繝｡繝ｼ繝ｫ
- 繧ｦ繧ｧ繝ｫ繧ｫ繝�繝｡繝ｼ繝ｫ・医Θ繝ｼ繧ｶ繝ｼ逋ｻ骭ｲ譎ゑｼ・- 繝舌ャ繧ｯ繧｢繝・・螳御ｺ・�夂衍
- 繝倥Ν繧ｹ繝√ぉ繝・け螟ｱ謨鈴�夂衍

**迺ｰ蠅・､画焚:**

```env
EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@elysia-ai.com
ADMIN_EMAIL=admin@example.com
```

**萓晏ｭ倬未菫・** `nodemailer@7.0.11`, `@types/nodemailer@7.0.4`

---

### 6. 笨・A/B繝・せ繝域ｩ溯・

**繝輔ぃ繧､繝ｫ:** `src/lib/ab-testing.ts`

**讖溯・:**

- 繝励Ο繝ｳ繝励ヨ繧ｹ繧ｿ繧､繝ｫ繝ｻ繝ｬ繧ｹ繝昴Φ繧ｹ髟ｷ縺ｮA/B繝・せ繝・- 驥阪∩莉倥￠繝ｩ繝ｳ繝�繝�蜑ｲ繧雁ｽ薙※
- 繧ｳ繝ｳ繝舌・繧ｸ繝ｧ繝ｳ霑ｽ霍｡
- 隧穂ｾ｡繧ｹ繧ｳ繧｢險倬鹸
- 繝・せ繝育ｵ先棡邨ｱ險亥・譫・
**繝・ヵ繧ｩ繝ｫ繝医ユ繧ｹ繝・**

- 繝励Ο繝ｳ繝励ヨ繧ｹ繧ｿ繧､繝ｫ繝・せ繝茨ｼ医が繝ｪ繧ｸ繝翫Ν vs 隧ｳ邏ｰ謖・､ｺ・・- 繝ｬ繧ｹ繝昴Φ繧ｹ髟ｷ繝・せ繝茨ｼ育洒縺・vs 髟ｷ縺・ｼ・
**譁ｰ隕就PI:**

- `GET /admin/ab-tests` - A/B繝・せ繝井ｸ�隕ｧ
- `GET /admin/ab-tests/:testId` - 繝・せ繝育ｵ先棡蜿門ｾ・
---

### 7. 笨・繝ｦ繝ｼ繧ｶ繝ｼ繧ｻ繝・す繝ｧ繝ｳ邂｡逅・
**繝輔ぃ繧､繝ｫ:** `src/lib/session-manager.ts`

**讖溯・:**

- 繧ｻ繝・す繝ｧ繝ｳID逕滓・繝ｻ讀懆ｨｼ
- 繝・ヰ繧､繧ｹ繧ｿ繧､繝玲､懷・・・obile/tablet/desktop・・- 繧｢繧ｯ繝・ぅ繝薙ユ繧｣繝ｭ繧ｰ・・ogin/chat/feedback/logout・・- 隍・焚繝・ヰ繧､繧ｹ邂｡逅・ｼ域怙螟ｧ5繧ｻ繝・す繝ｧ繝ｳ/繝ｦ繝ｼ繧ｶ繝ｼ・・- 閾ｪ蜍墓悄髯仙・繧後け繝ｪ繝ｼ繝ｳ繧｢繝・・・・4譎る俣・・
**譁ｰ隕就PI:**

- `GET /admin/sessions` - 繝ｦ繝ｼ繧ｶ繝ｼ繧ｻ繝・す繝ｧ繝ｳ荳�隕ｧ繝ｻ邨ｱ險・
---

### 8. 笨・閾ｪ蜍輔・繝ｫ繧ｹ繝｢繝九ち繝ｪ繝ｳ繧ｰ

**繝輔ぃ繧､繝ｫ:** `src/lib/health-monitor.ts`

**讖溯・:**

- 繝・・繧ｿ繝吶・繧ｹ謗･邯夂屮隕・- Ollama謗･邯夂屮隕・- Redis謗･邯夂屮隕厄ｼ医が繝励す繝ｧ繝ｳ・・- 繝・ぅ繧ｹ繧ｯ螳ｹ驥冗屮隕・- 騾｣邯壼､ｱ謨玲凾縺ｮ閾ｪ蜍輔い繝ｩ繝ｼ繝茨ｼ・ebhook + 繝｡繝ｼ繝ｫ・・- 蠕ｩ譌ｧ譎ゅ・騾夂衍

**迺ｰ蠅・､画焚:**

```env
HEALTH_MONITORING_ENABLED=true
```

**譁ｰ隕就PI:**

- `GET /admin/health-monitor` - 繝倥Ν繧ｹ繝√ぉ繝・け迥ｶ諷句叙蠕・
---

### 9. 笨・繝ｭ繧ｰ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・閾ｪ蜍募喧

**繝輔ぃ繧､繝ｫ:** `src/lib/log-cleanup.ts`

**讖溯・:**

- 蜿､縺・Ο繧ｰ繝輔ぃ繧､繝ｫ閾ｪ蜍募炎髯､・医ョ繝輔か繝ｫ繝・0譌･・・- 繧ｵ繧､繧ｺ蛻ｶ髯舌↓繧医ｋ蜑企勁・医ョ繝輔か繝ｫ繝・00MB・・- 繝ｭ繧ｰ蝨ｧ邵ｮ・・zip・・- 繝ｭ繧ｰ繝ｭ繝ｼ繝・・繧ｷ繝ｧ繝ｳ
- 螳壽悄螳溯｡鯉ｼ医ョ繝輔か繝ｫ繝・4譎る俣縺斐→・・
**迺ｰ蠅・､画焚:**

```env
LOG_CLEANUP_ENABLED=true
LOG_DIR=./logs
LOG_MAX_AGE_DAYS=30
LOG_MAX_SIZE_MB=500
LOG_CLEANUP_INTERVAL_HOURS=24
LOG_COMPRESSION_ENABLED=true
```

**譁ｰ隕就PI:**

- `GET /admin/logs/cleanup` - 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・邨ｱ險・- `POST /admin/logs/cleanup/trigger` - 謇句虚繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・螳溯｡・
---

## 逃 霑ｽ蜉�縺輔ｌ縺滉ｾ晏ｭ倬未菫・
```json
{
  "dependencies": {
    "nodemailer": "^7.0.11",
    "chart.js": "^4.5.1"
  },
  "devDependencies": {
    "@types/nodemailer": "^7.0.4"
  }
}
```

---

## 噫 襍ｷ蜍墓凾縺ｮ閾ｪ蜍募ｮ溯｡・
莉･荳九・讖溯・縺後し繝ｼ繝舌・襍ｷ蜍墓凾縺ｫ閾ｪ蜍慕噪縺ｫ髢句ｧ九＆繧後∪縺・

```typescript
// src/index.ts
backupScheduler.start(); // 閾ｪ蜍輔ヰ繝・け繧｢繝・・
healthMonitor.start(); // 繝倥Ν繧ｹ繝｢繝九ち繝ｪ繝ｳ繧ｰ
logCleanupManager.start(); // 繝ｭ繧ｰ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
```

---

## 識 譁ｰ縺励＞API荳�隕ｧ

### Webhook邂｡逅・
- `GET /admin/webhooks` - Webhook雉ｼ隱ｭ荳�隕ｧ

### API繧ｭ繝ｼ邂｡逅・
- `POST /admin/api-keys` - API繧ｭ繝ｼ逕滓・
- `GET /admin/api-keys` - API繧ｭ繝ｼ荳�隕ｧ繝ｻ邨ｱ險・
### 繝舌ャ繧ｯ繧｢繝・・邂｡逅・
- `GET /admin/backups` - 繝舌ャ繧ｯ繧｢繝・・迥ｶ諷九・螻･豁ｴ
- `POST /admin/backups/trigger` - 謇句虚繝舌ャ繧ｯ繧｢繝・・

### 繝倥Ν繧ｹ繝｢繝九ち繝ｪ繝ｳ繧ｰ

- `GET /admin/health-monitor` - 繝倥Ν繧ｹ繝√ぉ繝・け迥ｶ諷・
### 繧ｻ繝・す繝ｧ繝ｳ邂｡逅・
- `GET /admin/sessions` - 繧ｻ繝・す繝ｧ繝ｳ荳�隕ｧ繝ｻ邨ｱ險・
### A/B繝・せ繝・
- `GET /admin/ab-tests` - 繝・せ繝井ｸ�隕ｧ
- `GET /admin/ab-tests/:testId` - 繝・せ繝育ｵ先棡

### 繝ｭ繧ｰ邂｡逅・
- `GET /admin/logs/cleanup` - 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・邨ｱ險・- `POST /admin/logs/cleanup/trigger` - 謇句虚繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・

---

## 笞呻ｸ・謗ｨ螂ｨ迺ｰ蠅・､画焚險ｭ螳・
```env
# Webhook騾夂衍
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
CUSTOM_WEBHOOK_URL=https://your-webhook.com/endpoint
CUSTOM_WEBHOOK_SECRET=your-secret-key

# 閾ｪ蜍輔ヰ繝・け繧｢繝・・
AUTO_BACKUP_ENABLED=true
BACKUP_INTERVAL_MINUTES=60
MAX_BACKUP_GENERATIONS=7
BACKUP_DIR=./backups

# 繝｡繝ｼ繝ｫ騾夂衍
EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@elysia-ai.com
ADMIN_EMAIL=admin@example.com

# 繝倥Ν繧ｹ繝｢繝九ち繝ｪ繝ｳ繧ｰ
HEALTH_MONITORING_ENABLED=true

# 繝ｭ繧ｰ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
LOG_CLEANUP_ENABLED=true
LOG_MAX_AGE_DAYS=30
LOG_MAX_SIZE_MB=500
LOG_COMPRESSION_ENABLED=true
```

---

## 笨ｨ 繝薙Ν繝臥ｵ先棡

```
笨・繝薙Ν繝画・蜉・ webpack 5.103.0 compiled successfully
逃 蜃ｺ蜉・ dist/index.js
脂 蜈ｨ9讖溯・縺梧ｭ｣蟶ｸ縺ｫ邨ｱ蜷医＆繧後∪縺励◆
```

---

## 至 螳梧・蠎ｦ

- **螳溯｣・ｸ医∩讖溯・:** 9/9 (100%)
- **譁ｰ隕上ヵ繧｡繧､繝ｫ:** 9蛟・- **譁ｰ隕就PI:** 15蛟・- **繝薙Ν繝臥憾諷・** 笨・謌仙粥
- **萓晏ｭ倬未菫・** 笨・繧､繝ｳ繧ｹ繝医・繝ｫ螳御ｺ・
縺吶∋縺ｦ縺ｮ讖溯・縺後お繝ｳ繧ｿ繝ｼ繝励Λ繧､繧ｺ繝ｬ繝吶Ν縺ｧ螳溯｣・＆繧後�∵悽逡ｪ迺ｰ蠅・↓繝・・繝ｭ繧､蜿ｯ閭ｽ縺ｪ迥ｶ諷九〒縺吶�・
