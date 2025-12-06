# Elysia AI - Complete Security Setup Guide

## 概要 (Overview)

このガイドは、ElysiaAIの本番環境に向けたすべてのセキュリティ設定を実行するためのもので、以下の項目をカバーしています：

- ✅ ファイアウォール設定 (UFW)
- ✅ SSH セキュリティ強化
- ✅ SSL/TLS 証明書（Let's Encrypt）
- ✅ 自動バックアップ
- ✅ ログ監視
- ✅ 侵入検出システム (Fail2Ban)
- ✅ セキュリティ監査 (Lynis, AIDE)

---

## 1. 準備作業

### システム要件
```bash
- Linux (Ubuntu 20.04+ または CentOS 7+)
- Root アクセス権限
- インターネット接続
- 最小 10GB ディスク容量（バックアップ用）
```

### 前提条件の確認
```bash
# SSH でサーバーにログイン
ssh user@your-server-ip

# Root に切り替え
sudo -i

# スクリプトの存在確認
ls -la /opt/elysia-ai/scripts/

# ファイルが存在することを確認
# - backup-setup.sh
# - log-monitoring-setup.sh
# - fail2ban-setup.sh
# - security-audit-setup.sh
# - complete-security-setup.sh
# - firewall-setup.sh
# - ssh-security.sh
# - ssl-setup.sh
```

---

## 2. セキュリティセットアップの実行

### オプション A: 統合スクリプト（推奨）

すべてのセキュリティ設定を一度に実行：

```bash
# スクリプトディレクトリに移動
cd /opt/elysia-ai/scripts

# 統合セットアップスクリプトを実行
sudo bash complete-security-setup.sh
```

このスクリプトは以下を順序立てて実行します：
1. セキュリティ認証情報の生成
2. ファイアウォール設定
3. SSH強化
4. SSL/TLS設定
5. バックアップ設定
6. ログ監視
7. Fail2Ban設定
8. セキュリティ監査ツール設定

### オプション B: 個別スクリプト実行

各セキュリティ機能を個別に設定する場合：

#### 2.1 ファイアウォール設定

```bash
sudo bash /opt/elysia-ai/scripts/firewall-setup.sh
```

このスクリプトが実行すること：
- UFW（Uncomplicated Firewall）をインストール・設定
- デフォルトポリシー設定（受信拒否、送信許可）
- SSH（22）, HTTP（80）, HTTPS（443）ポートを開放
- Elysia（3000）ポートの設定（選択可能）
- ファイアウォール有効化

**出力例：**
```
✓ UFW Status: active
✓ Firewall rules configured
  - SSH: 22/tcp
  - HTTP: 80/tcp
  - HTTPS: 443/tcp
```

#### 2.2 SSH セキュリティ強化

```bash
sudo bash /opt/elysia-ai/scripts/ssh-security.sh
```

このスクリプトが実行すること：
- SSH設定のバックアップを作成
- パスワード認証を無効化（公開鍵認証のみ）
- Root ログインを禁止
- X11 フォワーディングを無効化
- ブルートフォース攻撃対策（MaxAuthTries=3）
- 強力な暗号スイートの設定
- SSH サービスの再起動

**重要:** 設定変更前に、現在のSSH接続がアクティブなままでテストしてください。

#### 2.3 SSL/TLS 証明書設定

```bash
sudo bash /opt/elysia-ai/scripts/ssl-setup.sh example.com
```

このスクリプトが実行すること：
- Certbot（Let's Encrypt）のインストール
- SSL証明書の生成・インストール
- 自動更新の設定
- Nginx SSL設定テンプレートの作成
- HTTP → HTTPS リダイレクト設定
- セキュリティヘッダーの設定

**パラメータ:**
```bash
# 基本的な使用法
sudo bash ssl-setup.sh example.com

# www サブドメイン付き
sudo bash ssl-setup.sh example.com www

# 複数ドメイン
sudo bash ssl-setup.sh example.com www,api,staging
```

#### 2.4 自動バックアップ設定

```bash
sudo bash /opt/elysia-ai/scripts/backup-setup.sh
```

このスクリプトが実行すること：
- バックアップディレクトリ作成（/backup）
- 自動バックアップスクリプト配置
- PostgreSQL データベースバックアップ
- アプリケーションファイルバックアップ
- アップロード/データバックアップ
- Cron ジョブ設定（毎日 2:00 AM）
- 古いバックアップの自動削除（30日保持）

**バックアップ対象:**
```
- Database: PostgreSQL dump (SQL.gz)
- Application: tar.gz (node_modules 除外)
- Uploads: tar.gz
- Data: tar.gz
```

**手動バックアップ:**
```bash
/opt/backup-elysia-ai.sh

# ログ確認
tail -f /var/log/elysia-backup.log
```

#### 2.5 ログ監視設定

```bash
sudo bash /opt/elysia-ai/scripts/log-monitoring-setup.sh
```

