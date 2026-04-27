# UI/UX繧ｫ繧ｹ繧ｿ繝槭う繧ｺ & 繧ｻ繧ｭ繝･繝ｪ繝・ぅ蠑ｷ蛹・- 螳溯｣・ｮ御ｺ・ぎ繧､繝・
## 笨・螳溯｣・・螳ｹ

### 1. UI/UX繧ｫ繧ｹ繧ｿ繝槭う繧ｺ讖溯・

#### 繝励Ο繝ｳ繝励ヨ繝・Φ繝励Ξ繝ｼ繝・
- **6縺､縺ｮ繝・ヵ繧ｩ繝ｫ繝医ユ繝ｳ繝励Ξ繝ｼ繝・*
  - 逕倥・ョ繝輔か繝ｫ繝・/ 逕倥・ユ繝ｳ繧ｷ繝ｧ繝ｳ鬮倥ａ
  - 騾壼ｸｸ繝・ヵ繧ｩ繝ｫ繝・/ 騾壼ｸｸ繝輔Ξ繝ｳ繝峨Μ繝ｼ
  - 繝励Ο繝輔ぉ繝・す繝ｧ繝翫Ν繝・ヵ繧ｩ繝ｫ繝・/ 繝励Ο繝輔ぉ繝・す繝ｧ繝翫Ν謚陦鍋噪

```bash
# 繝・Φ繝励Ξ繝ｼ繝井ｸ隕ｧ蜿門ｾ・curl http://localhost:3000/customization/templates
```

#### 繝・・繝櫁ｨｭ螳・
- **4縺､縺ｮ繝励Μ繧ｻ繝・ヨ繝・・繝・*
  - 繝斐Φ繧ｯ蜿ｯ諢帙＞ (繝・ヵ繧ｩ繝ｫ繝・
  - 繝悶Ν繝ｼ繝励Ο繝輔ぉ繝・す繝ｧ繝翫Ν
  - 繝代・繝励Ν繧ｨ繝ｬ繧ｬ繝ｳ繝・  - 繝繝ｼ繧ｯ繝｢繝ｼ繝・
```bash
# 繝・・繝樔ｸ隕ｧ蜿門ｾ・curl http://localhost:3000/customization/themes
```

#### 繝√Ε繝・ヨ繝｢繝ｼ繝・
- **5縺､縺ｮ繝｢繝ｼ繝・*
  - 瀦 逕倥・Δ繝ｼ繝・(temperature: 0.8)
  - 町 騾壼ｸｸ繝｢繝ｼ繝・(temperature: 0.7)
  - 直 繝励Ο繝輔ぉ繝・す繝ｧ繝翫Ν繝｢繝ｼ繝・(temperature: 0.5)
  - 耳 繧ｯ繝ｪ繧ｨ繧､繝・ぅ繝悶Δ繝ｼ繝・(temperature: 0.9)
  - 肌 繝・け繝九き繝ｫ繝｢繝ｼ繝・(temperature: 0.3)

```bash
# 繝｢繝ｼ繝我ｸ隕ｧ蜿門ｾ・curl http://localhost:3000/customization/modes
```

#### 繧ｨ繧ｯ繧ｹ繝昴・繝亥ｽ｢蠑・
- JSON / Markdown / TXT / HTML

```bash
# 繧ｨ繧ｯ繧ｹ繝昴・繝亥ｽ｢蠑丈ｸ隕ｧ蜿門ｾ・curl http://localhost:3000/customization/export-formats
```

### 2. 繧ｻ繧ｭ繝･繝ｪ繝・ぅ蠑ｷ蛹匁ｩ溯・

#### 蜈･蜉帙し繝九ち繧､繧ｼ繝ｼ繧ｷ繝ｧ繝ｳ

- **XSS蟇ｾ遲・*: HTML繧ｨ繧ｹ繧ｱ繝ｼ繝・(`escapeHtml`)
- **SQL繧､繝ｳ繧ｸ繧ｧ繧ｯ繧ｷ繝ｧ繝ｳ蟇ｾ遲・*: 蜊ｱ髯ｺ譁・ｭ鈴勁蜴ｻ (`sanitizeSqlInput`)
- **繝代せ繝医Λ繝舌・繧ｵ繝ｫ蟇ｾ遲・*: 繝・ぅ繝ｬ繧ｯ繝医Μ驕｡繧企亟豁｢ (`sanitizeFilePath`)

```typescript
import { escapeHtml, sanitizeSqlInput, sanitizeFilePath } from "./lib/security";

// 菴ｿ逕ｨ萓・const safe = escapeHtml(userInput);
```

#### 繝ｬ繝ｼ繝亥宛髯・
- **繝｡繝｢繝ｪ繝吶・繧ｹ縺ｮ繝ｬ繝ｼ繝亥宛髯・* (譛ｬ逡ｪ縺ｧ縺ｯRedis謗ｨ螂ｨ)
- 繝・ヵ繧ｩ繝ｫ繝・ 100繝ｪ繧ｯ繧ｨ繧ｹ繝・蛻・
```typescript
import { checkRateLimit } from "./lib/security";

const result = checkRateLimit(userId, {
  maxRequests: 50,
  windowMs: 60000,
});

if (!result.allowed) {
  return error(429, "Rate limit exceeded");
}
```

#### 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝倥ャ繝繝ｼ

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`
- `Referrer-Policy`

```typescript
import { getSecurityHeaders } from "./lib/security";

const headers = getSecurityHeaders();
```

## 当 API菴ｿ逕ｨ萓・
### 繝励Ο繝ｳ繝励ヨ繝・Φ繝励Ξ繝ｼ繝医・驕ｩ逕ｨ

```typescript
import { applyTemplate } from "./lib/customization";

const template = "縺ｫ繧・ｓ笙｡ 縺翫↓縺・■繧・ｓ縲＋query}縺ｫ縺､縺・※謨吶∴縺ｦ縺ゅ￡繧九・縲懶ｼ・;
const result = applyTemplate(template, { query: "TypeScript" });
// => "縺ｫ繧・ｓ笙｡ 縺翫↓縺・■繧・ｓ縲ゝypeScript縺ｫ縺､縺・※謨吶∴縺ｦ縺ゅ￡繧九・縲懶ｼ・
```

### 繝・・繝槭・驕ｩ逕ｨ

```typescript
import { applyTheme, defaultThemes } from "./lib/customization";

const theme = defaultThemes[0]; // 繝斐Φ繧ｯ蜿ｯ諢帙＞
const cssVars = applyTheme(theme);
// CSS螟画焚縺ｨ縺励※驕ｩ逕ｨ蜿ｯ閭ｽ
```

### 繝√Ε繝・ヨ繝｢繝ｼ繝峨・菴ｿ逕ｨ

```bash
# 逕倥・Δ繝ｼ繝峨〒繝√Ε繝・ヨ
curl -X POST http://localhost:3000/elysia-love \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "縺薙ｓ縺ｫ縺｡縺ｯ"}],
    "mode": "sweet"
  }'
