# Elysia AI - Complete Security Setup Guide

## 讎りｦ・(Overview)

縺薙・繧ｬ繧､繝峨・縲・lysiaAI縺ｮ譛ｬ逡ｪ迺ｰ蠅・↓蜷代￠縺溘☆縺ｹ縺ｦ縺ｮ繧ｻ繧ｭ繝･繝ｪ繝・ぅ險ｭ螳壹ｒ螳溯｡後☆繧九◆繧√・繧ゅ・縺ｧ縲∽ｻ･荳九・鬆・岼繧偵き繝舌・縺励※縺・∪縺呻ｼ・
- 笨・繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ險ｭ螳・(UFW)
- 笨・SSH 繧ｻ繧ｭ繝･繝ｪ繝・ぅ蠑ｷ蛹・- 笨・SSL/TLS 險ｼ譏取嶌・・et's Encrypt・・- 笨・閾ｪ蜍輔ヰ繝・け繧｢繝・・
- 笨・繝ｭ繧ｰ逶｣隕・- 笨・萓ｵ蜈･讀懷・繧ｷ繧ｹ繝・Β (Fail2Ban)
- 笨・繧ｻ繧ｭ繝･繝ｪ繝・ぅ逶｣譟ｻ (Lynis, AIDE)

---

## 1. 貅門ｙ菴懈･ｭ

### 繧ｷ繧ｹ繝・Β隕∽ｻｶ

```bash
- Linux (Ubuntu 20.04+ 縺ｾ縺溘・ CentOS 7+)
- Root 繧｢繧ｯ繧ｻ繧ｹ讓ｩ髯・- 繧､繝ｳ繧ｿ繝ｼ繝阪ャ繝域磁邯・- 譛蟆・10GB 繝・ぅ繧ｹ繧ｯ螳ｹ驥擾ｼ医ヰ繝・け繧｢繝・・逕ｨ・・```

### 蜑肴署譚｡莉ｶ縺ｮ遒ｺ隱・
```bash
# SSH 縺ｧ繧ｵ繝ｼ繝舌・縺ｫ繝ｭ繧ｰ繧､繝ｳ
ssh user@your-server-ip

# Root 縺ｫ蛻・ｊ譖ｿ縺・sudo -i

# 繧ｹ繧ｯ繝ｪ繝励ヨ縺ｮ蟄伜惠遒ｺ隱・ls -la /opt/elysia-ai/scripts/

# 繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・# - backup-setup.sh
# - log-monitoring-setup.sh
# - fail2ban-setup.sh
# - security-audit-setup.sh
# - complete-security-setup.sh
# - firewall-setup.sh
# - ssh-security.sh
# - ssl-setup.sh
```

---

## 2. 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繧ｻ繝・ヨ繧｢繝・・縺ｮ螳溯｡・
### 繧ｪ繝励す繝ｧ繝ｳ A: 邨ｱ蜷医せ繧ｯ繝ｪ繝励ヨ・域耳螂ｨ・・
縺吶∋縺ｦ縺ｮ繧ｻ繧ｭ繝･繝ｪ繝・ぅ險ｭ螳壹ｒ荳蠎ｦ縺ｫ螳溯｡鯉ｼ・
```bash
# 繧ｹ繧ｯ繝ｪ繝励ヨ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ遘ｻ蜍・cd /opt/elysia-ai/scripts

# 邨ｱ蜷医そ繝・ヨ繧｢繝・・繧ｹ繧ｯ繝ｪ繝励ヨ繧貞ｮ溯｡・sudo bash complete-security-setup.sh
```

