# 本番デプロイチェックリスト 🚀

## ✅ 事前準備完了状況

### インフラストラクチャ

- ✅ **Dockerfile.production**: マルチステージビルド対応（Bun + Python統合）
- ✅ **docker-compose.yml**: フルスタック構成（Elysia + FastAPI + Redis + Ollama）
- ✅ **監視スタック**: Prometheus + Grafana + Alertmanager（Docker未インストール）
- ✅ **AWS CloudFormation**: ECS Fargate自動デプロイ対応
- ✅ **GCP Cloud Build**: Cloud Runサーバーレスデプロイ対応

### コード品質

- ✅ **単体テスト**: 15/19 テスト合格（Redis依存4テストは環境依存）
- ✅ **E2Eテスト**: Playwright + Chromium準備完了（サーバー起動後実行可能）
- ✅ **負荷テスト**: autocannon統合PowerShellスクリプト準備完了
- ✅ **エンタープライズ機能**: ヘルスチェック、メトリクス、ロギング、i18n、テレメトリ実装済み

### セキュリティ

- ✅ **JWT認証**: トークンベース認証実装済み
- ✅ **レート制限**: エンドポイント別制限設定済み
- ✅ **CSPヘッダー**: Content Security Policy設定済み
- ✅ **HTTPS強制**: 本番環境用設定準備済み

---

## 🔧 デプロイ前に実施すること

### 1. 環境変数設定（必須）

#### `.env`ファイル作成

```powershell
# .env.exampleをコピー
Copy-Item .env.example .env
```

#### 重要な環境変数の設定

必ず変更が必要な項目：

```bash
# 🔐 セキュリティ（必須変更）
JWT_SECRET=<openssl rand -hex 32で生成>
JWT_REFRESH_SECRET=<openssl rand -hex 32で生成>
AUTH_PASSWORD=<強力なパスワード>
SESSION_SECRET=<セッション用シークレット>

# 🚀 本番環境設定
NODE_ENV=production
FORCE_HTTPS=true
PORT=3000
FASTAPI_PORT=8000
HOST=0.0.0.0
ALLOWED_ORIGINS=https://your-domain.com

# 📊 監視（推奨）
PROMETHEUS_ENABLED=true
HEALTH_CHECK_ENABLED=true

# ☁️ クラウドプロバイダー（使用する場合）
# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<IAMユーザーのアクセスキー>
AWS_SECRET_ACCESS_KEY=<IAMユーザーのシークレットキー>

# GCP
GCP_PROJECT_ID=<プロジェクトID>
GCP_REGION=us-central1
```

### 2. 依存サービスの準備

#### Redis（キャッシュ＆レート制限用）

**オプションA: Dockerで起動**

```powershell
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

**オプションB: Windows用Redisインストール**

```powershell
# https://github.com/microsoftarchive/redis/releases
# インストール後サービス起動
```

**オプションC: Redis無効化**

```bash
# .envファイル
REDIS_ENABLED=false  # インメモリレート制限にフォールバック
```

#### Ollama（AI推論用）

```powershell
# Ollamaインストール: https://ollama.ai/download
ollama pull llama3.2
ollama serve
```

#### FastAPI（RAGバックエンド）

```powershell
# Python環境セットアップ
pip install -r requirements.txt

# サーバー起動（別ターミナル）
python -m uvicorn python.fastapi_server:app --host 127.0.0.1 --port 8000
```

### 3. ビルドとテスト

#### 本番ビルド実行

```powershell
# 依存関係インストール
bun install --frozen-lockfile

# 本番ビルド
bun run build

# ビルド成果物確認
dir dist
```

#### テスト実行

```powershell
# 単体テスト
bun test

# E2Eテスト（サーバー起動後）
bun run dev  # 別ターミナル
bunx playwright test

# 負荷テスト
.\scripts\load-test.ps1 -Report
```

### 4. セキュリティチェック

```powershell
# 脆弱性スキャン
bun audit

# 依存関係更新確認
bun outdated

