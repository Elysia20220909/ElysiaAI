# Operations Runbook

要約: D2Checkpoint の灯を安全に延ばすための、4日間の最小運用手順です。ElysiaAI など同じ構成のサービスにも、環境変数を差し替えるだけで転用できます。

## 基本方針

- 守るものは Git、DB、アップロード資産の3点です。
- 秘密情報は `.env` や Vault / 1Password などに置き、リポジトリには入れません。
- 外部ストレージは `BACKUP_S3_URI` または `BACKUP_DEST_DIR` を明示したときだけ使います。
- S3 は既定で SSE-AES256 を使います。ローカル退避先は暗号化済みディスクやNASを選びます。
- バックアップは「最新 + 直近2世代」を最低ラインにし、月1回は実際に復元します。

## Day 1: オフサイト・バックアップ

目的: Git、Postgres、アップロード資産を、サーバー外へ退避します。

S3へ送る例:

```bash
APP_NAME=d2checkpoint \
BACKUP_S3_URI=s3://d2checkpoint-backups \
UPLOADS_DIR=/var/www/uploads \
PGHOST=127.0.0.1 PGUSER=d2checkpoint PGPASS="$D2CHECKPOINT_PGPASS" PGDATABASE=d2checkpoint \
bash scripts/backup-offsite.sh
```

NASやマウント済みディスクへ送る例:

```bash
APP_NAME=d2checkpoint \
BACKUP_DEST_DIR=/mnt/offsite/d2checkpoint-backups \
UPLOADS_DIR=/var/www/uploads \
PGHOST=127.0.0.1 PGUSER=d2checkpoint PGPASS="$D2CHECKPOINT_PGPASS" PGDATABASE=d2checkpoint \
bash scripts/backup-offsite.sh
```

確認:

```bash
ls -lah /mnt/offsite/d2checkpoint-backups
aws s3 ls s3://d2checkpoint-backups/
```

## Day 2: ヘルスチェックと自動再起動

目的: 落ちたら一度だけ起こし、戻らなければ人間へ知らせます。

systemd サービスの例:

```bash
sudo install -m 0755 scripts/healthcheck.sh /usr/local/bin/d2-healthcheck.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * HEALTHCHECK_URL=https://d2checkpoint.com/healthz SERVICE_NAME=d2checkpoint.service ALERT_EMAIL=ops@example.com /usr/local/bin/d2-healthcheck.sh >/dev/null 2>&1") | crontab -
```

Docker Compose の例:

```bash
HEALTHCHECK_URL=http://127.0.0.1:3000/health \
RESTART_COMMAND='docker compose restart app' \
ALERT_EMAIL=ops@example.com \
bash scripts/healthcheck.sh
```

擬似テスト:

```bash
HEALTHCHECK_URL=http://127.0.0.1:9/health \
RESTART_COMMAND='printf "restart-tested\n"' \
bash scripts/healthcheck.sh
```

## Day 3: 短く正直なお知らせ

目的: 継続方針、協力募集、連絡窓口を明確にします。言葉は短く、誠実に。長く燃える火ほど、透明な空気を必要とします。

```text
Title: D2Checkpoint - 継続性チェック

できる限り稼働を維持するため、オフサイトバックアップ、自動ヘルスチェック、最小復旧手順を整備しました。

ミラー/再ホスト協力歓迎: Discord <link>
必要となれば14日以上前に告知し、寄付/引き継ぎ手順を案内します。
```

## Day 4: 依存固定と最小復旧手順

目的: 別の人でも短時間で復旧できる状態にします。

依存固定:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
```

復旧メモ:

```bash
# Git bundle から復元
git clone /mnt/offsite/d2checkpoint-backups/2026-05-29T120000Z/git-d2checkpoint-2026-05-29T120000Z.bundle d2checkpoint

# DB を復元
pg_restore --clean --if-exists -d d2checkpoint db-d2checkpoint-2026-05-29T120000Z.dump

# Uploads を復元
aws s3 sync s3://d2checkpoint-backups/uploads-2026-05-29T120000Z/ /var/www/uploads/

# サービス起動
docker compose up -d
# または
sudo systemctl start d2checkpoint.service
```

資格情報の棚卸:

- GitHub 所有者、保守者、デプロイ鍵
- コンテナレジストリ、イメージタグ、リリース手順
- Postgres 接続情報、バックアップ復号鍵
- S3 / オブジェクトストレージ、保持ルール、暗号化設定
- Cron、systemd timer、メール中継、通知先
- DNS、CDN、TLS 証明書、ドメイン更新者

## 5分仕上げチェック

- [ ] Git bundle を別ディレクトリへ clone できる
- [ ] `pg_restore --list db-*.dump` が成功する
- [ ] uploads バックアップに最新ファイルが入っている
- [ ] `/health` または `/healthz` が落下したとき、再起動と通知が動く
- [ ] お知らせを固定ピン留めし、Discord などの連絡窓口へ案内した
- [ ] この `OPERATIONS.md` と実際のサーバー名、URL、連絡先が一致している
