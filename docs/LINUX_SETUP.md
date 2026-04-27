# Linux/macOS/WSL Setup Guide

縺薙・繧ｬ繧､繝峨〒縺ｯ縲・lysia AI繧鱈inux/macOS/WSL迺ｰ蠅・〒繧ｻ繝・ヨ繧｢繝・・縺吶ｋ謇矩�・ｒ隱ｬ譏弱＠縺ｾ縺吶�・
## 繧ｷ繧ｹ繝・Β隕∽ｻｶ

- **OS**: Ubuntu 22.04+ / Debian 12+ / macOS 12+ / WSL2 (Ubuntu)
- **Bun**: 1.0+ ([繧､繝ｳ繧ｹ繝医・繝ｫ](https://bun.sh/install))
- **Python**: 3.10+
- **Node.js**: 荳崎ｦ・ｼ・un縺御ｻ｣譖ｿ・・- **Redis**: 7+ (Docker謗ｨ螂ｨ縲√↑縺上※繧ょ虚菴・
- **Git**: 譛�譁ｰ迚・
## 繧ｯ繧､繝・け繧ｹ繧ｿ繝ｼ繝・
### 1. 繝ｪ繝昴ず繝医Μ繧ｯ繝ｭ繝ｼ繝ｳ

```bash
git clone https://github.com/yourusername/elysia-ai.git
cd elysia-ai
```

### 2. Bun繧､繝ｳ繧ｹ繝医・繝ｫ・域悴繧､繝ｳ繧ｹ繝医・繝ｫ縺ｮ蝣ｴ蜷茨ｼ・
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # 縺ｾ縺溘・ source ~/.zshrc
```

### 3. 萓晏ｭ倥う繝ｳ繧ｹ繝医・繝ｫ

```bash
# JavaScript/TypeScript dependencies
bun install

# Python environment
./scripts/setup-python.sh
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. 迺ｰ蠅・､画焚險ｭ螳・
```bash
cp .env.example .env
nano .env  # 縺ｾ縺溘・縺雁･ｽ縺ｿ縺ｮ繧ｨ繝・ぅ繧ｿ
```

**譛�菴朱剞蠢・ｦ√↑險ｭ螳・**

```bash
# JWT Secrets・亥ｿ・★蠑ｷ蝗ｺ縺ｪ蛟､縺ｫ螟画峩・・ｼ・JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# 隱崎ｨｼ諠・�ｱ
AUTH_USERNAME=elysia
AUTH_PASSWORD=$(openssl rand -base64 24)
```

### 5. Redis襍ｷ蜍包ｼ・ocker菴ｿ逕ｨ・・
```bash
# Docker縺後う繝ｳ繧ｹ繝医・繝ｫ貂医∩縺ｮ蝣ｴ蜷・docker run -d --name elysia-redis -p 6379:6379 redis:7-alpine

# Docker縺後↑縺・�ｴ蜷医・繧ｹ繧ｭ繝・・蜿ｯ閭ｽ・医う繝ｳ繝｡繝｢繝ｪ繝ｬ繝ｼ繝亥宛髯舌↓繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ・・```

### 6. 繧ｵ繝ｼ繝舌・襍ｷ蜍・
**髢狗匱迺ｰ蠅・ｼ域耳螂ｨ・・**

```bash
# 蜈ｨ繧ｵ繝ｼ繝薙せ繧剃ｸ�諡ｬ襍ｷ蜍包ｼ・astAPI + Elysia・・./scripts/dev.sh

# Ctrl+C 縺ｧ蜈ｨ繧ｵ繝ｼ繝薙せ蛛懈ｭ｢
```

**蛟句挨襍ｷ蜍・**

```bash
# 繧ｿ繝ｼ繝溘リ繝ｫ1: FastAPI RAG Server
./scripts/start-fastapi.sh

# 繧ｿ繝ｼ繝溘リ繝ｫ2: Elysia Server
bun run src/index.ts
```

### 7. 繝悶Λ繧ｦ繧ｶ縺ｧ繧｢繧ｯ繧ｻ繧ｹ

```bash
# 繝悶Λ繧ｦ繧ｶ繧帝幕縺・xdg-open http://localhost:3000  # Linux
open http://localhost:3000      # macOS
```

## WSL2迚ｹ譛峨・險ｭ螳・
### Windows繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ險ｭ螳・
WSL2縺九ｉWindows繝帙せ繝医・繝悶Λ繧ｦ繧ｶ縺ｧ繧｢繧ｯ繧ｻ繧ｹ縺吶ｋ蝣ｴ蜷・

```powershell
# PowerShell縺ｧ螳溯｡鯉ｼ育ｮ｡逅・�・ｨｩ髯撰ｼ・New-NetFirewallRule -DisplayName "WSL Elysia AI" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000,8000
```

### WSL2 IP遒ｺ隱・
```bash
# WSL2縺ｮIP繧｢繝峨Ξ繧ｹ遒ｺ隱・ip addr show eth0 | grep inet | awk '{print $2}' | cut -d/ -f1

# Windows繝帙せ繝亥錐縺ｧ繧｢繧ｯ繧ｻ繧ｹ縺吶ｋ蝣ｴ蜷・# /etc/hosts 縺ｫ霑ｽ蜉�
echo "$(ip route | awk '/default/ {print $3}') windowshost" | sudo tee -a /etc/hosts
```

## macOS迚ｹ譛峨・險ｭ螳・
### Homebrew繧､繝ｳ繧ｹ繝医・繝ｫ・域悴繧､繝ｳ繧ｹ繝医・繝ｫ縺ｮ蝣ｴ蜷茨ｼ・
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Redis・・omebrew邨檎罰・・
```bash
brew install redis
brew services start redis
```

## 繧ｹ繧ｯ繝ｪ繝励ヨ荳�隕ｧ

| 繧ｹ繧ｯ繝ｪ繝励ヨ                       | 隱ｬ譏・                      |
| -------------------------------- | -------------------------- |
| `./scripts/setup-python.sh`      | Python迺ｰ蠅・そ繝・ヨ繧｢繝・・     |
| `./scripts/start-server.sh`      | Elysia繧ｵ繝ｼ繝舌・襍ｷ蜍・        |
| `./scripts/start-fastapi.sh`     | FastAPI RAG襍ｷ蜍・           |
| `./scripts/start-network-sim.sh` | Network Simulation API襍ｷ蜍・|
| `./scripts/dev.sh`               | 蜈ｨ繧ｵ繝ｼ繝薙せ荳�諡ｬ襍ｷ蜍・        |
| `./scripts/rotate-jsonl.sh`      | JSONL繝ｭ繧ｰ繝ｭ繝ｼ繝・・繧ｷ繝ｧ繝ｳ    |

## 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### Bun螳溯｡梧凾縺ｫ "command not found"

```bash
# Bun縺ｮ繝代せ繧堤｢ｺ隱・echo $PATH | grep -q "$HOME/.bun/bin" || echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Python venv菴懈・螟ｱ謨・
```bash
# Ubuntu/Debian
sudo apt install python3-venv python3-pip

# macOS
brew install python@3.10
```

### 繝昴・繝・000縺御ｽｿ逕ｨ荳ｭ

```bash
# 菴ｿ逕ｨ荳ｭ縺ｮ繝励Ο繧ｻ繧ｹ遒ｺ隱・lsof -ti:3000

# 繝励Ο繧ｻ繧ｹ邨ゆｺ・kill -9 $(lsof -ti:3000)

# 縺ｾ縺溘・蛻･繝昴・繝井ｽｿ逕ｨ
PORT=3001 bun run src/index.ts
```

### Redis謗･邯壹お繝ｩ繝ｼ

```bash
# Redis遞ｼ蜒咲｢ｺ隱・redis-cli ping  # PONG 縺瑚ｿ斐ｌ縺ｰOK

# Docker繧ｳ繝ｳ繝・リ遒ｺ隱・docker ps | grep redis

# 繧ｳ繝ｳ繝・リ蜀崎ｵｷ蜍・docker restart elysia-redis
```

### FastAPI襍ｷ蜍募､ｱ謨・
```bash
# Python venv譛牙柑蛹也｢ｺ隱・which python  # .venv/bin/python 縺瑚｡ｨ遉ｺ縺輔ｌ繧九°・・
# 萓晏ｭ伜・繧､繝ｳ繧ｹ繝医・繝ｫ
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ繝√Η繝ｼ繝九Φ繧ｰ

### Bun譛�驕ｩ蛹・
```bash
# .env 縺ｫ霑ｽ蜉�
BUN_RUNTIME_TRANSPILER_CACHE_PATH=/tmp/bun-cache
BUN_FEATURE_FLAG_BUNDLER_WATCH=1
```

### Redis豌ｸ邯壼喧・域悽逡ｪ迺ｰ蠅・ｼ・
```bash
docker run -d \
  --name elysia-redis \
  --restart unless-stopped \
  -p 127.0.0.1:6379:6379 \
  -v redis-data:/data \
  redis:7-alpine redis-server --appendonly yes
```

### 繧ｷ繧ｹ繝・Β繝ｪ繧ｽ繝ｼ繧ｹ蛻ｶ髯・
```bash
# Linux縺ｮ繝輔ぃ繧､繝ｫ繝・ぅ繧ｹ繧ｯ繝ｪ繝励ち蛻ｶ髯千ｷｩ蜥・ulimit -n 65536

# 豌ｸ邯壼喧: /etc/security/limits.conf 縺ｫ霑ｽ蜉�
* soft nofile 65536
* hard nofile 65536
```

## 繧ｻ繧ｭ繝･繝ｪ繝・ぅ謗ｨ螂ｨ莠矩�・
1. **JWT_SECRET/JWT_REFRESH_SECRET繧堤ｵｶ蟇ｾ縺ｫ螟画峩**

   ```bash
   # 32繝舌う繝井ｻ･荳翫・繝ｩ繝ｳ繝�繝�蛟､
   openssl rand -hex 32
   ```

2. **AUTH_PASSWORD繧貞ｼｷ蝗ｺ縺ｫ**

   ```bash
   # 24譁・ｭ嶺ｻ･荳頑耳螂ｨ
   openssl rand -base64 24
   ```

3. **Redis繧貞､夜Κ蜈ｬ髢九＠縺ｪ縺・*

   ```bash
   # 127.0.0.1縺ｮ縺ｿ繝舌う繝ｳ繝会ｼ・ocker縺ｮ蝣ｴ蜷医・ -p 127.0.0.1:6379:6379・・   ```

4. **譛ｬ逡ｪ迺ｰ蠅・〒縺ｯTLS蠢・�・*
   - Nginx + Let's Encrypt菴ｿ逕ｨ
   - `DEPLOYMENT.md` 蜿ら・

## SSH繝上・繝峨ル繝ｳ繧ｰ・域耳螂ｨ・・
骰ｵ隱崎ｨｼ縺ｸ蛻・崛縺医�√ヱ繧ｹ繝ｯ繝ｼ繝峨Ο繧ｰ繧､繝ｳ繧堤┌蜉ｹ蛹悶＠縺ｾ縺吶�・
```bash
# 繧ｵ繝ｼ繝舌・・・oot・峨〒螳溯｡・sudo bash ./scripts/ssh-setup.sh elysia

# 繧ｯ繝ｩ繧､繧｢繝ｳ繝茨ｼ・SL/Linux/macOS・峨〒骰ｵ逕滓・
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/elysia_ai -C "elysia-ai"
cat ~/.ssh/elysia_ai.pub  # 蜃ｺ蜉帙ｒ繧ｵ繝ｼ繝舌・縺ｮ繝励Ο繝ｳ繝励ヨ縺ｸ雋ｼ繧贋ｻ倥￠

# 謗･邯壹ユ繧ｹ繝・ssh -i ~/.ssh/elysia_ai elysia@<server-ip>
```

`ssh-setup.sh` 縺ｯ谺｡繧定ｨｭ螳壹＠縺ｾ縺・

- `PermitRootLogin prohibit-password`
- `PasswordAuthentication no`
- `PubkeyAuthentication yes`
- `AllowUsers elysia`
- `MaxAuthTries 3`, `ClientAliveInterval 300`

霑ｽ蜉�蟇ｾ遲厄ｼ井ｻｻ諢擾ｼ・

- `fail2ban` 縺ｮ蟆主・
- `Port 22` 螟画峩縺ｨ `ufw` 縺ｧ迚ｹ螳唔P縺ｮ縺ｿ險ｱ蜿ｯ
- `/etc/ssh/sshd_config` 縺ｧ `KbdInteractiveAuthentication no`

## 谺｡縺ｮ繧ｹ繝・ャ繝・
- **譛ｬ逡ｪ繝・・繝ｭ繧､**: `DEPLOYMENT.md` 繧貞盾辣ｧ
- **繧ｻ繧ｭ繝･繝ｪ繝・ぅ蠑ｷ蛹・*: `docs/SECURITY.md` 繧貞盾辣ｧ
- **API菴ｿ逕ｨ譁ｹ豕・*: `README.md` 縺ｮAPI讎りｦ√そ繧ｯ繧ｷ繝ｧ繝ｳ
- **髻ｳ螢ｰ讖溯・**: `docs/VOICEVOX_SETUP.md` 繧貞盾辣ｧ

## 繧ｵ繝昴・繝・
蝠城｡後′逋ｺ逕溘＠縺溷�ｴ蜷・

1. 繧ｨ繝ｩ繝ｼ繝ｭ繧ｰ遒ｺ隱・ `journalctl -u elysia-server -f`
2. Redis迥ｶ諷狗｢ｺ隱・ `redis-cli ping`
3. 繝昴・繝育｢ｺ隱・ `lsof -i:3000` / `lsof -i:8000`
4. GitHub Issues: 隧ｳ邏ｰ繧呈ｷｻ縺医※蝣ｱ蜻・
---

**謗ｨ螂ｨ**: 譛ｬ逡ｪ迺ｰ蠅・・髢狗匱迺ｰ蠅・→繧ゅ↓Linux/macOS/WSL縺ｮ菴ｿ逕ｨ繧貞ｼｷ縺乗耳螂ｨ縺励∪縺吶�８indows PowerShell縺ｯ譁・ｭ励お繝ｳ繧ｳ繝ｼ繝・ぅ繝ｳ繧ｰ縺ｮ蝠城｡後′逋ｺ逕溘☆繧句�ｴ蜷医′縺ゅｊ縺ｾ縺吶�・
