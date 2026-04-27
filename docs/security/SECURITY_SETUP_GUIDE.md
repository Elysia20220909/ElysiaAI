# Elysia AI - Complete Security Setup Guide

## 概要E(Overview)

こ�Eガイド�E、ElysiaAIの本番環墁E��向けたすべてのセキュリチE��設定を実行するため�Eも�Eで、以下�E頁E��をカバ�EしてぁE��す！E
- ✁Eファイアウォール設宁E(UFW)
- ✁ESSH セキュリチE��強匁E- ✁ESSL/TLS 証明書�E�Eet's Encrypt�E�E- ✁E自動バチE��アチE�E
- ✁Eログ監要E- ✁E侵入検�EシスチE�� (Fail2Ban)
- ✁EセキュリチE��監査 (Lynis, AIDE)

---

## 1. 準備作業

### シスチE��要件

```bash
- Linux (Ubuntu 20.04+ また�E CentOS 7+)
- Root アクセス権陁E- インターネット接綁E- 最封E10GB チE��スク容量（バチE��アチE�E用�E�E```

### 前提条件の確誁E
```bash
# SSH でサーバ�Eにログイン
ssh user@your-server-ip

# Root に刁E��替ぁEsudo -i

# スクリプトの存在確誁Els -la /opt/elysia-ai/scripts/

# ファイルが存在することを確誁E# - backup-setup.sh
# - log-monitoring-setup.sh
# - fail2ban-setup.sh
# - security-audit-setup.sh
# - complete-security-setup.sh
# - firewall-setup.sh
# - ssh-security.sh
# - ssl-setup.sh
```

---

## 2. セキュリチE��セチE��アチE�Eの実衁E
### オプション A: 統合スクリプト�E�推奨�E�E
すべてのセキュリチE��設定を一度に実行！E
```bash
# スクリプトチE��レクトリに移勁Ecd /opt/elysia-ai/scripts

# 統合セチE��アチE�Eスクリプトを実衁Esudo bash complete-security-setup.sh
```

こ�Eスクリプトは以下を頁E��立てて実行します！E
1. セキュリチE��認証惁E��の生�E
2. ファイアウォール設宁E3. SSH強匁E4. SSL/TLS設宁E5. バックアチE�E設宁E6. ログ監要E7. Fail2Ban設宁E8. セキュリチE��監査チE�Eル設宁E
### オプション B: 個別スクリプト実衁E
吁E��キュリチE��機�Eを個別に設定する場合！E
#### 2.1 ファイアウォール設宁E
```bash
sudo bash /opt/elysia-ai/scripts/firewall-setup.sh
```

こ�Eスクリプトが実行すること�E�E
- UFW�E�Encomplicated Firewall�E�をインスト�Eル・設宁E- チE��ォルト�Eリシー設定（受信拒否、E��信許可�E�E- SSH�E�E2�E�E HTTP�E�E0�E�E HTTPS�E�E43�E��Eートを開放
- Elysia�E�E000�E��Eート�E設定（選択可能�E�E- ファイアウォール有効匁E
**出力例！E*

```
✁EUFW Status: active
✁EFirewall rules configured
  - SSH: 22/tcp
  - HTTP: 80/tcp
  - HTTPS: 443/tcp
```

#### 2.2 SSH セキュリチE��強匁E
```bash
sudo bash /opt/elysia-ai/scripts/ssh-security.sh
```

こ�Eスクリプトが実行すること�E�E
- SSH設定�EバックアチE�Eを作�E
- パスワード認証を無効化（�E開鍵認証のみ�E�E- Root ログインを禁止
- X11 フォワーチE��ングを無効匁E- ブルートフォース攻撁E��策！EaxAuthTries=3�E�E- 強力な暗号スイート�E設宁E- SSH サービスの再起勁E
**重要E** 設定変更前に、現在のSSH接続がアクチE��ブなままでチE��トしてください、E
#### 2.3 SSL/TLS 証明書設宁E
```bash
sudo bash /opt/elysia-ai/scripts/ssl-setup.sh example.com
```

こ�Eスクリプトが実行すること�E�E
- Certbot�E�Eet's Encrypt�E��Eインスト�Eル
- SSL証明書の生�E・インスト�Eル
- 自動更新の設宁E- Nginx SSL設定テンプレート�E作�E
- HTTP ↁEHTTPS リダイレクト設宁E- セキュリチE��ヘッダーの設宁E
**パラメータ:**