# コード品質チェック
bun run lint
bun run format
```

---

## 🐳 デプロイ方法

### 方法1: Docker Compose（推奨）

#### 基本構成（Elysia + FastAPI + Redis）

```powershell
# イメージビルド
docker build -f Dockerfile.production -t elysia-ai:latest .

# サービス起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# ヘルスチェック
curl http://localhost:3000/
curl http://localhost:3000/health
```

#### 完全構成（+ Ollama + Nginx）

```powershell
docker-compose --profile with-ollama --profile with-nginx up -d
```

#### 監視スタック起動

```powershell
cd monitoring
docker-compose up -d

# Grafana: http://localhost:3001 (ADMIN/<redacted>)
# Prometheus: http://localhost:9090
# Alertmanager: http://localhost:9093
```

### 方法2: AWS ECS Fargate

#### 前提条件

- AWS CLI インストール済み
- Docker インストール済み
- IAM認証情報設定済み

#### デプロイ実行

```bash
# 環境変数設定
export AWS_REGION=us-east-1
export STACK_NAME=elysia-ai-prod
export ECR_REPO_NAME=elysia-ai

# デプロイスクリプト実行
cd cloud/aws
bash deploy.sh

# または npm scriptsから
npm run aws:deploy
```

#### デプロイされるリソース

- VPC + Subnets（パブリック×2）
- Application Load Balancer
- ECS Fargate Cluster
- ECR Repository
- CloudWatch Logs
- Auto Scaling（1-3タスク）

#### デプロイ後の確認

```bash
# ALB URL取得
aws cloudformation describe-stacks \
  --stack-name elysia-ai-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
  --output text

# ログ確認
aws logs tail /ecs/elysia-ai-prod --follow

# サービス更新（新イメージデプロイ時）
aws ecs update-service \
  --cluster elysia-ai-prod-Cluster \
  --service elysia-ai-prod-service \
  --force-new-deployment
```

### 方法3: Google Cloud Run

#### 前提条件

- Google Cloud SDK インストール済み
- プロジェクト作成済み
- 課金アカウント有効化済み

#### デプロイ実行

```bash
# 環境変数設定
export GCP_PROJECT_ID=your-project-id
export GCP_REGION=us-central1

# デプロイスクリプト実行
cd cloud/gcp
bash deploy.sh

# または npm scriptsから
npm run gcp:deploy
```

#### デプロイされるリソース

- Container Registry（イメージ保存）
- Cloud Run Service（サーバーレス実行）
- Cloud Build Trigger（CI/CD）
- Load Balancer（HTTPSエンドポイント）

#### デプロイ後の確認

```bash
# サービスURL取得
gcloud run services describe elysia-ai \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'

# ログ確認
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

---

## 📊 デプロイ後の監視

### ヘルスチェック

```powershell
# 基本ヘルスチェック
curl http://your-domain.com/health

# 詳細ヘルスチェック
curl http://your-domain.com/health/detailed

# メトリクス確認
curl http://your-domain.com/metrics
```

### ログ確認

#### Docker Compose環境

```powershell
docker-compose logs -f elysia-ai
docker-compose logs -f fastapi
```

#### Kubernetes環境

```bash
kubectl logs -f deployment/elysia-ai -n production
kubectl logs -f deployment/fastapi -n production
```

#### ローカルログファイル

```powershell
Get-Content logs/app.log -Tail 50 -Wait
Get-Content logs/error.log -Tail 50 -Wait
```

### Prometheus + Grafana

1. Grafanaにアクセス: http://localhost:3001
2. 初回ログイン: admin / <redacted>
3. データソース追加:
   - Type: Prometheus
   - URL: http://prometheus:9090
4. ダッシュボードインポート:
   - Node Exporter Full (ID: 1860)
   - Redis Dashboard (ID: 11835)

### アラート設定

```yaml
# monitoring/alertmanager/config.yml 編集例
receivers:
  - name: "slack"
    slack_configs:
      - api_url: "YOUR_SLACK_WEBHOOK_URL"
        channel: "#alerts"
        title: "Elysia AI Alert"
```