縺薙・繧ｹ繧ｯ繝ｪ繝励ヨ縺ｯ莉･荳九ｒ鬆・ｺ冗ｫ九※縺ｦ螳溯｡後＠縺ｾ縺呻ｼ・
1. 繧ｻ繧ｭ繝･繝ｪ繝・ぅ隱崎ｨｼ諠・ｱ縺ｮ逕滓・
2. 繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ險ｭ螳・3. SSH蠑ｷ蛹・4. SSL/TLS險ｭ螳・5. 繝舌ャ繧ｯ繧｢繝・・險ｭ螳・6. 繝ｭ繧ｰ逶｣隕・7. Fail2Ban險ｭ螳・8. 繧ｻ繧ｭ繝･繝ｪ繝・ぅ逶｣譟ｻ繝・・繝ｫ險ｭ螳・
### 繧ｪ繝励す繝ｧ繝ｳ B: 蛟句挨繧ｹ繧ｯ繝ｪ繝励ヨ螳溯｡・
蜷・そ繧ｭ繝･繝ｪ繝・ぅ讖溯・繧貞句挨縺ｫ險ｭ螳壹☆繧句ｴ蜷茨ｼ・
#### 2.1 繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ險ｭ螳・
```bash
sudo bash /opt/elysia-ai/scripts/firewall-setup.sh
```

縺薙・繧ｹ繧ｯ繝ｪ繝励ヨ縺悟ｮ溯｡後☆繧九％縺ｨ・・
- UFW・・ncomplicated Firewall・峨ｒ繧､繝ｳ繧ｹ繝医・繝ｫ繝ｻ險ｭ螳・- 繝・ヵ繧ｩ繝ｫ繝医・繝ｪ繧ｷ繝ｼ險ｭ螳夲ｼ亥女菫｡諡貞凄縲・∽ｿ｡險ｱ蜿ｯ・・- SSH・・2・・ HTTP・・0・・ HTTPS・・43・峨・繝ｼ繝医ｒ髢区叛
- Elysia・・000・峨・繝ｼ繝医・險ｭ螳夲ｼ磯∈謚槫庄閭ｽ・・- 繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ譛牙柑蛹・
**蜃ｺ蜉帑ｾ具ｼ・*

```
笨・UFW Status: active
笨・Firewall rules configured
  - SSH: 22/tcp
  - HTTP: 80/tcp
  - HTTPS: 443/tcp
```

#### 2.2 SSH 繧ｻ繧ｭ繝･繝ｪ繝・ぅ蠑ｷ蛹・
```bash
sudo bash /opt/elysia-ai/scripts/ssh-security.sh
```

縺薙・繧ｹ繧ｯ繝ｪ繝励ヨ縺悟ｮ溯｡後☆繧九％縺ｨ・・
- SSH險ｭ螳壹・繝舌ャ繧ｯ繧｢繝・・繧剃ｽ懈・
- 繝代せ繝ｯ繝ｼ繝芽ｪ崎ｨｼ繧堤┌蜉ｹ蛹厄ｼ亥・髢矩嵯隱崎ｨｼ縺ｮ縺ｿ・・- Root 繝ｭ繧ｰ繧､繝ｳ繧堤ｦ∵ｭ｢
- X11 繝輔か繝ｯ繝ｼ繝・ぅ繝ｳ繧ｰ繧堤┌蜉ｹ蛹・- 繝悶Ν繝ｼ繝医ヵ繧ｩ繝ｼ繧ｹ謾ｻ謦・ｯｾ遲厄ｼ・axAuthTries=3・・- 蠑ｷ蜉帙↑證怜捷繧ｹ繧､繝ｼ繝医・險ｭ螳・- SSH 繧ｵ繝ｼ繝薙せ縺ｮ蜀崎ｵｷ蜍・
**驥崎ｦ・** 險ｭ螳壼､画峩蜑阪↓縲∫樟蝨ｨ縺ｮSSH謗･邯壹′繧｢繧ｯ繝・ぅ繝悶↑縺ｾ縺ｾ縺ｧ繝・せ繝医＠縺ｦ縺上□縺輔＞縲・
#### 2.3 SSL/TLS 險ｼ譏取嶌險ｭ螳・
```bash
sudo bash /opt/elysia-ai/scripts/ssl-setup.sh example.com
```

