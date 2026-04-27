# 噫 繧ｵ繝ｼ繝薙せ襍ｷ蜍輔ぎ繧､繝・
縺薙・繧ｬ繧､繝峨〒縺ｯ縲・lysia AI縺ｮ蜈ｨ讖溯・繧呈怏蜉ｹ蛹悶☆繧九◆繧√・3縺､縺ｮ繧ｵ繝ｼ繝薙せ縺ｮ襍ｷ蜍墓婿豕輔ｒ隱ｬ譏弱＠縺ｾ縺吶�・
---

## 搭 蠢・ｦ√↑繧ｵ繝ｼ繝薙せ

| 繧ｵ繝ｼ繝薙せ    | 繝昴・繝・| 讖溯・                     | 蠢・�亥ｺｦ       |
| ----------- | ------ | ------------------------ | ------------ |
| **Redis**   | 6379   | 繝ｬ繝ｼ繝亥宛髯舌�√く繝｣繝・す繝ｳ繧ｰ | 繧ｪ繝励す繝ｧ繝翫Ν |
| **Ollama**  | 11434  | LLM謗ｨ隲悶お繝ｳ繧ｸ繝ｳ          | 謗ｨ螂ｨ         |
| **FastAPI** | 8000   | RAG (讀懃ｴ｢諡｡蠑ｵ逕滓・)       | 繧ｪ繝励す繝ｧ繝翫Ν |

**豕ｨ諢・*: 縺薙ｌ繧峨・繧ｵ繝ｼ繝薙せ縺後↑縺上※繧・lysia繧ｵ繝ｼ繝舌・縺ｯ蜍穂ｽ懊＠縺ｾ縺吶′縲∽ｸ�驛ｨ讖溯・縺悟宛髯舌＆繧後∪縺吶�・
---

## 肌 繧､繝ｳ繧ｹ繝医・繝ｫ縺ｨ襍ｷ蜍墓婿豕・
### 譁ｹ豕・: 閾ｪ蜍戊ｵｷ蜍輔せ繧ｯ繝ｪ繝励ヨ (謗ｨ螂ｨ)

```powershell
# 蜈ｨ繧ｵ繝ｼ繝薙せ繧剃ｸ�諡ｬ襍ｷ蜍・.\scripts\start-all-services.ps1 -All

# 縺ｾ縺溘・蛟句挨縺ｫ襍ｷ蜍・.\scripts\start-all-services.ps1 -Redis
.\scripts\start-all-services.ps1 -Ollama
.\scripts\start-all-services.ps1 -FastAPI
```

### 譁ｹ豕・: Docker Compose (隕．ocker)

```powershell
# Docker縺後う繝ｳ繧ｹ繝医・繝ｫ縺輔ｌ縺ｦ縺・ｋ蝣ｴ蜷・docker compose -f config/docker/docker-compose.yml up -d

# 迚ｹ螳壹・繧ｵ繝ｼ繝薙せ縺ｮ縺ｿ襍ｷ蜍・docker compose -f config/docker/docker-compose.yml up -d redis ollama fastapi
```

### 譁ｹ豕・: 謇句虚襍ｷ蜍・
---

## 1・鞘Ε Redis - 繝ｬ繝ｼ繝亥宛髯舌→繧ｭ繝｣繝・す繝ｳ繧ｰ

### 繧､繝ｳ繧ｹ繝医・繝ｫ

**Windows (WSL2謗ｨ螂ｨ)**:

```powershell
# WSL2繧剃ｽｿ逕ｨ
wsl sudo apt-get update
wsl sudo apt-get install redis-server
```