---

## 🚨 トラブルシューティング

### Redis接続エラー

```powershell
# Redis起動確認
docker ps | Select-String redis

# 手動接続テスト
telnet localhost 6379

# 環境変数確認
echo $env:REDIS_URL
```

### Ollama接続エラー

```powershell
# Ollama起動確認
curl http://localhost:11434/api/tags

# モデル再プル
ollama pull llama3.2
```

### Docker ビルドエラー

```powershell
# キャッシュクリア
docker builder prune

# 詳細ログ付き再ビルド
docker build -f Dockerfile.production -t elysia-ai:latest . --no-cache --progress=plain
```

### AWS デプロイエラー

```bash
# スタック状態確認
aws cloudformation describe-stacks --stack-name elysia-ai-prod

# イベント履歴
aws cloudformation describe-stack-events --stack-name elysia-ai-prod --max-items 20

# スタック削除（やり直し）
aws cloudformation delete-stack --stack-name elysia-ai-prod
```

### GCP デプロイエラー

```bash
# ビルド履歴
gcloud builds list --limit=5

# サービス状態
gcloud run services describe elysia-ai --region us-central1

# リビジョン一覧
gcloud run revisions list --service elysia-ai --region us-central1
```

---

## 📝 デプロイ記録テンプレート

````markdown
## デプロイ記録: YYYY-MM-DD HH:MM

### 環境

- デプロイ先: [AWS/GCP/Docker Compose]
- リージョン: [us-east-1/us-central1/localhost]
- イメージタグ: [latest/v1.0.0]

### 変更内容

- [ ] 新機能追加
- [ ] バグ修正
- [ ] パフォーマンス改善
- [ ] セキュリティ更新

### チェックリスト

- [ ] 環境変数更新
- [ ] データベースマイグレーション実行
- [ ] テスト全件合格
- [ ] ヘルスチェック正常
- [ ] ログ確認正常
- [ ] モニタリングアラート設定

### 実行コマンド

\```bash
[実行したコマンドを記録]
\```

### デプロイ結果

- ビルド時間: XX分
- デプロイ時間: XX分
- ダウンタイム: なし/XX秒
- 初回ヘルスチェック応答時間: XXms

### ロールバック手順（必要時）

\```bash
[ロールバックコマンド]
\```

### 備考

[特記事項があれば記載]
````

---

## ✅ 最終チェックリスト

### デプロイ前

- [ ] `.env`ファイル作成・全項目設定
- [ ] JWT_SECRET等のシークレット変更済み
- [ ] Redis起動確認
- [ ] Ollama起動・モデルダウンロード済み
- [ ] FastAPI起動確認
- [ ] 本番ビルド成功
- [ ] 全テスト合格
- [ ] セキュリティ監査完了
- [ ] バックアップ取得（既存環境の場合）

### デプロイ中

- [ ] ビルドログ確認
- [ ] デプロイログ確認
- [ ] ヘルスチェック応答確認
- [ ] エラーログ監視

### デプロイ後

- [ ] ヘルスチェックエンドポイント正常
- [ ] メトリクスエンドポイント正常
- [ ] チャット機能動作確認
- [ ] 音声合成機能動作確認
- [ ] RAG検索動作確認
- [ ] SSL証明書有効（本番環境）
- [ ] Grafanaダッシュボード表示確認
- [ ] アラートルール動作確認
- [ ] 負荷テスト実施・結果記録

---

## 📚 関連ドキュメント

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 総合デプロイガイド
- [cloud/README.md](./cloud/README.md) - クラウドデプロイ詳細
- [monitoring/docker-compose.yml](./monitoring/docker-compose.yml) - 監視スタック構成
- [scripts/load-test.ps1](./scripts/load-test.ps1) - 負荷テストスクリプト
- [SECURITY.md](./docs/SECURITY.md) - セキュリティポリシー
