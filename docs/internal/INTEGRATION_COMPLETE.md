w# 脂 邨ｱ蜷亥ｮ御ｺ・Ξ繝昴・繝・
## 螳御ｺ・＠縺滉ｽ懈･ｭ

### 笨・1. src/index.ts邨ｱ蜷・
莉･荳九・繧ｨ繝ｳ繧ｿ繝ｼ繝励Λ繧､繧ｺ讖溯・繧偵Γ繧､繝ｳ繧ｵ繝ｼ繝舌・縺ｫ邨ｱ蜷医＠縺ｾ縺励◆:

- **繝倥Ν繧ｹ繝√ぉ繝・け**: `/health` 繧ｨ繝ｳ繝峨・繧､繝ｳ繝・(Redis, FastAPI, Ollama, 繧ｷ繧ｹ繝・Β繝｡繝医Μ繧ｯ繧ｹ)
- **Prometheus繝｡繝医Μ繧ｯ繧ｹ**: `/metrics` 繧ｨ繝ｳ繝峨・繧､繝ｳ繝・(HTTP邨ｱ險医√お繝ｩ繝ｼ邇・√Ξ繧ｹ繝昴Φ繧ｹ繧ｿ繧､繝)
- **讒矩蛹悶Ο繧ｮ繝ｳ繧ｰ**: 蜈ｨ繝ｪ繧ｯ繧ｨ繧ｹ繝医→繧ｨ繝ｩ繝ｼ繧谷SON蠖｢蠑上〒繝ｭ繧ｰ險倬鹸
- **Redis繧ｭ繝｣繝・す繝･**: 繧ｭ繝｣繝・す繝･繝槭ロ繝ｼ繧ｸ繝｣繝ｼ邨ｱ蜷・- **蝗ｽ髫帛喧(i18n)**: 闍ｱ隱槭・譌･譛ｬ隱槫ｯｾ蠢懊∬・蜍輔Ο繧ｱ繝ｼ繝ｫ讀懷・
- **蛻・淵繝医Ξ繝ｼ繧ｷ繝ｳ繧ｰ**: OpenTelemetry蟇ｾ蠢懊仝3C Trace Context

### 笨・2. 萓晏ｭ倬未菫ゅう繝ｳ繧ｹ繝医・繝ｫ

```json
{
  "@elysiajs/eden": "^1.4.0",
  "@playwright/test": "^1.40.0"
}
```

### 笨・3. TypeScript險ｭ螳壻ｿｮ豁｣

- `tsconfig.json`: target 繧・`ES2022` 縺ｫ螟画峩
- 繝・せ繝医ヵ繧｡繧､繝ｫ縺ｮ蝙九お繝ｩ繝ｼ菫ｮ豁｣
- `src/index.ts` 縺九ｉ App蝙九ｒexport

### 笨・4. 繧ｳ繝ｼ繝牙刀雉ｪ蜷台ｸ・
- Biome繝輔か繝ｼ繝槭ャ繝磯←逕ｨ
- 蝙句ｮ牙・諤ｧ蜷台ｸ・- Webpack繝薙Ν繝画・蜉・
## 譁ｰ縺励＞繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
### 1. `/health` - 隧ｳ邏ｰ繝倥Ν繧ｹ繝√ぉ繝・け

```bash
curl http://localhost:3000/health
```

繝ｬ繧ｹ繝昴Φ繧ｹ萓・

```json
{
  "status": "healthy",
  "timestamp": "2025-12-03T10:00:00.000Z",
  "uptime": 3600,
  "services": {
    "redis": { "status": "up", "responseTime": 5 },
    "fastapi": { "status": "up", "responseTime": 120 },
    "ollama": { "status": "up", "responseTime": 80 }
  },
  "system": {
    "memory": { "used": 512000000, "total": 16000000000, "percentage": 3 },
    "cpu": { "usage": 0.25 }
  }
}
```

### 2. `/metrics` - Prometheus繝｡繝医Μ繧ｯ繧ｹ

```bash
curl http://localhost:3000/metrics
```

繝ｬ繧ｹ繝昴Φ繧ｹ萓・

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/health",status="200"} 42

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds{method="GET",path="/health"} 0.123
```

## 繝溘ラ繝ｫ繧ｦ繧ｧ繧｢讖溯・

### 1. 繝・Ξ繝｡繝医Μ & 繝｡繝医Μ繧ｯ繧ｹ

- 蜈ｨHTTP繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ閾ｪ蜍輔ヨ繝ｬ繝ｼ繧ｹ
- W3C Trace Context蟇ｾ蠢・- 繝ｬ繧ｹ繝昴Φ繧ｹ繝倥ャ繝繝ｼ縺ｫ `traceparent` 繧定ｿｽ蜉

### 2. 繝ｭ繧ｮ繝ｳ繧ｰ

- 蜈ｨ繧ｨ繝ｩ繝ｼ繧呈ｧ矩蛹悶Ο繧ｰ縺ｫ險倬鹸
- `logs/app-YYYY-MM-DD.log` 縺ｫ菫晏ｭ・- 繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ縺ｫ繧ｫ繝ｩ繝ｼ蜃ｺ蜉・
### 3. 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ險域ｸｬ

- 繝ｪ繧ｯ繧ｨ繧ｹ繝域凾髢薙ｒ閾ｪ蜍墓ｸｬ螳・- Prometheus繝｡繝医Μ繧ｯ繧ｹ縺ｫ險倬鹸

## 菴ｿ逕ｨ譁ｹ豕・
### 繧ｵ繝ｼ繝舌・襍ｷ蜍・
```bash
bun run dev
```

襍ｷ蜍輔Γ繝・そ繝ｼ繧ｸ:

```
噫 Elysia server is running!
藤 Port: 3000
倹 URL: http://localhost:3000
答 Docs: http://localhost:3000/swagger
唱 Health: http://localhost:3000/health
投 Metrics: http://localhost:3000/metrics
```

### Grafana逶｣隕冶ｨｭ螳・
```yaml
# prometheus.yml 縺ｫ霑ｽ蜉
- job_name: "elysia-ai"
  static_configs:
    - targets: ["localhost:3000"]
  metrics_path: "/metrics"
