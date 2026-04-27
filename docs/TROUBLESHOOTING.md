# 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繧ｬ繧､繝・- Elysia AI

## 繧ｵ繝ｼ繝舌・襍ｷ蜍輔お繝ｩ繝ｼ

### 繝昴・繝・3000 縺梧里縺ｫ菴ｿ逕ｨ荳ｭ

```
EADDRINUSE: Failed to start server. Is port 3000 in use?
```

**隗｣豎ｺ遲・*:

#### Windows PowerShell

```powershell
# Bun 繝励Ο繧ｻ繧ｹ蛛懈ｭ｢
Get-Process bun | Stop-Process -Force

# 繝昴・繝井ｽｿ逕ｨ迥ｶ豕∫｢ｺ隱・netstat -ano | findstr ":3000"

# 繝励Ο繧ｻ繧ｹ ID 縺九ｉ蠑ｷ蛻ｶ邨ゆｺ・Stop-Process -Id <PID> -Force
```

#### Linux/macOS

```bash
# 繝昴・繝井ｽｿ逕ｨ迥ｶ豕∫｢ｺ隱・lsof -i :3000

# 繝励Ο繧ｻ繧ｹ邨ゆｺ・kill -9 <PID>
```

---

### 繝・・繧ｿ繝吶・繧ｹ謗･邯壹お繝ｩ繝ｼ

```
笞�・・Prisma database not configured, using in-memory fallback
```

**蜴溷屏**: Prisma 險ｭ螳壻ｸ崎ｶｳ縺ｾ縺溘・繝・・繧ｿ繝吶・繧ｹ繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ譛ｪ螳溯｡・
**隗｣豎ｺ遲・*:

1. `.env` 縺ｫ `DATABASE_URL` 繧定ｨｭ螳夲ｼ・
```env
DATABASE_URL="file:./prisma/dev.db"
```

2. Prisma 繧ｯ繝ｩ繧､繧｢繝ｳ繝育函謌撰ｼ・
```bash
bunx prisma generate
```

3. 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ螳溯｡鯉ｼ・
```bash
bunx prisma migrate dev --name init
```

---

### Health Check 繧ｨ繝ｩ繝ｼ

```
Health check failed: database { failures: 1, error: "Check returned false" }
Health check failed: disk_space { failures: 1, error: "Check returned false" }
```

**蜴溷屏**: 繝・・繧ｿ繝吶・繧ｹ譛ｪ蛻晄悄蛹悶∪縺溘・繝・ぅ繧ｹ繧ｯ螳ｹ驥丈ｸ崎ｶｳ

**隗｣豎ｺ遲・*:

- 繝・・繧ｿ繝吶・繧ｹ繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ螳溯｡・- 繝・ぅ繧ｹ繧ｯ螳ｹ驥冗｢ｺ隱・- 繝ｭ繝ｼ繝峨＠縺吶℃縺溘Ο繧ｰ繝輔ぃ繧､繝ｫ繧貞炎髯､・啻rm logs/*.log`

---

## FastAPI 謗･邯壹お繝ｩ繝ｼ

### FastAPI 繧ｵ繝ｼ繝舌・縺悟ｿ懃ｭ斐＠縺ｪ縺・
```
Error: connect ECONNREFUSED 127.0.0.1:8000
```

**隗｣豎ｺ遲・*:

1. FastAPI 縺瑚ｵｷ蜍輔＠縺ｦ縺・ｋ縺狗｢ｺ隱搾ｼ・
```powershell
Get-Process python -ErrorAction SilentlyContinue

# 襍ｷ蜍輔＆繧後※縺・↑縺・�ｴ蜷・python python/fastapi_server.py
```

2. Python 萓晏ｭ倬未菫ら｢ｺ隱搾ｼ・
```bash
python -m pip install -r python/requirements.txt
```

3. FastAPI 繝倥Ν繧ｹ繝√ぉ繝・け・・
```bash
Invoke-WebRequest -Uri "http://localhost:8000/health"
```

---

## Ollama 謗･邯壹お繝ｩ繝ｼ

### Ollama 繧ｵ繝ｼ繝舌・縺悟ｿ懃ｭ斐＠縺ｪ縺・
```
Error: Failed to connect to Ollama at http://localhost:11434
```

**隗｣豎ｺ遲・*:

1. Ollama 縺瑚ｵｷ蜍輔＠縺ｦ縺・ｋ縺狗｢ｺ隱搾ｼ・
```bash
ollama list
ollama serve
```

2. 繝｢繝・Ν遒ｺ隱搾ｼ・
```bash
curl http://localhost:11434/api/tags
```

3. 繝・せ繝亥ｮ溯｡鯉ｼ・
```bash
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2","messages":[{"role":"user","content":"hi"}]}'
```

---

## Redis 謗･邯壹お繝ｩ繝ｼ

### Redis 縺ｫ謗･邯壹〒縺阪↑縺・
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**隗｣豎ｺ遲・*:

#### Docker 縺ｧ Redis 襍ｷ蜍・
```bash
docker run -d --name redis -p 6379:6379 redis:alpine

# 遒ｺ隱・docker ps | findstr redis

# 蛛懈ｭ｢
docker stop redis
docker rm redis
```

#### Redis 辟｡蜉ｹ蛹厄ｼ医Ξ繝ｼ繝亥宛髯舌′荳崎ｦ√↑蝣ｴ蜷茨ｼ・
```env
REDIS_ENABLED=false
```

---

## TypeScript 繧ｳ繝ｳ繝代う繝ｫ繧ｨ繝ｩ繝ｼ

### `tsconfig.json` 繧ｨ繝ｩ繝ｼ

```
TS18002: The 'files' list in config file 'tsconfig.json' is empty.
```

**隗｣豎ｺ遲・*:

1. `tsconfig.json` 縺ｫ `include` 繝輔ぅ繝ｼ繝ｫ繝峨′縺ゅｋ縺薙→繧堤｢ｺ隱搾ｼ・
```json
{
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

2. Webpack 險ｭ螳壹〒繧ｳ繝ｳ繝輔ぅ繧ｰ繝輔ぃ繧､繝ｫ繧呈欠螳夲ｼ・
```javascript
options: {
  configFile: path.resolve(__dirname, "tsconfig.json"),
  transpileOnly: true,
}
```

---

### 蝙九メ繧ｧ繝・け繧ｨ繝ｩ繝ｼ

```
error TS2322: Type 'X' is not assignable to type 'Y'
```

**隗｣豎ｺ遲・*:

1. 蜴ｳ蟇・Δ繝ｼ繝峨ｒ遒ｺ隱搾ｼ・
```bash
bun run lint
```

2. 蝙句ｮ夂ｾｩ繧偵メ繧ｧ繝・け・・
```bash
bun run build
```

3. 蠢・ｦ√↓蠢懊§縺ｦ `// @ts-ignore` 繧ｳ繝｡繝ｳ繝医ｒ菴ｿ逕ｨ・井ｸ�譎ら噪・・
---

## 繝・せ繝亥ｮ溯｡後お繝ｩ繝ｼ

### 繝・せ繝亥､ｱ謨・
```
笶・All tests failed
```

**隗｣豎ｺ遲・*:

```bash
# 縺吶∋縺ｦ縺ｮ繝・せ繝亥ｮ溯｡・bun test

# 迚ｹ螳壹・繝・せ繝亥ｮ溯｡・bun test src/lib/__tests__/database.test.ts

# 繧ｦ繧ｩ繝・メ繝｢繝ｼ繝・bun test --watch
```

---

## 繝薙Ν繝峨お繝ｩ繝ｼ

### Webpack 繧ｳ繝ｳ繝代う繝ｫ螟ｱ謨・
```
ERROR in main
Module not found: Error: Can't resolve
```

**隗｣豎ｺ遲・*:

1. 繧ｨ繝ｳ繝医Μ繝ｼ繝昴う繝ｳ繝育｢ｺ隱搾ｼ・
```javascript
entry: path.resolve(__dirname, "../../src", "index.ts");
```

2. 繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢・・
```bash
bun run clean
bun install
bun run build
```

---

## 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ蝠城｡・
### 繝｡繝｢繝ｪ菴ｿ逕ｨ驥上′螟壹＞

**隗｣豎ｺ遲・*:

1. 繝ｭ繧ｰ繝ｬ繝吶Ν隱ｿ謨ｴ・・
```env
LOG_LEVEL=info
```

2. 繝偵・繝励し繧､繧ｺ險ｭ螳夲ｼ・
```bash
bun --max-old-space-size=2048 run src/index.ts
```

3. 繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢・・
```bash
bun run clean
```

---

### 繝ｬ繧ｹ繝昴Φ繧ｹ譎る俣縺碁≦縺・
**隗｣豎ｺ遲・*:

1. Redis 繧ｭ繝｣繝・す繝･譛牙柑蛹・2. 荳崎ｦ√↑繝倥Ν繧ｹ繝√ぉ繝・け辟｡蜉ｹ蛹・3. 繝ｭ繧ｰ繝ｬ繝吶Ν菴惹ｸ具ｼ啻LOG_LEVEL=warn`

---

## 繝阪ャ繝医Ρ繝ｼ繧ｯ蝠城｡・
### CORS 繧ｨ繝ｩ繝ｼ

```
Access to XMLHttpRequest blocked by CORS policy
```

**隗｣豎ｺ遲・*:

`.env` 縺ｧ險ｱ蜿ｯ繧ｪ繝ｪ繧ｸ繝ｳ險ｭ螳夲ｼ・
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

縺ｾ縺溘・ `src/index.ts` 縺ｧ險ｭ螳夲ｼ・
```typescript
cors({
  origin: process.env.ALLOWED_ORIGINS?.split(","),
});
```

---

## 繝ｭ繧ｰ遒ｺ隱・
### 繝ｭ繧ｰ繝輔ぃ繧､繝ｫ縺ｮ蝣ｴ謇�

```
logs/
笏懌楳笏� app.log          # 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繝ｭ繧ｰ
笏懌楳笏� error.log        # 繧ｨ繝ｩ繝ｼ繝ｭ繧ｰ
笏披楳笏� audit/           # 逶｣譟ｻ繝ｭ繧ｰ
```

### 繝ｭ繧ｰ遒ｺ隱・
```powershell
# 譛�譁ｰ縺ｮ繧ｨ繝ｩ繝ｼ繝ｭ繧ｰ
Get-Content logs/error.log | Select-Object -Last 50

# 繝ｪ繧｢繝ｫ繧ｿ繧､繝�繝ｭ繧ｰ
Get-Content logs/app.log -Wait

# 迚ｹ螳壹・繝代ち繝ｼ繝ｳ縺ｧ讀懃ｴ｢
Get-Content logs/app.log | Select-String "ERROR"
```

---

## 繝・ヰ繝・げ繝｢繝ｼ繝・
### 繝・ヰ繝・げ繝ｭ繧ｰ譛牙柑蛹・
```env
DEBUG=true
LOG_LEVEL=debug
NODE_ENV=development
SOURCE_MAPS=true
```

### 繝・ヰ繝・ぎ繝ｼ謗･邯・
```bash
bun run --inspect src/index.ts
```

---

## 繧ｵ繝昴・繝・
蝠城｡後′隗｣豎ｺ縺励↑縺・�ｴ蜷・

1. 繝ｭ繧ｰ繧堤｢ｺ隱・ `logs/error.log`
2. GitHub Issues 縺ｧ讀懃ｴ｢: https://github.com/Elysia20220909/ElysiaAI/issues
3. 迺ｰ蠅・ュ蝣ｱ繧定ｨ倬鹸:
   - Bun 繝舌・繧ｸ繝ｧ繝ｳ: `bun --version`
   - Node.js 繝舌・繧ｸ繝ｧ繝ｳ: `node --version`
   - OS: `$PSVersionTable.OS`

---

**譛�邨よ峩譁ｰ**: 2025蟷ｴ12譛・譌･
