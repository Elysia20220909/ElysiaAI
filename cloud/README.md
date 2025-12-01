# Elysia AI - Cloud Deployment

クラウドプラットフォーム対応 - AWS、Google Cloud、Docker対応 🌸

## サポート環境

- ✅ **AWS ECS Fargate** - Auto-scaling containerized deployment
- ✅ **Google Cloud Run** - Serverless container platform
- ✅ **Docker** - Universal container deployment
- ✅ **Kubernetes** - Enterprise orchestration (coming soon)

## Quick Start

### Docker Compose (推奨・開発用)

```bash
# フルスタック起動
docker-compose up -d

# Ollamaも含めて起動
docker-compose --profile with-ollama up -d

# Nginxリバースプロキシ付き
docker-compose --profile with-nginx up -d

# すべてのサービス
docker-compose --profile with-ollama --profile with-nginx --profile with-cache up -d
```

### AWS ECS Fargate

```bash
cd cloud/aws

# 環境変数設定
export AWS_REGION=us-east-1
export STACK_NAME=elysia-ai-prod
export ECR_REPO_NAME=elysia-ai

# デプロイ実行
chmod +x deploy.sh
./deploy.sh
```

### Google Cloud Run

```bash
cd cloud/gcp

# 環境変数設定
export GCP_PROJECT_ID=your-project-id
export GCP_REGION=us-central1
export SERVICE_NAME=elysia-ai

# デプロイ実行
chmod +x deploy.sh
./deploy.sh
```

## Architecture

### Production Stack

```
┌─────────────────────────────────────┐
│   Load Balancer (ALB/Cloud Run)     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Elysia AI Container            │
│  ┌────────────┬─────────────┐       │
│  │ Bun Server │ FastAPI RAG │       │
│  │  (Port 3000)│ (Port 8000) │       │
│  └────────────┴─────────────┘       │
└─────────────────────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   External Services (Optional)      │
│  ┌────────┬──────────┬────────┐     │
│  │ Ollama │  Redis   │  RDS   │     │
│  └────────┴──────────┴────────┘     │
└─────────────────────────────────────┘
```

## AWS Deployment

### Prerequisites

- AWS CLI configured
- Docker installed
- IAM permissions for ECS, ECR, CloudFormation

### Infrastructure

CloudFormationスタックで以下を自動作成:

- **VPC**: 2 AZ, Public Subnets
- **ALB**: Application Load Balancer with health checks
- **ECS Fargate**: Auto-scaling container service
- **ECR**: Private container registry
- **CloudWatch**: Logging and monitoring
- **Security Groups**: Least privilege access

### Configuration

`cloudformation.yaml`のパラメータ:

- `Environment`: development/staging/production
- `DesiredCount`: タスク数 (default: 2)
- `ContainerImage`: ECRイメージURI
- `VpcCIDR`: VPCのCIDRブロック

### Monitoring

```bash
# ログ確認
aws logs tail /ecs/elysia-ai-prod --follow

# サービス状態
aws ecs describe-services \
  --cluster elysia-ai-prod-Cluster \
  --services elysia-ai-prod-service

# メトリクス
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=elysia-ai-prod-service
```

## Google Cloud Deployment

### Prerequisites

- gcloud CLI configured
- Docker installed
- GCP project with billing enabled

### Infrastructure

Cloud Buildで自動デプロイ:

- **Cloud Run**: フルマネージドコンテナ
- **Container Registry**: プライベートレジストリ
- **Cloud Build**: CI/CDパイプライン
- **Cloud Logging**: ログ管理
- **Auto-scaling**: 1-10インスタンス

### Configuration

`app.yaml`の設定:

- `memory_gb`: メモリ割り当て (default: 2GB)
- `cpu`: CPU数 (default: 1)
- `max_num_instances`: 最大インスタンス数

### Monitoring

```bash
# ログ確認
gcloud run services logs read elysia-ai

# サービス詳細
gcloud run services describe elysia-ai --region=us-central1

# メトリクス
# Cloud Consoleでグラフィカルに確認
```

## Docker Configuration

### Development

```bash
# ローカルビルド
docker build -t elysia-ai:dev .

# 実行
docker run -p 3000:3000 -p 8000:8000 elysia-ai:dev
```

### Production

```bash
# 最適化ビルド
docker build -f Dockerfile.production -t elysia-ai:prod .

# マルチステージビルドで最小化
docker images elysia-ai:prod  # サイズ確認
```

### Docker Compose Services

- **elysia**: メインアプリケーション
- **ollama**: LLMランタイム (GPU対応)
- **nginx**: リバースプロキシ
- **redis**: キャッシュ層

## Environment Variables

### Required

```bash
NODE_ENV=production
PORT=3000
PYTHON_PORT=8000
```

### Optional

```bash
RAG_API_URL=http://localhost:8000/rag
OLLAMA_HOST=http://ollama:11434
REDIS_URL=redis://redis:6379
```

## Health Checks

### HTTP Endpoints

- `GET /` - Main health check
- `GET /health` - Detailed status (FastAPI)

### Docker Health Check

```bash
# コンテナ状態確認
docker ps --format "table {{.Names}}\t{{.Status}}"

# ヘルスチェックログ
docker inspect --format='{{json .State.Health}}' elysia-ai-server
```

## Scaling

### AWS ECS

```bash
# サービススケール
aws ecs update-service \
  --cluster elysia-ai-prod-Cluster \
  --service elysia-ai-prod-service \
  --desired-count 5
```

### Google Cloud Run

```bash
# 自動スケール設定
gcloud run services update elysia-ai \
  --min-instances=2 \
  --max-instances=20 \
  --region=us-central1
```

## Cost Optimization

### AWS

- **Fargate Spot**: 70%コスト削減
- **Auto-scaling**: 使用量に応じた課金
- **ALB**: リクエストベース課金

### GCP

- **Cloud Run**: リクエスト単位課金
- **Always Free**: 月200万リクエスト無料
- **CPU割り当て**: アイドル時課金なし

## Security

### AWS

- VPC内プライベートサブネット
- Security Group最小権限
- IAM Role-based access
- ECRイメージスキャン

### GCP

- Cloud Run IAM認証
- VPC Connector (オプション)
- Secret Manager統合
- Vulnerability scanning

## Troubleshooting

### コンテナが起動しない

```bash
# ログ確認
docker-compose logs -f elysia

# デバッグモードで起動
docker-compose run --rm elysia sh
```

### メモリ不足

```yaml
# docker-compose.yml
services:
  elysia:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

### ネットワークエラー

```bash
# ネットワーク再作成
docker-compose down
docker network prune
docker-compose up -d
```

## CI/CD Integration

### GitHub Actions (推奨)

```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to AWS
        run: ./cloud/aws/deploy.sh
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    - ./cloud/gcp/deploy.sh
  only:
    - main
```

## License

MIT License - See root LICENSE file