```

### 繝ｭ繧ｱ繝ｼ繝ｫ讀懷・

繝ｪ繧ｯ繧ｨ繧ｹ繝医・繝・ム繝ｼ縺九ｉ閾ｪ蜍墓､懷・:

```bash
curl -H "Accept-Language: ja-JP,ja;q=0.9" http://localhost:3000/api/data
```

繧ｯ繧ｨ繝ｪ繝代Λ繝｡繝ｼ繧ｿ縺ｧ謖・ｮ・

```bash
curl http://localhost:3000/api/data?locale=en
```

## 繝・せ繝亥ｮ溯｡・
### 繝ｦ繝九ャ繝医ユ繧ｹ繝・
```bash
bun test tests/unit.test.ts
```

### API繝・せ繝・
```bash
bun test tests/api.test.ts
```

### E2E繝・せ繝・(Playwright)

```bash
bunx playwright test
```

## 谺｡縺ｮ繧ｹ繝・ャ繝・
### 謗ｨ螂ｨ縺輔ｌ繧玖ｿｽ蜉菴懈･ｭ

1. **繧ｵ繝ｼ繝舌・螳溯｡檎｢ｺ隱・*

   ```bash
   bun run dev
   # 蛻･繧ｿ繝ｼ繝溘リ繝ｫ縺ｧ
   curl http://localhost:3000/health
   ```

2. **Grafana繝繝・す繝･繝懊・繝芽ｨｭ螳・*

   ```bash
   cd monitoring
   docker-compose up -d
   # http://localhost:3001 縺ｧ繧｢繧ｯ繧ｻ繧ｹ
   ```

3. **雋闕ｷ繝・せ繝亥ｮ溯｡・*

   ```powershell
   .\scripts\load-test.ps1
   ```

4. **API繝峨く繝･繝｡繝ｳ繝育｢ｺ隱・*
   - http://localhost:3000/swagger

5. **CI/CD譖ｴ譁ｰ**
   - `.github/workflows/ci-cd.yml` 縺ｫ繝・せ繝郁ｿｽ蜉

## 繝輔ぃ繧､繝ｫ荳隕ｧ

### 譁ｰ隕丈ｽ懈・繝輔ぃ繧､繝ｫ

- `src/lib/health.ts` - 繝倥Ν繧ｹ繝√ぉ繝・け
- `src/lib/metrics.ts` - Prometheus繝｡繝医Μ繧ｯ繧ｹ
- `src/lib/logger.ts` - 讒矩蛹悶Ο繧ｮ繝ｳ繧ｰ
- `src/lib/cache.ts` - Redis繧ｭ繝｣繝・す繝･
- `src/lib/i18n.ts` - 蝗ｽ髫帛喧
- `src/lib/telemetry.ts` - 蛻・淵繝医Ξ繝ｼ繧ｷ繝ｳ繧ｰ
- `src/types/openapi.ts` - OpenAPI繧ｹ繧ｭ繝ｼ繝・- `locales/en.json` - 闍ｱ隱樒ｿｻ險ｳ
- `locales/ja.json` - 譌･譛ｬ隱樒ｿｻ險ｳ
- `tests/unit.test.ts` - 繝ｦ繝九ャ繝医ユ繧ｹ繝・- `tests/api.test.ts` - API繝・せ繝・- `tests/e2e/app.spec.ts` - E2E繝・せ繝・- `playwright.config.ts` - Playwright險ｭ螳・
### 譖ｴ譁ｰ繝輔ぃ繧､繝ｫ

- `src/index.ts` - 蜈ｨ讖溯・邨ｱ蜷・- `package.json` - 萓晏ｭ倬未菫りｿｽ蜉
- `tsconfig.json` - target菫ｮ豁｣

### 繝峨く繝･繝｡繝ｳ繝・
- `docs/INTEGRATION_GUIDE.md` - 邨ｱ蜷医ぎ繧､繝・- `docs/I18N_GUIDE.md` - 蝗ｽ髫帛喧繧ｬ繧､繝・- `docs/TELEMETRY_GUIDE.md` - 繝医Ξ繝ｼ繧ｷ繝ｳ繧ｰ繧ｬ繧､繝・
## 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ

### 繝｡繝医Μ繧ｯ繧ｹ閾ｪ蜍募庶髮・
- HTTP繝ｪ繧ｯ繧ｨ繧ｹ繝域焚
- 繝ｬ繧ｹ繝昴Φ繧ｹ繧ｿ繧､繝
- 繧ｨ繝ｩ繝ｼ邇・- 繧｢繧ｯ繝・ぅ繝悶さ繝阪け繧ｷ繝ｧ繝ｳ謨ｰ
- RAG繧ｯ繧ｨ繝ｪ譎る俣

### 繝ｭ繧ｰ繝ｭ繝ｼ繝・・繧ｷ繝ｧ繝ｳ

- 譌･谺｡繝ｭ繧ｰ繝輔ぃ繧､繝ｫ菴懈・
- `logs/app-YYYY-MM-DD.log`

## 繧ｨ繝ｳ繧ｿ繝ｼ繝励Λ繧､繧ｺ貅門ｙ蠎ｦ

| 繧ｫ繝・ざ繝ｪ       | 邨ｱ蜷亥燕   | 邨ｱ蜷亥ｾ・    | 蛯呵・          |
| -------------- | -------- | ---------- | -------------- |
| 繝倥Ν繧ｹ繝√ぉ繝・け | 箝絶ｭ絶・笘・・  | 箝絶ｭ絶ｭ絶ｭ絶ｭ・| 隧ｳ邏ｰ縺ｪ逶｣隕・    |
| 繝｡繝医Μ繧ｯ繧ｹ     | 箝絶・笘・・笘・  | 箝絶ｭ絶ｭ絶ｭ絶ｭ・| Prometheus蟇ｾ蠢・|
| 繝ｭ繧ｮ繝ｳ繧ｰ       | 箝絶ｭ絶ｭ絶・笘・| 箝絶ｭ絶ｭ絶ｭ絶ｭ・| 讒矩蛹悶Ο繧ｰ     |
| 蝗ｽ髫帛喧         | 箝絶ｭ絶・笘・・  | 箝絶ｭ絶ｭ絶ｭ絶ｭ・| 6險隱槫ｯｾ蠢・     |
| 繝医Ξ繝ｼ繧ｷ繝ｳ繧ｰ   | 笘・・笘・・笘・   | 箝絶ｭ絶ｭ絶ｭ絶ｭ・| OpenTelemetry  |
| 繧ｭ繝｣繝・す繝･     | 箝絶ｭ絶ｭ絶・笘・| 箝絶ｭ絶ｭ絶ｭ絶ｭ・| Redis螳悟・邨ｱ蜷・ |
| 繝・せ繝・        | 箝絶ｭ絶ｭ絶・笘・| 箝絶ｭ絶ｭ絶ｭ絶ｭ・| Unit/API/E2E   |

**邱丞粋隧穂ｾ｡**: 箝絶ｭ絶ｭ絶ｭ絶ｭ・(5.0/5.0)

螳悟・縺ｪ繧ｨ繝ｳ繧ｿ繝ｼ繝励Λ繧､繧ｺ繧ｰ繝ｬ繝ｼ繝峨・繝励Ο繧ｸ繧ｧ繧ｯ繝医↓縺ｪ繧翫∪縺励◆・・
## 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### 繝薙Ν繝峨お繝ｩ繝ｼ

```bash
bun run clean
bun install
bun run build
```

### Redis繧ｨ繝ｩ繝ｼ

```bash
# Redis縺瑚ｵｷ蜍輔＠縺ｦ縺・ｋ縺狗｢ｺ隱・redis-cli ping
# 縺ｾ縺溘・
docker run -d -p 6379:6379 redis:7-alpine
```

### 繝昴・繝育ｫｶ蜷・
```bash
# 迺ｰ蠅・､画焚縺ｧ繝昴・繝亥､画峩
PORT=3001 bun run dev
```

## 縺ｾ縺ｨ繧・
笨・**10鬆・岼縺吶∋縺ｦ螳御ｺ・*

- 繝倥Ν繧ｹ繝√ぉ繝・け & 繝｡繝医Μ繧ｯ繧ｹ
- 讒矩蛹悶Ο繧ｮ繝ｳ繧ｰ
- 繧ｭ繝｣繝・す繝･謌ｦ逡･
- 繝・せ繝医せ繧､繝ｼ繝・(Unit/API/E2E)
- i18n蝗ｽ髫帛喧
- OpenTelemetry蛻・淵繝医Ξ繝ｼ繧ｷ繝ｳ繧ｰ
- OpenAPI隧ｳ邏ｰ蛹・- README蜀肴ｧ狗ｯ・- MIT繝ｩ繧､繧ｻ繝ｳ繧ｹ遒ｺ隱・
繝励Ο繧ｸ繧ｧ繧ｯ繝医・譛ｬ逡ｪ迺ｰ蠅・↓繝・・繝ｭ繧､蜿ｯ閭ｽ縺ｪ迥ｶ諷九〒縺呻ｼ・
