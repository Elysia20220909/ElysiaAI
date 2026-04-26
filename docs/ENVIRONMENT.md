# 🌍 ElysiaAI 環境変数ガイド

ElysiaAI の動作をカスタマイズするための環境変数の一覧です。
これらの変数は、プロジェクトルートの `.env` ファイルに記述するか、実行環境のシステム変数として設定してください。

## 🔑 必須・重要 (Core Settings)
| 変数名 | デフォルト値 | 説明 |
|--------|--------------|------|
| `PORT` | `3000` | ElysiaAI サーバーの待受ポート。 |
| `NODE_ENV` | `development` | `development` または `production`。本番環境では必ず `production` を指定してください。 |
| `DB_URL` | (必須/本番) | データベースへの接続文字列。 |
| `SESSION_SECRET` | `dev_secret_only` | セッション暗号化用の秘密鍵。本番環境では必ずユニークな文字列を設定してください。 |

## 🛡️ セキュリティ (Security Hardening)
| 変数名 | デフォルト値 | 説明 |
|--------|--------------|------|
| `FORCE_HTTPS` | `false` | `true` に設定すると、常に HSTS (Strict-Transport-Security) ヘッダーを送信します。 |
| `CSP_ENABLED` | `true` | コンテンツセキュリティポリシー (CSP) ヘッダーを有効にします。 |
| `ERROR_ALERTS_ENABLED` | `false` | エラー発生時の Webhook 通知を有効にします。 |

## 📢 通知 (Notifications)
| 変数名 | 説明 |
|--------|------|
| `DISCORD_WEBHOOK_URL` | エラー通知を送信する Discord Webhook の URL。 |
| `SLACK_WEBHOOK_URL` | エラー通知を送信する Slack Webhook の URL。 |

## ⚙️ 開発・デバッグ (Development)
| 変数名 | デフォルト値 | 説明 |
|--------|--------------|------|
| `DEBUG` | `false` | 詳細なログ出力を有効にします。 |

---
> [!TIP]
> 開発環境では `.env.example` をコピーして `.env` を作成し、必要な値を編集することをお勧めします。
