# OpenAI邨ｱ蜷医ぎ繧､繝・
## 讎りｦ・
Elysia AI縺ｫOpenAI GPT繝｢繝・Ν繧堤ｵｱ蜷医＠縺ｾ縺励◆縲よ里蟄倥・Ollama繝吶・繧ｹ縺ｮ繧ｷ繧ｹ繝・Β縺ｫ蜉�縺医※縲＾penAI API繧剃ｽｿ逕ｨ縺励◆鬮伜刀雉ｪ縺ｪ蠢懃ｭ斐′蜿ｯ閭ｽ縺ｫ縺ｪ繧翫∪縺吶�・
## 螳溯｣・・螳ｹ

### 1. OpenAI邨ｱ蜷医Λ繧､繝悶Λ繝ｪ (`src/lib/openai-integration.ts`)

**荳ｻ縺ｪ讖溯・:**

- **繧ｯ繝ｩ繧､繧｢繝ｳ繝育ｮ｡逅・*: OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医・蛻晄悄蛹悶→邂｡逅・- **繝√Ε繝・ヨ讖溯・**: 髱槭せ繝医Μ繝ｼ繝溘Φ繧ｰ/繧ｹ繝医Μ繝ｼ繝溘Φ繧ｰ荳｡蟇ｾ蠢・- **邁｡譏鄭PI**: 繧ｷ繝ｳ繝励Ν縺ｪ繝√Ε繝・ヨ髢｢謨ｰ
- **莨夊ｩｱ螻･豁ｴ邂｡逅・*: 莨夊ｩｱ繧ｳ繝ｳ繝・く繧ｹ繝医・菫晄戟
- **繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ**: 繝｢繝・Ν荳�隕ｧ縲√ヨ繝ｼ繧ｯ繝ｳ謗ｨ螳・
**繧ｨ繧ｯ繧ｹ繝昴・繝磯未謨ｰ:**

```typescript
// 蛻晄悄蛹・initializeOpenAI(apiKey?: string): OpenAI
getOpenAIClient(): OpenAI

// 繝√Ε繝・ヨ
chatWithOpenAI(messages, options): Promise<string>
streamChatWithOpenAI(messages, options): AsyncGenerator<string>

// 邁｡譏馴未謨ｰ
simpleChat(userMessage, systemPrompt?, options): Promise<string>
conversationChat(history, newUserMessage, options): Promise<{response, updatedHistory}>

// 繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ
isOpenAIAvailable(): boolean
listAvailableModels(): Promise<string[]>
estimateTokens(text: string): number
```

### 2. 譁ｰ縺励＞繝｢繝ｼ繝・ `openai`

**LLM險ｭ螳・* (`.internal/app/llm/llm-config.ts`):

```typescript
openai: {
  model: "gpt-4o-mini",
  temperature: 0.7,
  provider: "openai",
  systemPrompt: `You are "Elysia", a friendly AI assistant powered by OpenAI...`
}
```

**蛻・ｊ譖ｿ縺医さ繝槭Φ繝・**

- `/openai`
- `/gpt`

### 3. API邨ｱ蜷・(`src/index.ts`)

**蜃ｦ逅・ヵ繝ｭ繝ｼ:**

1. 繝｢繝ｼ繝峨′ `openai` 縺ｮ蝣ｴ蜷医�＾penAI API繧剃ｽｿ逕ｨ
2. 繧ｹ繝医Μ繝ｼ繝溘Φ繧ｰ繝ｬ繧ｹ繝昴Φ繧ｹ繧堤函謌・3. SSE蠖｢蠑上〒繧ｯ繝ｩ繧､繧｢繝ｳ繝医↓騾∽ｿ｡
4. 莉悶・繝｢繝ｼ繝峨・蠕捺擂騾壹ｊOllama繧剃ｽｿ逕ｨ

**繝ｬ繧ｹ繝昴Φ繧ｹ繝倥ャ繝�繝ｼ:**

```
X-Elysia-Mode: openai
X-Elysia-Provider: openai
```

## 迺ｰ蠅・ｨｭ螳・
### 蠢・�育腸蠅・､画焚

`.env` 繝輔ぃ繧､繝ｫ縺ｫ霑ｽ蜉�:

```env
OPENAI_API_KEY=sk-proj-your-api-key-here
OPENAI_MODEL=gpt-5.1-codex-max  # 譌｢螳壹Δ繝・Ν・・PT-5.1-Codex-Max Preview・・```

> **豕ｨ諢・*: GPT-5.1-Codex-Max 縺ｯ Preview 繝｢繝・Ν縺ｧ縺吶�０penAI 繧｢繧ｫ繧ｦ繝ｳ繝医〒繧｢繧ｯ繧ｻ繧ｹ讓ｩ髯舌ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・
### 蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ繝｢繝・Ν