縺薙・繧ｹ繧ｯ繝ｪ繝励ヨ縺悟ｮ溯｡後☆繧九％縺ｨ・・
- Certbot・・et's Encrypt・峨・繧､繝ｳ繧ｹ繝医・繝ｫ
- SSL險ｼ譏取嶌縺ｮ逕滓・繝ｻ繧､繝ｳ繧ｹ繝医・繝ｫ
- 閾ｪ蜍墓峩譁ｰ縺ｮ險ｭ螳・- Nginx SSL險ｭ螳壹ユ繝ｳ繝励Ξ繝ｼ繝医・菴懈・
- HTTP 竊・HTTPS 繝ｪ繝繧､繝ｬ繧ｯ繝郁ｨｭ螳・- 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝倥ャ繝繝ｼ縺ｮ險ｭ螳・
**繝代Λ繝｡繝ｼ繧ｿ:**

```bash
# 蝓ｺ譛ｬ逧・↑菴ｿ逕ｨ豕・sudo bash ssl-setup.sh example.com

# www 繧ｵ繝悶ラ繝｡繧､繝ｳ莉倥″
sudo bash ssl-setup.sh example.com www

# 隍・焚繝峨Γ繧､繝ｳ
sudo bash ssl-setup.sh example.com www,api,staging
```

#### 2.4 閾ｪ蜍輔ヰ繝・け繧｢繝・・險ｭ螳・
```bash
sudo bash /opt/elysia-ai/scripts/backup-setup.sh
```

縺薙・繧ｹ繧ｯ繝ｪ繝励ヨ縺悟ｮ溯｡後☆繧九％縺ｨ・・
- 繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ菴懈・・・backup・・- 閾ｪ蜍輔ヰ繝・け繧｢繝・・繧ｹ繧ｯ繝ｪ繝励ヨ驟咲ｽｮ
- PostgreSQL 繝・・繧ｿ繝吶・繧ｹ繝舌ャ繧ｯ繧｢繝・・
- 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繝輔ぃ繧､繝ｫ繝舌ャ繧ｯ繧｢繝・・
- 繧｢繝・・繝ｭ繝ｼ繝・繝・・繧ｿ繝舌ャ繧ｯ繧｢繝・・
- Cron 繧ｸ繝ｧ繝冶ｨｭ螳夲ｼ域ｯ取律 2:00 AM・・- 蜿､縺・ヰ繝・け繧｢繝・・縺ｮ閾ｪ蜍募炎髯､・・0譌･菫晄戟・・
**繝舌ャ繧ｯ繧｢繝・・蟇ｾ雎｡:**

```
- Database: PostgreSQL dump (SQL.gz)
- Application: tar.gz (node_modules 髯､螟・
- Uploads: tar.gz
- Data: tar.gz
```

**謇句虚繝舌ャ繧ｯ繧｢繝・・:**

```bash
/opt/backup-elysia-ai.sh

# 繝ｭ繧ｰ遒ｺ隱・tail -f /var/log/elysia-backup.log
```

#### 2.5 繝ｭ繧ｰ逶｣隕冶ｨｭ螳・
```bash
sudo bash /opt/elysia-ai/scripts/log-monitoring-setup.sh
```

縺薙・繧ｹ繧ｯ繝ｪ繝励ヨ縺悟ｮ溯｡後☆繧九％縺ｨ・・
- 繝ｭ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ菴懈・・・var/log/elysia・・- Logrotate 險ｭ螳夲ｼ医Ο繧ｰ繝ｭ繝ｼ繝・・繧ｷ繝ｧ繝ｳ・・- 繝ｭ繧ｰ逶｣隕悶せ繧ｯ繝ｪ繝励ヨ驟咲ｽｮ
- Systemd service/timer 險ｭ螳・- 繝帙・繝ｪ繝ｼ逶｣隕・Cron 繧ｸ繝ｧ繝冶ｨｭ螳・
**繝ｭ繧ｰ逶｣隕悶Ξ繝昴・繝・**

```bash
# 謇句虚螳溯｡・/opt/monitor-elysia-logs.sh

# 蜃ｺ蜉帛・螳ｹ:
# - 繧ｨ繝ｩ繝ｼ蛻・梵
# - 隴ｦ蜻雁・譫・# - 繧ｻ繧ｭ繝･繝ｪ繝・ぅ逶｣譟ｻ
# - 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ謖・ｨ・# - 繧ｷ繧ｹ繝・Β繝倥Ν繧ｹ
```