**Windows (繝阪う繝・ぅ繝・**:

1. [Redis for Windows](https://github.com/microsoftarchive/redis/releases) 縺九ｉ繝�繧ｦ繝ｳ繝ｭ繝ｼ繝・2. `redis-server.exe` 繧貞ｮ溯｡・
**macOS/Linux**:

```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server

# CentOS/RHEL
sudo yum install redis
```

### 襍ｷ蜍・
```powershell
# Windows (WSL2)
wsl sudo service redis-server start

# Windows (繝阪う繝・ぅ繝・
redis-server

# macOS/Linux
redis-server
# 縺ｾ縺溘・繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝牙ｮ溯｡・redis-server --daemonize yes
```

### 蜍穂ｽ懃｢ｺ隱・
```powershell
# 謗･邯壹ユ繧ｹ繝・redis-cli ping
# 譛溷ｾ・＆繧後ｋ蜃ｺ蜉・ PONG

# 縺ｾ縺溘・
curl http://localhost:6379
```

### 迺ｰ蠅・､画焚險ｭ螳・(.env)

```env
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

### 譛牙柑蛹悶＆繧後ｋ讖溯・

笨・**繝ｬ繝ｼ繝亥宛髯・*: 繝ｦ繝ｼ繧ｶ繝ｼ縺斐→縺ｫ60繝ｪ繧ｯ繧ｨ繧ｹ繝・蛻・ 
笨・**繧ｻ繝・す繝ｧ繝ｳ邂｡逅・*: 鬮倬�溘↑繧ｻ繝・す繝ｧ繝ｳ繧ｹ繝医Ξ繝ｼ繧ｸ  
笨・**繧ｭ繝｣繝・す繝ｳ繧ｰ**: API蠢懃ｭ斐・鬮倬�溷喧

---

## 2・鞘Ε Ollama - LLM謗ｨ隲悶お繝ｳ繧ｸ繝ｳ

### 繧､繝ｳ繧ｹ繝医・繝ｫ

**Windows/macOS/Linux**:

1. [Ollama蜈ｬ蠑上し繧､繝・(https://ollama.ai/download) 縺九ｉ繝�繧ｦ繝ｳ繝ｭ繝ｼ繝・2. 繧､繝ｳ繧ｹ繝医・繝ｩ繝ｼ繧貞ｮ溯｡・
**繧ｳ繝槭Φ繝峨Λ繧､繝ｳ (Linux)**:

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 繝｢繝・Ν縺ｮ繝�繧ｦ繝ｳ繝ｭ繝ｼ繝・
```powershell
# 謗ｨ螂ｨ繝｢繝・Ν (7B - 繝舌Λ繝ｳ繧ｹ蝙・
ollama pull llama3.2

# 鬮俶�ｧ閭ｽ繝｢繝・Ν (70B - 鬮倡ｲｾ蠎ｦ縲∬ｦ；PU)
ollama pull llama3.2:70b

# 霆ｽ驥上Δ繝・Ν (3B - 鬮倬�溘�∽ｽ弱せ繝壹ャ繧ｯPC蜷代￠)
ollama pull llama3.2:3b

# 譌･譛ｬ隱樒音蛹悶Δ繝・Ν
ollama pull elyza:jp-llama2
```

### 襍ｷ蜍・
```powershell
# 繧ｵ繝ｼ繝薙せ縺ｨ縺励※襍ｷ蜍・(閾ｪ蜍慕噪縺ｫ襍ｷ蜍輔☆繧九％縺ｨ縺悟､壹＞)
ollama serve

# 繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝牙ｮ溯｡・Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
```

### 蜍穂ｽ懃｢ｺ隱・
```powershell
# 繝｢繝・Ν荳�隕ｧ陦ｨ遉ｺ
ollama list

# 繝・せ繝亥ｮ溯｡・ollama run llama3.2 "Hello, how are you?"

# API繝・せ繝・curl http://localhost:11434/api/tags
```

### 迺ｰ蠅・､画焚險ｭ螳・(.env)

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### 譛牙柑蛹悶＆繧後ｋ讖溯・

笨・**AI繝√Ε繝・ヨ**: 繧ｨ繝ｪ繧ｷ繧｢AI縺ｨ縺ｮ閾ｪ辟ｶ縺ｪ莨夊ｩｱ  
笨・**繧ｳ繝ｳ繝・く繧ｹ繝育炊隗｣**: 莨夊ｩｱ螻･豁ｴ繧定�・・縺励◆蠢懃ｭ・ 
笨・**繧ｹ繝医Μ繝ｼ繝溘Φ繧ｰ**: 繝ｪ繧｢繝ｫ繧ｿ繧､繝�縺ｪ蠢懃ｭ碑｡ｨ遉ｺ  
笨・**螟夊ｨ�隱槫ｯｾ蠢・*: 譌･譛ｬ隱槭・闍ｱ隱槭・縺昴・莉冶ｨ�隱・
---

## 3・鞘Ε FastAPI - RAG (讀懃ｴ｢諡｡蠑ｵ逕滓・)

### 蜑肴署譚｡莉ｶ

Python 3.11莉･髯阪′繧､繝ｳ繧ｹ繝医・繝ｫ縺輔ｌ縺ｦ縺・ｋ縺薙→:

```powershell
python --version
# Python 3.11.0 莉･荳・```

### 繧､繝ｳ繧ｹ繝医・繝ｫ

```powershell
# 萓晏ｭ倬未菫ゅ・繧､繝ｳ繧ｹ繝医・繝ｫ
cd python
pip install -r requirements.txt

# 縺ｾ縺溘・莉ｮ諠ｳ迺ｰ蠅・ｒ菴ｿ逕ｨ (謗ｨ螂ｨ)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 襍ｷ蜍・
```powershell
# 繧ｹ繧ｯ繝ｪ繝励ヨ縺九ｉ襍ｷ蜍・(謗ｨ螂ｨ)
.\scripts\start-fastapi.ps1

# 縺ｾ縺溘・逶ｴ謗･螳溯｡・python python/fastapi_server.py

# 髢狗匱繝｢繝ｼ繝・(繝帙ャ繝医Μ繝ｭ繝ｼ繝・
uvicorn fastapi_server:app --reload --host 0.0.0.0 --port 8000
```

### 蜍穂ｽ懃｢ｺ隱・
```powershell
# 繝倥Ν繧ｹ繝√ぉ繝・け
curl http://localhost:8000/health

# API莉墓ｧ倡｢ｺ隱・start http://localhost:8000/docs
```

### 迺ｰ蠅・､画焚險ｭ螳・(.env)

```env
FASTAPI_BASE_URL=http://localhost:8000
RAG_ENABLED=true
```

### 譛牙柑蛹悶＆繧後ｋ讖溯・

笨・**RAG讀懃ｴ｢**: 遏･隴倥・繝ｼ繧ｹ縺九ｉ縺ｮ諠・�ｱ讀懃ｴ｢  
笨・**繝吶け繝医Ν讀懃ｴ｢**: 繧ｻ繝槭Φ繝・ぅ繝・け讀懃ｴ｢  
笨・**繝峨く繝･繝｡繝ｳ繝亥・逅・*: PDF/繝・く繧ｹ繝医ヵ繧｡繧､繝ｫ縺ｮ隗｣譫・ 
笨・**遏･隴倡ｮ｡逅・*: 蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮ霑ｽ蜉�繝ｻ譖ｴ譁ｰ

---

## 剥 繧ｵ繝ｼ繝薙せ迥ｶ諷九・遒ｺ隱・
### PowerShell縺ｧ遒ｺ隱・
```powershell
# Redis繝励Ο繧ｻ繧ｹ遒ｺ隱・Get-Process redis-server -ErrorAction SilentlyContinue

# Ollama繝励Ο繧ｻ繧ｹ遒ｺ隱・Get-Process ollama -ErrorAction SilentlyContinue

# FastAPI繝昴・繝育｢ｺ隱・Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

# 縺ｾ縺溘・荳�諡ｬ遒ｺ隱阪せ繧ｯ繝ｪ繝励ヨ
.\scripts\check-services.ps1
```

### 繝悶Λ繧ｦ繧ｶ縺ｧ遒ｺ隱・
- **Ollama**: http://localhost:11434/api/tags
- **FastAPI**: http://localhost:8000/docs
- **Redis**: `redis-cli ping` (CLI縺ｮ縺ｿ)

---

## 噫 Elysia繧ｵ繝ｼ繝舌・縺ｮ襍ｷ蜍・
蜈ｨ繧ｵ繝ｼ繝薙せ縺瑚ｵｷ蜍輔＠縺溘ｉ縲・lysia繧ｵ繝ｼ繝舌・繧定ｵｷ蜍輔＠縺ｾ縺・

```powershell
# 髢狗匱繝｢繝ｼ繝・bun run dev

# 縺ｾ縺溘・
npm run dev
```

繧｢繧ｯ繧ｻ繧ｹ蜈・

- **繝｡繧､繝ｳ繧｢繝励Μ**: http://localhost:3000
- **邂｡逅・判髱｢**: http://localhost:3000/admin-extended.html
- **Swagger API**: http://localhost:3000/swagger

---

## 尅 繧ｵ繝ｼ繝薙せ縺ｮ蛛懈ｭ｢

### 蛟句挨蛛懈ｭ｢

```powershell
# Redis
Stop-Process -Name redis-server -Force

# Ollama
Stop-Process -Name ollama -Force

# FastAPI
Stop-Process -Name python -Force | Where-Object { $_.CommandLine -like "*fastapi*" }
```

### Docker Compose縺ｧ蛛懈ｭ｢

```powershell
docker compose -f config/docker/docker-compose.yml down
```

---

## 肌 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### 繝昴・繝医′譌｢縺ｫ菴ｿ逕ｨ縺輔ｌ縺ｦ縺・ｋ

```powershell
# 繝昴・繝井ｽｿ逕ｨ迥ｶ豕∫｢ｺ隱・netstat -ano | findstr "6379"    # Redis
netstat -ano | findstr "11434"   # Ollama
netstat -ano | findstr "8000"    # FastAPI

# 繝励Ο繧ｻ繧ｹ邨ゆｺ・Stop-Process -Id <PID> -Force
```

### 繧ｵ繝ｼ繝薙せ縺瑚ｵｷ蜍輔＠縺ｪ縺・
1. **繝ｭ繧ｰ遒ｺ隱・*:

   ```powershell
   # Elysia繝ｭ繧ｰ
   Get-Content logs/app.log -Tail 50

   # FastAPI繝ｭ繧ｰ
   Get-Content logs/fastapi.log -Tail 50
   ```

2. **萓晏ｭ倬未菫ら｢ｺ隱・*:

   ```powershell
   # Python萓晏ｭ倬未菫・   pip list

   # Bun繝代ャ繧ｱ繝ｼ繧ｸ
   bun install
   ```

3. **迺ｰ蠅・､画焚遒ｺ隱・*:
   ```powershell
   Get-Content .env
   ```

### 繝｡繝｢繝ｪ荳崎ｶｳ

Ollama縺ｮ菴ｿ逕ｨ繝｡繝｢繝ｪ繧貞炎貂・

```powershell
# 霆ｽ驥上Δ繝・Ν縺ｫ螟画峩
ollama pull llama3.2:3b

# .env繧呈峩譁ｰ
OLLAMA_MODEL=llama3.2:3b
```

---

## 投 謗ｨ螂ｨ讒区・

### 譛�蟆乗ｧ区・ (髢狗匱逕ｨ)

```
笨・Elysia Server 縺ｮ縺ｿ
笶・Redis (繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ讖溯・縺ｧ蜍穂ｽ・
笶・Ollama (AI讖溯・縺ｯ辟｡蜉ｹ)
笶・FastAPI (RAG讖溯・縺ｯ辟｡蜉ｹ)
```

### 讓呎ｺ匁ｧ区・ (謗ｨ螂ｨ)

```
笨・Elysia Server
笨・Ollama + llama3.2
笶・Redis (繧ｪ繝励す繝ｧ繝翫Ν)
笶・FastAPI (繧ｪ繝励す繝ｧ繝翫Ν)
```

### 繝輔Ν讒区・ (譛ｬ逡ｪ迺ｰ蠅・

```
笨・Elysia Server
笨・Redis (繝ｬ繝ｼ繝亥宛髯・
笨・Ollama + llama3.2
笨・FastAPI (RAG讖溯・)
```

---

## 識 谺｡縺ｮ繧ｹ繝・ャ繝・
1. 笨・繧ｵ繝ｼ繝薙せ襍ｷ蜍慕｢ｺ隱・2. 笨・Elysia繧ｵ繝ｼ繝舌・襍ｷ蜍・(`bun run dev`)
3. 笨・繝悶Λ繧ｦ繧ｶ縺ｧ繧｢繧ｯ繧ｻ繧ｹ (http://localhost:3000)
4. 笨・AI繝√Ε繝・ヨ繝・せ繝・5. 笨・邂｡逅・判髱｢遒ｺ隱・(http://localhost:3000/admin-extended.html)

---

**菴懈・譌･**: 2025-12-04  
**譛�邨よ峩譁ｰ**: 2025-12-04