- `gpt-5.1-codex-max`: **譛�譁ｰ繝励Ξ繝薙Η繝ｼ繝｢繝・Ν** - 繧ｳ繝ｼ繝臥函謌舌・陬懷ｮ後↓譛�驕ｩ蛹厄ｼ域耳螂ｨ・・- `gpt-4o-mini`: 鬮倬�溘・繧ｳ繧ｹ繝亥柑邇・噪
- `gpt-4o`: 譛�鬮伜刀雉ｪ
- `gpt-4-turbo`: 繝舌Λ繝ｳ繧ｹ蝙・- `gpt-3.5-turbo`: 菴弱さ繧ｹ繝・
## 菴ｿ逕ｨ譁ｹ豕・
### 1. 繝・せ繝亥ｮ溯｡・
```bash
# 迺ｰ蠅・､画焚繧定ｨｭ螳・export OPENAI_API_KEY=sk-proj-...

# 繝・せ繝亥ｮ溯｡・bun run test-openai.ts
```

**繝・せ繝亥・螳ｹ:**

- API繧ｭ繝ｼ遒ｺ隱・- 繧ｯ繝ｩ繧､繧｢繝ｳ繝亥・譛溷喧
- 邁｡蜊倥↑繝√Ε繝・ヨ
- 繧ｷ繧ｹ繝・Β繝励Ο繝ｳ繝励ヨ莉倥″繝√Ε繝・ヨ
- 莨夊ｩｱ螻･豁ｴ莉倥″繝√Ε繝・ヨ
- 繝医・繧ｯ繝ｳ謗ｨ螳・- 繝｢繝・Ν荳�隕ｧ蜿門ｾ・
### 2. API邨檎罰縺ｧ菴ｿ逕ｨ

```bash
# OpenAI繝｢繝ｼ繝峨〒繝√Ε繝・ヨ
curl -X POST http://localhost:3000/elysia-love \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "messages": [
      {"role": "user", "content": "縺薙ｓ縺ｫ縺｡縺ｯ"}
    ],
    "mode": "openai"
  }'
```

### 3. 繝励Ο繧ｰ繝ｩ繝�縺九ｉ逶ｴ謗･菴ｿ逕ｨ

```typescript
import { simpleChat, conversationChat } from "./src/lib/openai-integration";

// 繧ｷ繝ｳ繝励Ν縺ｪ繝√Ε繝・ヨ
const response = await simpleChat("莉頑律縺ｮ螟ｩ豌励・?", "縺ゅ↑縺溘・隕ｪ蛻・↑AI繧｢繧ｷ繧ｹ繧ｿ繝ｳ繝医〒縺吶�・, { model: "gpt-4o-mini", temperature: 0.7 });

// 莨夊ｩｱ螻･豁ｴ莉倥″
let history = [{ role: "system", content: "縺ゅ↑縺溘・譌･譛ｬ隱槭〒隧ｱ縺僊I縺ｧ縺吶�・ }];

const turn1 = await conversationChat(history, "遘√・蜷榊燕縺ｯ繧ｿ繝ｭ繧ｦ縺ｧ縺吶�・);
console.log(turn1.response);
history = turn1.updatedHistory;

const turn2 = await conversationChat(history, "遘√・蜷榊燕縺ｯ菴輔〒縺励◆縺・");
console.log(turn2.response); // "繧ｿ繝ｭ繧ｦ"縺ｨ隕壹∴縺ｦ縺・ｋ
```

## 繝｢繝ｼ繝画ｯ碑ｼ・
| 繝｢繝ｼ繝・      | 繝励Ο繝舌う繝�繝ｼ | 繝｢繝・Ν          | 迚ｹ蠕ｴ                   |
| ------------ | ------------ | --------------- | ---------------------- |
| sweet        | Ollama       | llama3.2        | 蜈ｬ蠑拾lysia繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ |
| normal       | Ollama       | llama3.2        | 繝輔Ξ繝ｳ繝峨Μ繝ｼ           |
| professional | Ollama       | llama3.2        | 繝輔か繝ｼ繝槭Ν             |
| casual       | Ollama       | llama3.2        | 繧ｿ繝｡蜿｣縲仝eb讀懃ｴ｢蟇ｾ蠢・   |
| creative     | Ollama       | llama3.2        | 蜑ｵ騾�逧・                |
| technical    | Ollama       | llama3.2        | 謚�陦鍋噪                 |
| **openai**   | **OpenAI**   | **gpt-4o-mini** | **鬮伜刀雉ｪ縲∝ｺ・ｯ・↑遏･隴・* |