#### 2.6 Fail2Ban・井ｾｵ蜈･讀懷・・芽ｨｭ螳・
```bash
sudo bash /opt/elysia-ai/scripts/fail2ban-setup.sh
```

縺薙・繧ｹ繧ｯ繝ｪ繝励ヨ縺悟ｮ溯｡後☆繧九％縺ｨ・・
- Fail2Ban・井ｾｵ蜈･讀懷・繧ｷ繧ｹ繝・Β・峨う繝ｳ繧ｹ繝医・繝ｫ
- API縲ヾSH縲．DoS 繝輔ぅ繝ｫ繧ｿ繝ｼ險ｭ螳・- Jail 繝ｫ繝ｼ繝ｫ險ｭ螳・- 閾ｪ蜍輔い繝ｳ繝舌Φ 繧ｹ繧ｯ繝ｪ繝励ヨ驟咲ｽｮ
- Cron 繧ｸ繝ｧ繝悶〒譛滄剞蛻・ｌ繝舌Φ繧定・蜍戊ｧ｣髯､

**繝ｫ繝ｼ繝ｫ:**

```
Elysia API:
  - 5 蝗槭・螟ｱ謨励〒 1 譎る俣繝悶Ο繝・け
  - 10 蛻・俣縺ｮ繧ｦ繧｣繝ｳ繝峨え

SSH:
  - 3 蝗槭・螟ｱ謨励〒 30 蛻・ヶ繝ｭ繝・け
  - 10 蛻・俣縺ｮ繧ｦ繧｣繝ｳ繝峨え

SSH DDoS:
  - 10 蝗槭・螟ｱ謨励〒 10 蛻・ヶ繝ｭ繝・け
  - 1 蛻・俣縺ｮ繧ｦ繧｣繝ｳ繝峨え
```

**逶｣隕・**

```bash
# 迥ｶ諷狗｢ｺ隱・fail2ban-client status

# 繧ｸ繧ｧ繧､繝ｫ迥ｶ諷・fail2ban-client status elysia-api

# 謇句虚繝｢繝九ち繝ｪ繝ｳ繧ｰ
/opt/monitor-fail2ban.sh

# 繝ｭ繧ｰ遒ｺ隱・tail -f /var/log/fail2ban.log
```

#### 2.7 繧ｻ繧ｭ繝･繝ｪ繝・ぅ逶｣譟ｻ險ｭ螳・
```bash
sudo bash /opt/elysia-ai/scripts/security-audit-setup.sh
```

縺薙・繧ｹ繧ｯ繝ｪ繝励ヨ縺悟ｮ溯｡後☆繧九％縺ｨ・・
- Lynis・医そ繧ｭ繝･繝ｪ繝・ぅ逶｣譟ｻ繝・・繝ｫ・峨う繝ｳ繧ｹ繝医・繝ｫ
- AIDE・医ヵ繧｡繧､繝ｫ謨ｴ蜷域ｧ逶｣隕厄ｼ峨う繝ｳ繧ｹ繝医・繝ｫ繝ｻ險ｭ螳・- 逶｣譟ｻ繧ｹ繧ｯ繝ｪ繝励ヨ驟咲ｽｮ
- 螳壽悄逶｣譟ｻ繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｫ險ｭ螳・
**逶｣譟ｻ繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｫ:**

```
- Lynis: 騾ｱ 1 蝗橸ｼ域律譖・2:00 AM・・- AIDE: 豈取律・・:00 AM・・- 邱丞粋逶｣譟ｻ: 譛・1 蝗橸ｼ・ 譌･ 4:00 AM・・```

**謇句虚螳溯｡・**

```bash
# Lynis 逶｣譟ｻ
/opt/run-security-audit.sh

# AIDE 繝√ぉ繝・け
/opt/run-aide-check.sh

# 邱丞粋逶｣譟ｻ
/opt/comprehensive-security-audit.sh
```

---