```

## 白 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝吶せ繝医・繝ｩ繧ｯ繝・ぅ繧ｹ

### 1. 繝ｦ繝ｼ繧ｶ繝ｼ蜈･蜉帙・讀懆ｨｼ

```typescript
// 蟶ｸ縺ｫ繧ｵ繝九ち繧､繧ｼ繝ｼ繧ｷ繝ｧ繝ｳ
const cleanInput = escapeHtml(userInput);
const cleanPath = sanitizeFilePath(filePath);
```

### 2. 繝ｬ繝ｼ繝亥宛髯舌・驕ｩ逕ｨ

```typescript
// 繧ｨ繝ｳ繝峨・繧､繝ｳ繝医＃縺ｨ縺ｫ驕ｩ蛻・↑蛻ｶ髯舌ｒ險ｭ螳・app.post("/api/sensitive", async ({ request }) => {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const limit = checkRateLimit(ip, { maxRequests: 10, windowMs: 60000 });

  if (!limit.allowed) {
    return error(429, "Too many requests");
  }

  // 蜃ｦ逅・ｶ夊｡・});
```

### 3. 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝倥ャ繝繝ｼ縺ｮ險ｭ螳・
```typescript
// 縺吶∋縺ｦ縺ｮ繝ｬ繧ｹ繝昴Φ繧ｹ縺ｫ繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝倥ャ繝繝ｼ繧定ｿｽ蜉
const headers = {
  ...getSecurityHeaders(),
  "Content-Type": "application/json",
};