## 繧ｳ繧ｹ繝育ｮ｡逅・
### 繝医・繧ｯ繝ｳ謗ｨ螳・
```typescript
import { estimateTokens } from "./src/lib/openai-integration";

const text = "縺薙ｓ縺ｫ縺｡縺ｯ縲∽ｻ頑律縺ｯ縺・＞螟ｩ豌励〒縺吶・縲・;
const tokens = estimateTokens(text); // 邏・0繝医・繧ｯ繝ｳ
```

### 譁咎≡逶ｮ螳・
**gpt-4o-mini:**
- 蜈･蜉・ $0.15 / 1M 繝医・繧ｯ繝ｳ
- 蜃ｺ蜉・ $0.60 / 1M 繝医・繧ｯ繝ｳ

**gpt-5.1-codex-max (Preview):**
- 譁咎≡縺ｯ OpenAI 縺ｮ譛�譁ｰ繝峨く繝･繝｡繝ｳ繝医ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞
- 繧ｳ繝ｼ繝臥函謌舌・陬懷ｮ後〒鬮倥＞繧ｳ繧ｹ繝医ヱ繝輔か繝ｼ繝槭Φ繧ｹ繧堤匱謠ｮ

**萓・(gpt-4o-mini):**
- 100譁・ｭ励・雉ｪ蝠・竊・邏・50繝医・繧ｯ繝ｳ 竊・$0.0000225
- 300譁・ｭ励・蠢懃ｭ・竊・邏・50繝医・繧ｯ繝ｳ 竊・$0.000270
- **蜷郁ｨ・** $0.0002925 (邏・.03蜀・

## 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ

### API繧ｭ繝ｼ譛ｪ險ｭ螳・
```typescript
if (!isOpenAIAvailable()) {
  console.log("OPENAI_API_KEY 縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ");
}
```

### API蜻ｼ縺ｳ蜃ｺ縺励お繝ｩ繝ｼ

```typescript
try {
  const response = await simpleChat("縺薙ｓ縺ｫ縺｡縺ｯ");
} catch (error) {
  console.error("OpenAI API 繧ｨ繝ｩ繝ｼ:", error);
  // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ: Ollama繝｢繝ｼ繝峨↓蛻・ｊ譖ｿ縺・}
```

## 繧ｻ繧ｭ繝･繝ｪ繝・ぅ

- API 繧ｭ繝ｼ縺ｯ迺ｰ蠅・､画焚縺ｧ邂｡逅・- `.env` 繝輔ぃ繧､繝ｫ縺ｯ `.gitignore` 縺ｫ蜷ｫ繧√ｋ
- 繝励Ο繝�繧ｯ繧ｷ繝ｧ繝ｳ迺ｰ蠅・〒縺ｯ secrets management 繧剃ｽｿ逕ｨ謗ｨ螂ｨ

## 谺｡縺ｮ繧ｹ繝・ャ繝・
1. **迺ｰ蠅・､画焚險ｭ螳・*: `OPENAI_API_KEY` 繧・`.env` 縺ｫ霑ｽ蜉�
2. **繝・せ繝亥ｮ溯｡・*: `bun run test-openai.ts`
3. **繧ｵ繝ｼ繝舌・襍ｷ蜍・*: `bun run dev`
4. **OpenAI繝｢繝ｼ繝我ｽｿ逕ｨ**: `mode: "openai"` 縺ｧAPI繧ｳ繝ｼ繝ｫ

## 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### 繧ｨ繝ｩ繝ｼ: "OpenAI API 繧ｭ繝ｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ"

```bash
# .env 繝輔ぃ繧､繝ｫ繧堤｢ｺ隱・cat .env | grep OPENAI_API_KEY

# 險ｭ螳壹＆繧後※縺・↑縺・�ｴ蜷・echo "OPENAI_API_KEY=sk-proj-your-key-here" >> .env
```

### 繧ｨ繝ｩ繝ｼ: "OpenAI API error"

- API繧ｭ繝ｼ縺梧ｭ｣縺励＞縺狗｢ｺ隱・- 繝ｬ繝ｼ繝亥宛髯舌ｒ遒ｺ隱・- OpenAI縺ｮ繧ｹ繝・・繧ｿ繧ｹ繝壹・繧ｸ繧堤｢ｺ隱・
縺薙ｌ縺ｧElysiaAI縺ｯ Ollama 縺ｨ OpenAI 縺ｮ荳｡譁ｹ繧偵し繝昴・繝医＠縲∫畑騾斐↓蠢懊§縺ｦ菴ｿ縺・・縺代ｉ繧後ｋ繧医≧縺ｫ縺ｪ繧翫∪縺励◆・・