## 3. 繧ｻ繧ｭ繝･繝ｪ繝・ぅ險ｭ螳壹・讀懆ｨｼ

### 繧ｻ繝・ヨ繧｢繝・・螳御ｺ・ｾ後・遒ｺ隱・
```bash
# 1. 繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ遒ｺ隱・sudo ufw status
# 蜃ｺ蜉・ Status: active

# 2. Fail2Ban 遒ｺ隱・sudo fail2ban-client status
# 蜃ｺ蜉・ Fail2Ban is running

# 3. SSH 遒ｺ隱・sudo systemctl status ssh
# 蜃ｺ蜉・ Active (running)

# 4. 繝舌ャ繧ｯ繧｢繝・・遒ｺ隱・ls -la /backup/
# 蜃ｺ蜉・ 譛譁ｰ縺ｮ繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠

# 5. 繝ｭ繧ｰ遒ｺ隱・tail -f /var/log/elysia/elysia.log

# 6. 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繧ｹ繧ｳ繧｢遒ｺ隱・/opt/comprehensive-security-audit.sh
```

### 蜃ｺ蜉帑ｾ・
```
笨・UFW Firewall: Active
笨・Fail2Ban: Active
笨・SSH Service: Active
笨・aide: Installed
笨・lynis: Installed
笨・logrotate: Installed

Security checks: 7/7 passed
```

---

## 4. 譛ｬ逡ｪ迺ｰ蠅・∈縺ｮ驕ｩ逕ｨ

### 4.1 迺ｰ蠅・､画焚縺ｮ險ｭ螳・
繧ｻ繝・ヨ繧｢繝・・螳御ｺ・ｾ後∽ｻ･荳九・隱崎ｨｼ諠・ｱ繧・`.env` 繝輔ぃ繧､繝ｫ縺ｫ險ｭ螳壹＠縺ｾ縺呻ｼ・
```bash
# .env 繝輔ぃ繧､繝ｫ繧堤ｷｨ髮・nano /opt/elysia-ai/.env

# 縺ｾ縺溘・譌｢蟄倥・ .env 繧堤｢ｺ隱・cat /opt/elysia-ai/.env
```

蠢・医・迺ｰ蠅・､画焚・・
```bash
# JWT 隱崎ｨｼ
JWT_SECRET=<逕滓・縺輔ｌ縺溘Λ繝ｳ繝繝譁・ｭ怜・>
JWT_REFRESH_SECRET=<逕滓・縺輔ｌ縺溘Λ繝ｳ繝繝譁・ｭ怜・>

# 繝・・繧ｿ繝吶・繧ｹ
DATABASE_URL=postgresql://elysia_user:<password>@localhost/elysia_ai

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TLS=true

# API 繧ｭ繝ｼ・亥ｿ・ｦ√↓蠢懊§縺ｦ・・OPENAI_API_KEY=<繧ｭ繝ｼ>
```

### 4.2 Docker Compose 繝・・繝ｭ繧､

```bash
# 繝励Ο繧ｸ繧ｧ繧ｯ繝医ョ繧｣繝ｬ繧ｯ繝医Μ縺ｫ遘ｻ蜍・cd /opt/elysia-ai

# Docker Compose 縺ｧ繧ｵ繝ｼ繝薙せ襍ｷ蜍・sudo docker-compose up -d

# 繧ｹ繝・・繧ｿ繧ｹ遒ｺ隱・sudo docker-compose ps

# 繝ｭ繧ｰ遒ｺ隱・sudo docker-compose logs -f
```

### 4.3 Systemd 繧ｵ繝ｼ繝薙せ險ｭ螳・
```bash
# 繧ｵ繝ｼ繝薙せ繝輔ぃ繧､繝ｫ繧剃ｽ懈・
sudo nano /etc/systemd/system/elysia-ai.service

# 蜀・ｮｹ・井ｾ具ｼ・
[Unit]
Description=Elysia AI Service
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/elysia-ai
ExecStart=/usr/bin/docker-compose up
ExecStop=/usr/bin/docker-compose down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# 繧ｵ繝ｼ繝薙せ繧呈怏蜉ｹ蛹悶・襍ｷ蜍・sudo systemctl enable elysia-ai
sudo systemctl start elysia-ai
sudo systemctl status elysia-ai
```