```bash
# 基本皁E��使用況Esudo bash ssl-setup.sh example.com

# www サブドメイン付き
sudo bash ssl-setup.sh example.com www

# 褁E��ドメイン
sudo bash ssl-setup.sh example.com www,api,staging
```

#### 2.4 自動バチE��アチE�E設宁E
```bash
sudo bash /opt/elysia-ai/scripts/backup-setup.sh
```

こ�Eスクリプトが実行すること�E�E
- バックアチE�EチE��レクトリ作�E�E�Ebackup�E�E- 自動バチE��アチE�Eスクリプト配置
- PostgreSQL チE�Eタベ�EスバックアチE�E
- アプリケーションファイルバックアチE�E
- アチE�EローチEチE�EタバックアチE�E
- Cron ジョブ設定（毎日 2:00 AM�E�E- 古ぁE��チE��アチE�Eの自動削除�E�E0日保持�E�E
**バックアチE�E対象:**

```
- Database: PostgreSQL dump (SQL.gz)
- Application: tar.gz (node_modules 除夁E
- Uploads: tar.gz
- Data: tar.gz
```

**手動バックアチE�E:**

```bash
/opt/backup-elysia-ai.sh

# ログ確誁Etail -f /var/log/elysia-backup.log
```

#### 2.5 ログ監視設宁E
```bash
sudo bash /opt/elysia-ai/scripts/log-monitoring-setup.sh
```

こ�Eスクリプトが実行すること�E�E
- ログチE��レクトリ作�E�E�Evar/log/elysia�E�E- Logrotate 設定（ログローチE�Eション�E�E- ログ監視スクリプト配置
- Systemd service/timer 設宁E- ホ�Eリー監要ECron ジョブ設宁E
**ログ監視レポ�EチE**

```bash
# 手動実衁E/opt/monitor-elysia-logs.sh

# 出力�E容:
# - エラー刁E��
# - 警告�E极E# - セキュリチE��監査
# - パフォーマンス持E��E# - シスチE��ヘルス
```

#### 2.6 Fail2Ban�E�侵入検�E�E�設宁E
```bash
sudo bash /opt/elysia-ai/scripts/fail2ban-setup.sh
```

こ�Eスクリプトが実行すること�E�E
- Fail2Ban�E�侵入検�EシスチE���E�インスト�Eル
- API、SSH、DDoS フィルター設宁E- Jail ルール設宁E- 自動アンバン スクリプト配置
- Cron ジョブで期限刁E��バンを�E動解除

**ルール:**

```
Elysia API:
  - 5 回�E失敗で 1 時間ブロチE��
  - 10 刁E��のウィンドウ

SSH:
  - 3 回�E失敗で 30 刁E��ロチE��
  - 10 刁E��のウィンドウ

SSH DDoS:
  - 10 回�E失敗で 10 刁E��ロチE��
  - 1 刁E��のウィンドウ
```

**監要E**

```bash
# 状態確誁Efail2ban-client status

# ジェイル状慁Efail2ban-client status elysia-api

# 手動モニタリング
/opt/monitor-fail2ban.sh

# ログ確誁Etail -f /var/log/fail2ban.log
```

#### 2.7 セキュリチE��監査設宁E
```bash
sudo bash /opt/elysia-ai/scripts/security-audit-setup.sh
```

こ�Eスクリプトが実行すること�E�E
- Lynis�E�セキュリチE��監査チE�Eル�E�インスト�Eル
- AIDE�E�ファイル整合性監視）インスト�Eル・設宁E- 監査スクリプト配置
- 定期監査スケジュール設宁E
**監査スケジュール:**

```
- Lynis: 週 1 回（日曁E2:00 AM�E�E- AIDE: 毎日�E�E:00 AM�E�E- 総合監査: 朁E1 回！E 日 4:00 AM�E�E```

**手動実衁E**

```bash
# Lynis 監査
/opt/run-security-audit.sh

# AIDE チェチE��
/opt/run-aide-check.sh

# 総合監査
/opt/comprehensive-security-audit.sh
```

---

## 3. セキュリチE��設定�E検証

### セチE��アチE�E完亁E���E確誁E
```bash
# 1. ファイアウォール確誁Esudo ufw status
# 出劁E Status: active

# 2. Fail2Ban 確誁Esudo fail2ban-client status
# 出劁E Fail2Ban is running

# 3. SSH 確誁Esudo systemctl status ssh
# 出劁E Active (running)

# 4. バックアチE�E確誁Els -la /backup/
# 出劁E 最新のバックアチE�EチE��レクトリが存在

# 5. ログ確誁Etail -f /var/log/elysia/elysia.log

# 6. セキュリチE��スコア確誁E/opt/comprehensive-security-audit.sh
```

