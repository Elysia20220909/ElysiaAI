# Elysia AI - Swift Integration

iOS/macOSネイティブクライアント、Docker、AWS/GCP対応を追加しました！

## 🌸 新機能

### Swift Native Client

- **swift/** ディレクトリに完全なSwiftパッケージを実装
- iOS 15+ / macOS 12+ サポート
- Async/Await対応のストリーミングAPI
- CLIツール付き

```bash
cd swift
swift build
swift run ElysiaAICLI
```

### Docker対応強化

- **Dockerfile.production**: マルチステージビルドで最適化
- **docker-compose.yml**: フルスタック構成（Elysia + FastAPI + Ollama + Redis + Nginx）
- 本番環境対応のヘルスチェック

```bash
# 基本起動
docker-compose up -d

# Ollama含む完全構成
docker-compose --profile with-ollama --profile with-nginx up -d
```

### AWS ECS Fargate

- **cloud/aws/cloudformation.yaml**: インフラ自動構築
- VPC、ALB、ECS、ECR、CloudWatch完全対応
- オートスケーリング設定済み

```bash
cd cloud/aws
export AWS_REGION=us-east-1
export STACK_NAME=elysia-ai-prod
./deploy.sh
```

### Google Cloud Run

- **cloud/gcp/cloudbuild.yaml**: CI/CDパイプライン
- サーバーレスデプロイ
- 自動スケーリング（1-10インスタンス）

```bash
cd cloud/gcp
export GCP_PROJECT_ID=your-project-id
./deploy.sh
```

## 📦 新しいファイル構造

```plaintext
elysia-ai/
├── swift/                          # Swift統合
│   ├── Package.swift              # Swift Package Manager
│   ├── Sources/
│   │   ├── ElysiaAI/
│   │   │   └── ElysiaClient.swift # メインクライアント
│   │   └── ElysiaAICLI/
│   │       └── main.swift          # CLIツール
│   └── README.md
├── cloud/                          # クラウドデプロイ
│   ├── aws/
│   │   ├── cloudformation.yaml    # AWS IaC
│   │   └── deploy.sh              # AWSデプロイスクリプト
│   ├── gcp/
│   │   ├── app.yaml               # App Engine設定
│   │   ├── cloudbuild.yaml        # Cloud Build CI/CD
│   │   └── deploy.sh              # GCPデプロイスクリプト
│   └── README.md                   # クラウドデプロイガイド
├── Dockerfile.production           # 本番用マルチステージビルド
└── docker-compose.yml              # フルスタック構成
```

## 🚀 クイックスタート

### Swift CLIを試す

```bash
cd swift
swift run ElysiaAICLI
```

### Dockerで起動

```bash
npm run docker:build
npm run docker:up
npm run docker:logs
```

### AWSにデプロイ

```bash
npm run aws:deploy
```

### GCPにデプロイ

```bash
npm run gcp:deploy
```

## 📚 詳細ドキュメント

- Swift統合: `swift/README.md`
- クラウドデプロイ: `cloud/README.md`
- AWS設定: `cloud/aws/`
- GCP設定: `cloud/gcp/`

## ✨ 主な改善点

1. **Swift Native Client**

   - AsyncHTTPClient使用
   - ストリーミング対応
   - iOS/macOSネイティブサポート

2. **Docker最適化**

   - マルチステージビルドでサイズ削減
   - Bun + Python統合
   - ヘルスチェック実装

3. **AWS対応**

   - CloudFormation自動化
   - ECS Fargate + Spot
   - ALB + Auto-scaling

4. **GCP対応**

   - Cloud Build CI/CD
   - Cloud Run serverless
   - 自動スケーリング

すべて実装完了しました！ 🎉