---

## 5. 譌･蟶ｸ逧・↑菫晏ｮ井ｽ懈･ｭ

### 5.1 繝ｭ繧ｰ遒ｺ隱・
```bash
# 繧ｨ繝ｩ繝ｼ繝ｭ繧ｰ遒ｺ隱・tail -100 /var/log/elysia/elysia.log | grep -i error

# 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝ｭ繧ｰ遒ｺ隱・tail -50 /var/log/fail2ban.log

# 繝舌ャ繧ｯ繧｢繝・・繝ｭ繧ｰ遒ｺ隱・tail -20 /var/log/elysia-backup.log

# 繧ｷ繧ｹ繝・Β繝ｭ繧ｰ遒ｺ隱・journalctl -u elysia-ai -n 50 -f
```

### 5.2 繝舌ャ繧ｯ繧｢繝・・遒ｺ隱・
```bash
# 繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ遒ｺ隱・du -sh /backup/
ls -lah /backup/ | head -20

# 譛譁ｰ縺ｮ繝舌ャ繧ｯ繧｢繝・・
ls -lt /backup/ | head -5

# 繝舌ャ繧ｯ繧｢繝・・繝・せ繝茨ｼ域ｯ朱ｱ謗ｨ螂ｨ・・/opt/backup-elysia-ai.sh
```

### 5.3 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繧｢繝・・繝・・繝・
```bash
# 繧｢繝・・繝・・繝育｢ｺ隱・apt list --upgradable | grep -i security

# 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繧｢繝・・繝・・繝磯←逕ｨ
sudo apt-get update
sudo apt-get upgrade -y

# 繧ｫ繝ｼ繝阪Ν繧｢繝・・繝・・繝育｢ｺ隱・sudo needrestart
```

### 5.4 繧ｻ繧ｭ繝･繝ｪ繝・ぅ逶｣譟ｻ

```bash
# 譛・1 蝗槭・邱丞粋逶｣譟ｻ
/opt/comprehensive-security-audit.sh

# 逶｣譟ｻ繝ｬ繝昴・繝育｢ｺ隱・ls -lah /var/log/elysia/audit/

# 譛譁ｰ縺ｮ繝ｬ繝昴・繝郁｡ｨ遉ｺ
cat /var/log/elysia/audit/comprehensive-audit-*.txt | tail -100
```

---

## 6. 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### SSH 謗･邯壼撫鬘・
```bash
# SSH 繧ｵ繝ｼ繝薙せ遒ｺ隱・sudo systemctl status ssh

# SSH 繝ｭ繧ｰ遒ｺ隱・sudo tail -50 /var/log/auth.log | grep ssh

# SSH 險ｭ螳壽ｧ区枚繝√ぉ繝・け
sudo sshd -t

# SSH 蜀崎ｵｷ蜍・sudo systemctl restart ssh

# 繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ遒ｺ隱・sudo ufw allow ssh
sudo ufw status
```

### 繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ蝠城｡・
```bash
# UFW 迥ｶ諷狗｢ｺ隱・sudo ufw status verbose

# 繝ｫ繝ｼ繝ｫ遒ｺ隱・sudo ufw show added

# 迚ｹ螳壹・繝ｼ繝磯幕謾ｾ
sudo ufw allow 3000/tcp

# 迚ｹ螳壹・繝ｼ繝磯哩骼・sudo ufw delete allow 3000/tcp

# UFW 蜀崎ｵｷ蜍・sudo systemctl restart ufw
```

### 繝舌ャ繧ｯ繧｢繝・・蝠城｡・
```bash
# 繝舌ャ繧ｯ繧｢繝・・繧ｹ繧ｯ繝ｪ繝励ヨ繝・せ繝・sudo bash /opt/backup-elysia-ai.sh

# 繝ｭ繧ｰ遒ｺ隱・tail -f /var/log/elysia-backup.log

# 繝・ぅ繧ｹ繧ｯ遨ｺ縺榊ｮｹ驥冗｢ｺ隱・df -h /backup

# 繝舌ャ繧ｯ繧｢繝・・蜑企勁・域焔蜍包ｼ・sudo rm -rf /backup/elysia-YYYYMMDD-HHMMSS
```