### 出力侁E
```
✁EUFW Firewall: Active
✁EFail2Ban: Active
✁ESSH Service: Active
✁Eaide: Installed
✁Elynis: Installed
✁Elogrotate: Installed

Security checks: 7/7 passed
```

---

## 4. 本番環墁E��の適用

### 4.1 環墁E��数の設宁E
セチE��アチE�E完亁E��、以下�E認証惁E��めE`.env` ファイルに設定します！E
```bash
# .env ファイルを編雁Enano /opt/elysia-ai/.env

# また�E既存�E .env を確誁Ecat /opt/elysia-ai/.env
```

忁E���E環墁E��数�E�E
```bash
# JWT 認証
JWT_SECRET=<生�Eされたランダム斁E���E>
JWT_REFRESH_SECRET=<生�Eされたランダム斁E���E>

# チE�Eタベ�Eス
DATABASE_URL=postgresql://elysia_user:<password>@localhost/elysia_ai

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TLS=true

# API キー�E�忁E��に応じて�E�EOPENAI_API_KEY=<キー>
```

### 4.2 Docker Compose チE�Eロイ

```bash
# プロジェクトディレクトリに移勁Ecd /opt/elysia-ai

# Docker Compose でサービス起勁Esudo docker-compose up -d

# スチE�Eタス確誁Esudo docker-compose ps

# ログ確誁Esudo docker-compose logs -f
```

### 4.3 Systemd サービス設宁E
```bash
# サービスファイルを作�E
sudo nano /etc/systemd/system/elysia-ai.service

# 冁E���E�例！E
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

# サービスを有効化�E起勁Esudo systemctl enable elysia-ai
sudo systemctl start elysia-ai
sudo systemctl status elysia-ai
```

---

## 5. 日常皁E��保守作業

### 5.1 ログ確誁E
```bash
# エラーログ確誁Etail -100 /var/log/elysia/elysia.log | grep -i error

# セキュリチE��ログ確誁Etail -50 /var/log/fail2ban.log

# バックアチE�Eログ確誁Etail -20 /var/log/elysia-backup.log

# シスチE��ログ確誁Ejournalctl -u elysia-ai -n 50 -f
```

### 5.2 バックアチE�E確誁E
```bash
# バックアチE�EチE��レクトリ確誁Edu -sh /backup/
ls -lah /backup/ | head -20

# 最新のバックアチE�E
ls -lt /backup/ | head -5

# バックアチE�EチE��ト（毎週推奨�E�E/opt/backup-elysia-ai.sh
```

### 5.3 セキュリチE��アチE�EチE�EチE
```bash
# アチE�EチE�Eト確誁Eapt list --upgradable | grep -i security

# セキュリチE��アチE�EチE�Eト適用
sudo apt-get update
sudo apt-get upgrade -y

# カーネルアチE�EチE�Eト確誁Esudo needrestart
```

### 5.4 セキュリチE��監査

```bash
# 朁E1 回�E総合監査
/opt/comprehensive-security-audit.sh

# 監査レポ�Eト確誁Els -lah /var/log/elysia/audit/

# 最新のレポ�Eト表示
cat /var/log/elysia/audit/comprehensive-audit-*.txt | tail -100
```

---

## 6. トラブルシューチE��ング

### SSH 接続問顁E
```bash
# SSH サービス確誁Esudo systemctl status ssh

# SSH ログ確誁Esudo tail -50 /var/log/auth.log | grep ssh

# SSH 設定構文チェチE��
sudo sshd -t

# SSH 再起勁Esudo systemctl restart ssh

# ファイアウォール確誁Esudo ufw allow ssh
sudo ufw status
```

### ファイアウォール問顁E
```bash
# UFW 状態確誁Esudo ufw status verbose

# ルール確誁Esudo ufw show added

# 特定�Eート開放
sudo ufw allow 3000/tcp

# 特定�Eート閉鎁Esudo ufw delete allow 3000/tcp

# UFW 再起勁Esudo systemctl restart ufw
```

### バックアチE�E問顁E
```bash
# バックアチE�EスクリプトチE��チEsudo bash /opt/backup-elysia-ai.sh

# ログ確誁Etail -f /var/log/elysia-backup.log

# チE��スク空き容量確誁Edf -h /backup

# バックアチE�E削除�E�手動！Esudo rm -rf /backup/elysia-YYYYMMDD-HHMMSS
```