このスクリプトが実行すること：
- ログディレクトリ作成（/var/log/elysia）
- Logrotate 設定（ログローテーション）
- ログ監視スクリプト配置
- Systemd service/timer 設定
- ホーリー監視 Cron ジョブ設定

**ログ監視レポート:**
```bash
# 手動実行
/opt/monitor-elysia-logs.sh

# 出力内容:
# - エラー分析
# - 警告分析
# - セキュリティ監査
# - パフォーマンス指標
# - システムヘルス
```

#### 2.6 Fail2Ban（侵入検出）設定

```bash
sudo bash /opt/elysia-ai/scripts/fail2ban-setup.sh
```

このスクリプトが実行すること：
- Fail2Ban（侵入検出システム）インストール
- API、SSH、DDoS フィルター設定
- Jail ルール設定
- 自動アンバン スクリプト配置
- Cron ジョブで期限切れバンを自動解除

**ルール:**
```
Elysia API:
  - 5 回の失敗で 1 時間ブロック
  - 10 分間のウィンドウ

SSH:
  - 3 回の失敗で 30 分ブロック
  - 10 分間のウィンドウ

SSH DDoS:
  - 10 回の失敗で 10 分ブロック
  - 1 分間のウィンドウ
```

**監視:**
```bash
# 状態確認
fail2ban-client status

# ジェイル状態
fail2ban-client status elysia-api

# 手動モニタリング
/opt/monitor-fail2ban.sh

# ログ確認
tail -f /var/log/fail2ban.log
```

#### 2.7 セキュリティ監査設定

```bash
sudo bash /opt/elysia-ai/scripts/security-audit-setup.sh
```

このスクリプトが実行すること：
- Lynis（セキュリティ監査ツール）インストール
- AIDE（ファイル整合性監視）インストール・設定
- 監査スクリプト配置
- 定期監査スケジュール設定

**監査スケジュール:**
```
- Lynis: 週 1 回（日曜 2:00 AM）
- AIDE: 毎日（3:00 AM）
- 総合監査: 月 1 回（1 日 4:00 AM）
```

**手動実行:**
```bash
# Lynis 監査
/opt/run-security-audit.sh

# AIDE チェック
/opt/run-aide-check.sh

# 総合監査
/opt/comprehensive-security-audit.sh
```

---

## 3. セキュリティ設定の検証

### セットアップ完了後の確認

```bash
# 1. ファイアウォール確認
sudo ufw status
# 出力: Status: active

# 2. Fail2Ban 確認
sudo fail2ban-client status
# 出力: Fail2Ban is running

# 3. SSH 確認
sudo systemctl status ssh
# 出力: Active (running)

# 4. バックアップ確認
ls -la /backup/
# 出力: 最新のバックアップディレクトリが存在

# 5. ログ確認
tail -f /var/log/elysia/elysia.log

# 6. セキュリティスコア確認
/opt/comprehensive-security-audit.sh
```

### 出力例

```
✓ UFW Firewall: Active
✓ Fail2Ban: Active
✓ SSH Service: Active
✓ aide: Installed
✓ lynis: Installed
✓ logrotate: Installed

Security checks: 7/7 passed
```

---

## 4. 本番環境への適用

### 4.1 環境変数の設定

セットアップ完了後、以下の認証情報を `.env` ファイルに設定します：

```bash
# .env ファイルを編集
nano /opt/elysia-ai/.env

# または既存の .env を確認
cat /opt/elysia-ai/.env
```

必須の環境変数：
```bash
# JWT 認証
JWT_SECRET=<生成されたランダム文字列>
JWT_REFRESH_SECRET=<生成されたランダム文字列>

# データベース
DATABASE_URL=postgresql://elysia_user:<password>@localhost/elysia_ai

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TLS=true

# API キー（必要に応じて）
OPENAI_API_KEY=<キー>
```

### 4.2 Docker Compose デプロイ

```bash
# プロジェクトディレクトリに移動
cd /opt/elysia-ai

# Docker Compose でサービス起動
sudo docker-compose up -d

# ステータス確認
sudo docker-compose ps

# ログ確認
sudo docker-compose logs -f
```

### 4.3 Systemd サービス設定

```bash
# サービスファイルを作成
sudo nano /etc/systemd/system/elysia-ai.service

# 内容（例）:
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

# サービスを有効化・起動
sudo systemctl enable elysia-ai
sudo systemctl start elysia-ai
sudo systemctl status elysia-ai
```

---

## 5. 日常的な保守作業

### 5.1 ログ確認

```bash
# エラーログ確認
tail -100 /var/log/elysia/elysia.log | grep -i error

# セキュリティログ確認
tail -50 /var/log/fail2ban.log

# バックアップログ確認
tail -20 /var/log/elysia-backup.log

# システムログ確認
journalctl -u elysia-ai -n 50 -f
```

### 5.2 バックアップ確認

```bash
# バックアップディレクトリ確認
du -sh /backup/
ls -lah /backup/ | head -20

# 最新のバックアップ
ls -lt /backup/ | head -5

# バックアップテスト（毎週推奨）
/opt/backup-elysia-ai.sh
```