### Fail2Ban 蝠城｡・
```bash
# Fail2Ban 繧ｵ繝ｼ繝薙せ蜀崎ｵｷ蜍・sudo systemctl restart fail2ban

# 繧ｸ繧ｧ繧､繝ｫ迥ｶ諷狗｢ｺ隱・sudo fail2ban-client status

# IP 謇句虚繧｢繝ｳ繝舌Φ
sudo fail2ban-client set elysia-api banip remove <IP>

# 繝ｭ繧ｰ遒ｺ隱・tail -f /var/log/fail2ban.log
```

---

## 7. 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝√ぉ繝・け繝ｪ繧ｹ繝・
譛ｬ逡ｪ繝・・繝ｭ繧､蜑阪↓莉･荳九ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞・・
- [ ] UFW 繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ譛牙柑

  ```bash
  sudo ufw status
  ```

- [ ] SSH 蜈ｬ髢矩嵯隱崎ｨｼ縺ｮ縺ｿ

  ```bash
  sudo grep PasswordAuthentication /etc/ssh/sshd_config
  ```

- [ ] Root SSH 繝ｭ繧ｰ繧､繝ｳ遖∵ｭ｢

  ```bash
  sudo grep PermitRootLogin /etc/ssh/sshd_config
  ```

- [ ] SSL/TLS 險ｼ譏取嶌繧､繝ｳ繧ｹ繝医・繝ｫ

  ```bash
  sudo ls /etc/letsencrypt/live/
  ```

- [ ] Fail2Ban 譛牙柑

  ```bash
  sudo fail2ban-client status
  ```

- [ ] 閾ｪ蜍輔ヰ繝・け繧｢繝・・險ｭ螳・
  ```bash
  crontab -l | grep backup
  ```

- [ ] 繝ｭ繧ｰ逶｣隕匁怏蜉ｹ

  ```bash
  crontab -l | grep monitor
  ```

- [ ] 螳壽悄逶｣譟ｻ繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｫ

  ```bash
  crontab -l | grep audit
  ```

- [ ] 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繧｢繝・・繝・・繝磯←逕ｨ

  ```bash
  apt list --upgradable | grep -i security
  ```

- [ ] 繝・・繧ｿ繝吶・繧ｹ繝代せ繝ｯ繝ｼ繝牙､画峩

  ```bash
  sudo -u postgres psql
  \password elysia_user
  ```

- [ ] JWT 繧ｷ繝ｼ繧ｯ繝ｬ繝・ヨ螟画峩・亥ｼｷ蜉帙↑繝ｩ繝ｳ繝繝蛟､・・
  ```bash
  grep JWT_SECRET /opt/elysia-ai/.env
  ```

- [ ] 繝・ぅ繧ｹ繧ｯ遨ｺ縺榊ｮｹ驥冗｢ｺ隱・
  ```bash
  df -h
  ```

- [ ] 繝｡繝｢繝ｪ菴ｿ逕ｨ邇・｢ｺ隱・  ```bash
  free -h
  ```

---

## 8. 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繧｢繝ｩ繝ｼ繝郁ｨｭ螳・
### 繝｡繝ｼ繝ｫ騾夂衍縺ｮ險ｭ螳・
```bash
# Postfix 縺ｮ繧､繝ｳ繧ｹ繝医・繝ｫ・医Γ繝ｼ繝ｫ騾∽ｿ｡逕ｨ・・sudo apt-get install -y postfix

# Fail2Ban 繝｡繝ｼ繝ｫ騾夂衍險ｭ螳・sudo nano /etc/fail2ban/jail.d/elysia-api.conf

# 莉･荳九ｒ霑ｽ蜉:
action = sendmail-whois[name=Elysia, dest=admin@example.com]

# Fail2Ban 蜀崎ｵｷ蜍・sudo systemctl restart fail2ban
```

