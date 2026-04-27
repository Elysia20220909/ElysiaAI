# Elysia OS: API Reference (v3.0 Sovereign)

縺薙・繝峨く繝･繝｡繝ｳ繝医〒縺ｯ縲・lysia OS 繧ｫ繝ｼ繝阪Ν縺梧署萓帙☆繧・REST API 縺翫ｈ縺ｳ縲後せ繧ｭ繝ｫ・・kill・峨�阪・謚�陦謎ｻ墓ｧ倥↓縺､縺・※隧ｳ霑ｰ縺励∪縺吶�・
## 1. Core API (REST)

### `POST /chat/stream`
AI 縺ｨ縺ｮ蟇ｾ隧ｱ縺翫ｈ縺ｳ繧ｹ繧ｭ繝ｫ螳溯｡後・繝｡繧､繝ｳ繧ｨ繝ｳ繝峨・繧､繝ｳ繝医〒縺吶�・- **Payload**: `{"message": "string"}`
- **Response**: Server-Sent Events (SSE)
    - `data: {"content": "..."}`: AI 縺ｮ逋ｺ險�
    - `data: {"skills": [...]}`: 螳溯｡後＆繧後◆繧ｹ繧ｭ繝ｫ縺ｮ邨先棡

### `GET /system/monitor`
OS 縺ｮ迴ｾ蝨ｨ縺ｮ蛛･蠎ｷ迥ｶ諷具ｼ医ユ繝ｬ繝｡繝医Μ・峨ｒ霑斐＠縺ｾ縺吶�・- **Response**:
  ```json
  {
    "system": { "cpu": 15, "ram": 40, "disk": { "free": 200 } },
    "elysia": { "version": "3.0.0", "status": "stable" }
  }
  ```

---

## 2. Skill Registry (Instruction Set)

AI 縺ｯ迚ｹ螳壹・讒区枚繧堤函謌舌☆繧九％縺ｨ縺ｧ縲＾S 讖溯・繧堤峩謗･謫堺ｽ懊〒縺阪∪縺吶�・
| 繧ｹ繧ｭ繝ｫ | 讒区枚 | 隱ｬ譏・|
| :--- | :--- | :--- |
| **The Eye** | `<skill:web_search(query="...")>` | DuckDuckGo 縺ｫ繧医ｋ譛�譁ｰ諠・�ｱ縺ｮ讀懃ｴ｢ |
| **The Sight** | `<skill:capture_screen()>` | 繝・せ繧ｯ繝医ャ繝励・繧ｭ繝｣繝励メ繝｣縺ｨ隗｣譫・|
| **The Hand** | `<skill:git_info()>` | Git 縺ｮ迥ｶ諷九→螻･豁ｴ縺ｮ蜿門ｾ・|
| **Soul Memory**| `<skill:update_soul(key="...", value="...")>` | 豌ｸ邯夂噪縺ｪ諢滓ュ繝ｻ蝸懷･ｽ縺ｮ險俶・ |
| **System Doctor**| `<skill:system_doctor()>` | OS 縺ｮ謨ｴ蜷域�ｧ讀懈渊縺ｨ險ｺ譁ｭ |
| **OS Growth** | `<skill:install_app(id="...", ...)>` | 譁ｰ縺励＞ UI 繧ｳ繝ｳ繝昴・繝阪Φ繝医・蜍慕噪逕滓・ |

---

## 3. Integration Guide

### WebSocket (Next Phase)
迴ｾ蝨ｨ縺ｯ HTTP/SSE 縺ｧ縺吶′縲∵ｬ｡譛溘ヵ繧ｧ繝ｼ繧ｺ縺ｧ蜿梧婿蜷・WebSocket 縺ｫ繧医ｋ縲瑚・蜍慕噪繝励ャ繧ｷ繝･・・roactive Push・峨�阪∈遘ｻ陦御ｺ亥ｮ壹〒縺吶�・
### 繧ｻ繧ｭ繝･繝ｪ繝・ぅ
API 繧ｭ繝ｼ縺ｯ `etc/elysia/config.json` 縺ｧ螳夂ｾｩ縺輔ｌ縺ｾ縺吶�ょ､夜Κ縺九ｉ縺ｮ繧｢繧ｯ繧ｻ繧ｹ譎ゅ・ `X-API-KEY` 繝倥ャ繝�繝ｼ縺悟ｿ・ｦ√〒縺吶�・
