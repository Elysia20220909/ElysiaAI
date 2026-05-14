# ⚙️ ElysiaAI: 環境変数ガイド (Environment Variables)

ElysiaAI の動作をカスタマイズするための環境変数の一覧です。これらの変数は、プロジェクトルートの `.env` ファイルに記述するか、実行環境のシステム変数として設定してください。

## 核心設定 (Core Settings)

| 変数名 | デフォルト値 | 説明 |
| :--- | :--- | :--- |
| `PORT` | `3000` | ElysiaAI サーバーの待ち受けポート。 |
| `NODE_ENV` | `development` | `development` または `production`。本番環境では必ず `production` を指定してください。 |
| `DB_URL` | (必須) | データベースへの接続文字列 (SQLite/PostgreSQL)。 |
| `SESSION_SECRET` | `dev_secret` | セッション暗号化用の秘密鍵。本番環境では必ずユニークな文字列を設定してください。 |

## セキュリティ (Security Hardening)

| 変数名 | デフォルト値 | 説明 |
| :--- | :--- | :--- |
| `ELYSIA_TEST_MODE` | `0` | `1` に設定すると、AI Kernelをモックし、テスト用のアカウントバイパスを有効にします。 |
| `FORCE_HTTPS` | `false` | `true` に設定すると、常に HSTS ヘッダーを送信します。 |
| `CSP_ENABLED` | `true` | コンテンツセキュリティポリシー (CSP) を有効にします。 |
| `REDIS_ENABLED` | `true` | レート制限とセッション管理に Redis を使用するかどうか。 |

## AI & 外部連携 (AI & Integrations)

| 変数名 | デフォルト値 | 説明 |
| :--- | :--- | :--- |
| `OLLAMA_URL` | `http://localhost:11434` | ローカルの Ollama サーバーの URL。 |
| `MILVUS_URL` | `data/milvus.db` | Milvus Lite のデータベースファイルパス。 |
| `VOICEVOX_URL` | `http://localhost:50021` | VOICEVOX エンジンの URL。 |
| `ELYSIA_USER_NAME` | `User` | Python ペルソナエンジンがプロンプト内で使う表示名。 |
| `ELYSIA_OPERATOR_CODENAME` | (空) | 表示名に添える任意のコードネーム。プロンプト注入を避けるため制御文字は除去されます。 |
| `TAKUMI_WEBHOOK_SIGNING_SECRET` | (空) | Takumi byGMO / Shisho Cloud Webhook Endpoint の署名検証用シークレット。登録画面で一度だけ表示されるため、安全なシークレット管理に保存してください。 |

---
> [!TIP]
> 開発環境では `.env.example` をコピーして `.env` を作成し、必要な値を編集することをお勧めします。

© 2026 Elysia20220909 // ElysiaAI