### Fail2Ban 問顁E
```bash
# Fail2Ban サービス再起勁Esudo systemctl restart fail2ban

# ジェイル状態確誁Esudo fail2ban-client status

# IP 手動アンバン
sudo fail2ban-client set elysia-api banip remove <IP>

# ログ確誁Etail -f /var/log/fail2ban.log
```

---

## 7. セキュリチE��チェチE��リスチE
本番チE�Eロイ前に以下を確認してください�E�E
- [ ] UFW ファイアウォール有効

  ```bash
  sudo ufw status
  ```

- [ ] SSH 公開鍵認証のみ

  ```bash
  sudo grep PasswordAuthentication /etc/ssh/sshd_config
  ```

- [ ] Root SSH ログイン禁止

  ```bash
  sudo grep PermitRootLogin /etc/ssh/sshd_config
  ```

- [ ] SSL/TLS 証明書インスト�Eル

  ```bash
  sudo ls /etc/letsencrypt/live/
  ```

- [ ] Fail2Ban 有効

  ```bash
  sudo fail2ban-client status
  ```

- [ ] 自動バチE��アチE�E設宁E
  ```bash
  crontab -l | grep backup
  ```

- [ ] ログ監視有効

  ```bash
  crontab -l | grep monitor
  ```

- [ ] 定期監査スケジュール

  ```bash
  crontab -l | grep audit
  ```

- [ ] セキュリチE��アチE�EチE�Eト適用

  ```bash
  apt list --upgradable | grep -i security
  ```

- [ ] チE�Eタベ�Eスパスワード変更

  ```bash
  sudo -u postgres psql
  \password elysia_user
  ```

- [ ] JWT シークレチE��変更�E�強力なランダム値�E�E
  ```bash
  grep JWT_SECRET /opt/elysia-ai/.env
  ```

- [ ] チE��スク空き容量確誁E
  ```bash
  df -h
  ```

- [ ] メモリ使用玁E��誁E  ```bash
  free -h
  ```

---

## 8. セキュリチE��アラート設宁E
### メール通知の設宁E
```bash
# Postfix のインスト�Eル�E�メール送信用�E�Esudo apt-get install -y postfix

# Fail2Ban メール通知設宁Esudo nano /etc/fail2ban/jail.d/elysia-api.conf

# 以下を追加:
action = sendmail-whois[name=Elysia, dest=admin@example.com]

# Fail2Ban 再起勁Esudo systemctl restart fail2ban
```

### モニタリングダチE��ュボ�Eド（オプション�E�E
Prometheus + Grafana でメトリクスを監視！E
```bash
# Prometheus インスト�Eル
sudo apt-get install -y prometheus

# Grafana インスト�Eル
sudo apt-get install -y grafana-server

# ダチE��ュボ�Eドアクセス
# http://your-server:3000
```

---

## 9. さらに学ぶ

### 参老E��ソース

- [UFW�E�ファイアウォール�E�ドキュメンチE(https://help.ubuntu.com/community/UFW)
- [Fail2Ban 公式ドキュメンチE(https://www.fail2ban.org/wiki/index.php/Main_Page)
- [Let's Encrypt 惁E��](https://letsencrypt.org/)
- [Lynis セキュリチE��監査](https://cisofy.com/lynis/)
- [AIDE ファイル整合性](https://aide.github.io/)

### セキュリチE��ベスト�EラクチE��ス

1. **定期皁E��更新**: 週 1 回以上�EセキュリチE��アチE�EチE�Eト確誁E2. **ログ監要E*: 毎日のログレビュー
3. **バックアチE�EチE��チE*: 朁E1 回�E復允E��スチE4. **アクセス制御**: 最小権限�E原則を適用
5. **監査**: 朁E1 回�E匁E��皁E��セキュリチE��監査
6. **インシチE��ト対忁E*: セキュリチE��問題�E早期検�E・対忁E
---

## 10. サポ�Eトと連絡允E
セキュリチE��に関する質問や問題がある場合！E
- **ログファイル**: `/var/log/elysia/`, `/var/log/fail2ban.log`
- **ドキュメンチE*: `PRODUCTION_SETUP_GUIDE.md`
- **ヘルプコマンチE*: `man <コマンド名>`

---

**最後更新**: 2025年12朁E日
**バ�Eジョン**: 1.0
**スチE�Eタス**: 本番環墁E��忁E