### 5.3 セキュリティアップデート

```bash
# アップデート確認
apt list --upgradable | grep -i security

# セキュリティアップデート適用
sudo apt-get update
sudo apt-get upgrade -y

# カーネルアップデート確認
sudo needrestart
```

### 5.4 セキュリティ監査

```bash
# 月 1 回の総合監査
/opt/comprehensive-security-audit.sh

# 監査レポート確認
ls -lah /var/log/elysia/audit/

# 最新のレポート表示
cat /var/log/elysia/audit/comprehensive-audit-*.txt | tail -100
```

---

## 6. トラブルシューティング

### SSH 接続問題

```bash
# SSH サービス確認
sudo systemctl status ssh

# SSH ログ確認
sudo tail -50 /var/log/auth.log | grep ssh

# SSH 設定構文チェック
sudo sshd -t

# SSH 再起動
sudo systemctl restart ssh

# ファイアウォール確認
sudo ufw allow ssh
sudo ufw status
```

### ファイアウォール問題

```bash
# UFW 状態確認
sudo ufw status verbose

# ルール確認
sudo ufw show added

# 特定ポート開放
sudo ufw allow 3000/tcp

# 特定ポート閉鎖
sudo ufw delete allow 3000/tcp

# UFW 再起動
sudo systemctl restart ufw
```

### バックアップ問題

```bash
# バックアップスクリプトテスト
sudo bash /opt/backup-elysia-ai.sh

# ログ確認
tail -f /var/log/elysia-backup.log

# ディスク空き容量確認
df -h /backup

# バックアップ削除（手動）
sudo rm -rf /backup/elysia-YYYYMMDD-HHMMSS
```

### Fail2Ban 問題

```bash
# Fail2Ban サービス再起動
sudo systemctl restart fail2ban

# ジェイル状態確認
sudo fail2ban-client status

# IP 手動アンバン
sudo fail2ban-client set elysia-api banip remove <IP>

# ログ確認
tail -f /var/log/fail2ban.log
```

---

## 7. セキュリティチェックリスト

本番デプロイ前に以下を確認してください：

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

- [ ] SSL/TLS 証明書インストール
  ```bash
  sudo ls /etc/letsencrypt/live/
  ```

- [ ] Fail2Ban 有効
  ```bash
  sudo fail2ban-client status
  ```

- [ ] 自動バックアップ設定
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

- [ ] セキュリティアップデート適用
  ```bash
  apt list --upgradable | grep -i security
  ```

- [ ] データベースパスワード変更
  ```bash
  sudo -u postgres psql
  \password elysia_user
  ```

- [ ] JWT シークレット変更（強力なランダム値）
  ```bash
  grep JWT_SECRET /opt/elysia-ai/.env
  ```

- [ ] ディスク空き容量確認
  ```bash
  df -h
  ```

- [ ] メモリ使用率確認
  ```bash
  free -h
  ```

---

## 8. セキュリティアラート設定

### メール通知の設定

```bash
# Postfix のインストール（メール送信用）
sudo apt-get install -y postfix

# Fail2Ban メール通知設定
sudo nano /etc/fail2ban/jail.d/elysia-api.conf

# 以下を追加:
action = sendmail-whois[name=Elysia, dest=admin@example.com]

# Fail2Ban 再起動
sudo systemctl restart fail2ban
```

### モニタリングダッシュボード（オプション）

Prometheus + Grafana でメトリクスを監視：

```bash
# Prometheus インストール
sudo apt-get install -y prometheus

# Grafana インストール
sudo apt-get install -y grafana-server

# ダッシュボードアクセス
# http://your-server:3000
```

---

## 9. さらに学ぶ

### 参考リソース

- [UFW（ファイアウォール）ドキュメント](https://help.ubuntu.com/community/UFW)
- [Fail2Ban 公式ドキュメント](https://www.fail2ban.org/wiki/index.php/Main_Page)
- [Let's Encrypt 情報](https://letsencrypt.org/)
- [Lynis セキュリティ監査](https://cisofy.com/lynis/)
- [AIDE ファイル整合性](https://aide.github.io/)

### セキュリティベストプラクティス

1. **定期的な更新**: 週 1 回以上のセキュリティアップデート確認
2. **ログ監視**: 毎日のログレビュー
3. **バックアップテスト**: 月 1 回の復元テスト
4. **アクセス制御**: 最小権限の原則を適用
5. **監査**: 月 1 回の包括的なセキュリティ監査
6. **インシデント対応**: セキュリティ問題の早期検出・対応

---

## 10. サポートと連絡先

セキュリティに関する質問や問題がある場合：

- **ログファイル**: `/var/log/elysia/`, `/var/log/fail2ban.log`
- **ドキュメント**: `PRODUCTION_SETUP_GUIDE.md`
- **ヘルプコマンド**: `man <コマンド名>`

---

**最後更新**: 2025年12月6日
**バージョン**: 1.0
**ステータス**: 本番環境対応