return new Response(data, { headers });
```

## 噫 GitHub Collaborator 險ｭ螳・
### 譁ｹ豕・: Invite collaborator (笘・・笘・・笘・譛蠑ｷ謗ｨ螂ｨ)

**謇玖ｻｽ縺・*: 笘・・笘・・笘・**螳牙・諤ｧ**: 笘・・笘・・笘・**謗ｨ螂ｨ蠎ｦ**: 笘・・笘・・笘・
#### 謇矩・

1. GitHub繝ｪ繝昴ず繝医Μ繝壹・繧ｸ繧帝幕縺・ https://github.com/Elysia20220909/ElysiaAI
2. **Settings** 繧ｿ繝悶ｒ繧ｯ繝ｪ繝・け
3. 蟾ｦ繧ｵ繧､繝峨ヰ繝ｼ縺ｮ **Collaborators** 繧偵け繝ｪ繝・け
4. 縲・*Add people**縲阪・繧ｿ繝ｳ繧偵け繝ｪ繝・け
5. GitHub ID縺ｫ `grok-readonly` 縺ｨ蜈･蜉・6. **Select a role** 縺ｧ縲・*Read**縲阪ｒ驕ｸ謚・7. 縲・*Add to repository**縲阪ｒ繧ｯ繝ｪ繝・け縺励※諡帛ｾ・∽ｿ｡

#### 迚ｹ蠕ｴ:

- 笨・隱ｭ縺ｿ蜿悶ｊ蟆ら畑繧｢繧ｯ繧ｻ繧ｹ
- 笨・繝ｪ繝昴ず繝医Μ蜈ｨ菴薙∈縺ｮ繧｢繧ｯ繧ｻ繧ｹ
- 笨・GitHub UI縺九ｉ邁｡蜊倥↓邂｡逅・庄閭ｽ
- 笨・縺・▽縺ｧ繧ょ炎髯､蜿ｯ閭ｽ
- 笨・譛繧ゅそ繧ｭ繝･繧｢縺ｪ譁ｹ豕・
### 莉｣譖ｿ譁ｹ豕・ Personal Access Token (髱樊耳螂ｨ)

繧ｻ繧ｭ繝･繝ｪ繝・ぅ荳翫・逅・罰縺九ｉ縲，ollaborator縺ｮRead讓ｩ髯舌↓繧医ｋ諡帛ｾ・ｒ蠑ｷ縺乗耳螂ｨ縺励∪縺吶・
## 刀 螳溯｣・ヵ繧｡繧､繝ｫ

### 譁ｰ隕丈ｽ懈・

- `src/lib/customization.ts` - UI/UX繧ｫ繧ｹ繧ｿ繝槭う繧ｺ讖溯・
- `docs/CUSTOMIZATION_SECURITY_GUIDE.md` - 縺薙・繧ｬ繧､繝・
### 譖ｴ譁ｰ

- `src/lib/security.ts` - 繧ｻ繧ｭ繝･繝ｪ繝・ぅ讖溯・霑ｽ蜉
- `src/index.ts` - 繧ｫ繧ｹ繧ｿ繝槭う繧ｺAPI繧ｨ繝ｳ繝峨・繧､繝ｳ繝郁ｿｽ蜉

## ｧｪ 繝・せ繝・
```bash
# 繧ｫ繧ｹ繧ｿ繝槭う繧ｺAPI縺ｮ繝・せ繝・curl http://localhost:3000/customization/templates
curl http://localhost:3000/customization/themes
curl http://localhost:3000/customization/modes
curl http://localhost:3000/customization/export-formats

# 繧ｻ繧ｭ繝･繝ｪ繝・ぅ讖溯・縺ｮ繝・せ繝・bun test tests/security.test.ts
```

## 投 谺｡縺ｮ繧ｹ繝・ャ繝・
1. 笨・UI/UX繧ｫ繧ｹ繧ｿ繝槭う繧ｺ讖溯・ - **螳御ｺ・*
2. 笨・繧ｻ繧ｭ繝･繝ｪ繝・ぅ蠑ｷ蛹・- **螳御ｺ・*
3. 竢ｳ 繝輔Ο繝ｳ繝医お繝ｳ繝峨∈縺ｮ邨ｱ蜷・4. 竢ｳ 繝ｦ繝ｼ繧ｶ繝ｼ險ｭ螳壹・豌ｸ邯壼喧
5. 竢ｳ 譛ｬ逡ｪ迺ｰ蠅・∈縺ｮ繝・・繝ｭ繧､

---

## 庁 菴ｿ逕ｨ萓・
### 繝・せ繧ｯ繝医ャ繝励い繝励Μ縺ｧ縺ｮ繝・・繝槫・繧頑崛縺・
```javascript
// desktop/index.html
async function loadThemes() {
  const themes = await fetch("/customization/themes").then((r) => r.json());
  const select = document.getElementById("theme-select");

  themes.forEach((theme) => {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.name;
    select.appendChild(option);
  });
}

function applyTheme(themeId) {
  const theme = themes.find((t) => t.id === themeId);
  document.documentElement.style.setProperty("--color-primary", theme.colors.primary);
  // ... 莉悶・濶ｲ繧りｨｭ螳・}
```

### 繝｢繝舌う繝ｫ繧｢繝励Μ縺ｧ縺ｮ繝｢繝ｼ繝蛾∈謚・
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

**螳溯｣・ｮ御ｺ・律**: 2025蟷ｴ12譛・譌･
**繝舌・繧ｸ繝ｧ繝ｳ**: v2.0.0
**諡・ｽ・*: GitHub Copilot