### 繝｢繝九ち繝ｪ繝ｳ繧ｰ繝繝・す繝･繝懊・繝会ｼ医が繝励す繝ｧ繝ｳ・・
Prometheus + Grafana 縺ｧ繝｡繝医Μ繧ｯ繧ｹ繧堤屮隕厄ｼ・
```bash
# Prometheus 繧､繝ｳ繧ｹ繝医・繝ｫ
sudo apt-get install -y prometheus

# Grafana 繧､繝ｳ繧ｹ繝医・繝ｫ
sudo apt-get install -y grafana-server

# 繝繝・す繝･繝懊・繝峨い繧ｯ繧ｻ繧ｹ
# http://your-server:3000
```

---

## 9. 縺輔ｉ縺ｫ蟄ｦ縺ｶ

### 蜿り・Μ繧ｽ繝ｼ繧ｹ

- [UFW・医ヵ繧｡繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ・峨ラ繧ｭ繝･繝｡繝ｳ繝・(https://help.ubuntu.com/community/UFW)
- [Fail2Ban 蜈ｬ蠑上ラ繧ｭ繝･繝｡繝ｳ繝・(https://www.fail2ban.org/wiki/index.php/Main_Page)
- [Let's Encrypt 諠・ｱ](https://letsencrypt.org/)
- [Lynis 繧ｻ繧ｭ繝･繝ｪ繝・ぅ逶｣譟ｻ](https://cisofy.com/lynis/)
- [AIDE 繝輔ぃ繧､繝ｫ謨ｴ蜷域ｧ](https://aide.github.io/)

### 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝吶せ繝医・繝ｩ繧ｯ繝・ぅ繧ｹ

1. **螳壽悄逧・↑譖ｴ譁ｰ**: 騾ｱ 1 蝗樔ｻ･荳翫・繧ｻ繧ｭ繝･繝ｪ繝・ぅ繧｢繝・・繝・・繝育｢ｺ隱・2. **繝ｭ繧ｰ逶｣隕・*: 豈取律縺ｮ繝ｭ繧ｰ繝ｬ繝薙Η繝ｼ
3. **繝舌ャ繧ｯ繧｢繝・・繝・せ繝・*: 譛・1 蝗槭・蠕ｩ蜈・ユ繧ｹ繝・4. **繧｢繧ｯ繧ｻ繧ｹ蛻ｶ蠕｡**: 譛蟆乗ｨｩ髯舌・蜴溷援繧帝←逕ｨ
5. **逶｣譟ｻ**: 譛・1 蝗槭・蛹・峡逧・↑繧ｻ繧ｭ繝･繝ｪ繝・ぅ逶｣譟ｻ
6. **繧､繝ｳ繧ｷ繝・Φ繝亥ｯｾ蠢・*: 繧ｻ繧ｭ繝･繝ｪ繝・ぅ蝠城｡後・譌ｩ譛滓､懷・繝ｻ蟇ｾ蠢・
---

## 10. 繧ｵ繝昴・繝医→騾｣邨｡蜈・
繧ｻ繧ｭ繝･繝ｪ繝・ぅ縺ｫ髢｢縺吶ｋ雉ｪ蝠上ｄ蝠城｡後′縺ゅｋ蝣ｴ蜷茨ｼ・
- **繝ｭ繧ｰ繝輔ぃ繧､繝ｫ**: `/var/log/elysia/`, `/var/log/fail2ban.log`
- **繝峨く繝･繝｡繝ｳ繝・*: `PRODUCTION_SETUP_GUIDE.md`
- **繝倥Ν繝励さ繝槭Φ繝・*: `man <繧ｳ繝槭Φ繝牙錐>`

---

**譛蠕梧峩譁ｰ**: 2025蟷ｴ12譛・譌･
**繝舌・繧ｸ繝ｧ繝ｳ**: 1.0
**繧ｹ繝・・繧ｿ繧ｹ**: 譛ｬ逡ｪ迺ｰ蠅・ｯｾ蠢・
