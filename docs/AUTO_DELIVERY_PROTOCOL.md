# 自動配信プロトコル

## 要約

自動配信プロトコルは、ElysiaAI の定期運用、通知、バックアップ、監視をひとつの起動儀式として束ねるための運用契約です。

- ローカルファーストを守り、外部送信は明示的に設定された Webhook とメールだけに限定します。
- 定期タスクはログに残し、管理 API から状態を確認できるようにします。
- デスクトップ、ゲーム、隠れた入力操作の自動化は扱いません。

## 目的

このプロトコルは、夜番の灯を絶やさないためのものです。大げさな魔法ではなく、古くから信頼されてきた運用の型を、ElysiaAI のローカル優先設計に合わせて整えます。

- レポート、バックアップ、ヘルスチェック、ログ整理を起動時に準備する。
- Redis がある環境では BullMQ を使い、ない環境ではメモリ内フォールバックで止まらない。
- Discord、Slack、カスタム Webhook、メール通知は、設定済みの宛先だけに配信する。
- 秘密情報、トークン、Webhook URL は本文やステータスに出さない。

## 起動されるレーン

| レーン | 実装 | 役割 |
| --- | --- | --- |
| Queue | `packages/server/src/lib/job-queue.ts` | メール、レポート、Webhook、クリーンアップを非同期化する。 |
| Cron | `packages/server/src/lib/cron-scheduler.ts` | 日次、週次、月次の定期ジョブを登録する。 |
| Backup | `packages/server/src/lib/backup-scheduler.ts` | SQLite バックアップと世代管理を行う。 |
| Health | `packages/server/src/lib/health-monitor.ts` | DB、Ollama、Redis、ディスク容量を監視する。 |
| Logs | `packages/server/src/lib/log-cleanup.ts` | 古いログや大きすぎるログを整理する。 |
| Webhook | `packages/server/src/lib/webhook-events.ts` | 重要イベントを外部の司令室へ届ける。 |

## 管理 API

管理者または owner ロールで、次の API から状態を確認できます。

```text
GET /admin/delivery-protocol
GET /admin/jobs/stats
GET /admin/webhooks
GET /admin/backups
GET /admin/health-monitor
GET /admin/logs/cleanup
```

`GET /admin/delivery-protocol` は、プロトコル全体の起動状態、各レーンの統計、現在有効な配信先の種類を返します。実際の Webhook URL やシークレットは返しません。

## 主な環境変数

```env
REDIS_ENABLED=false
REDIS_URL=redis://127.0.0.1:6379

DAILY_REPORT_ENABLED=false
WEEKLY_REPORT_ENABLED=false
MONTHLY_REPORT_ENABLED=false

AUTO_BACKUP_ENABLED=false
BACKUP_INTERVAL_MINUTES=60
MAX_BACKUP_GENERATIONS=7
BACKUP_DIR=./backups

HEALTH_MONITORING_ENABLED=true
LOG_CLEANUP_ENABLED=true
FILE_CLEANUP_CRON_ENABLED=false

DISCORD_WEBHOOK_URL=
SLACK_WEBHOOK_URL=
CUSTOM_WEBHOOK_URL=
CUSTOM_WEBHOOK_SECRET=

EMAIL_NOTIFICATIONS_ENABLED=false
ADMIN_EMAIL=
```

## 配信ルール

- `backup.completed` は、バックアップ成功時に Slack などの設定済み購読先へ送ります。
- `error.critical` は、バックアップ失敗や重大エラーの通知に使います。
- `system.health_check_failed` は、ヘルスチェックがしきい値を超えて失敗したときに送ります。
- `send-webhook` ジョブは、Queue レーンを経由してイベント配信を行います。

## 運用手順

1. `.env` で必要なレーンだけを有効化します。
2. `bun run dev` または `bun run start` でサーバーを起動します。
3. `GET /admin/delivery-protocol` で起動状態を確認します。
4. 必要に応じて `POST /admin/backups/trigger` や `POST /admin/logs/cleanup/trigger` で手動実行します。

## ガードレール

- 自動配信は、ログに残るサーバー側の保守処理だけに限定します。
- 外部送信は、設定済みの宛先にだけ行います。
- 秘密情報はステータス API、ログ、配信本文に載せません。
- 破壊的な削除や OS 入力操作は、このプロトコルの対象外です。

## 障害時の見方

- Queue が `in-memory-fallback` の場合、Redis 未使用または接続不可でも最低限の処理は継続します。
- Cron の `enabledTasks` が 0 の場合、環境変数で定期レポートや監視ジョブが無効になっています。
- Webhook 配信失敗はログに記録されます。URL やシークレットは `.env` 側で確認してください。
- ヘルス監視の連続失敗は、しきい値を超えた時点で通知されます。
