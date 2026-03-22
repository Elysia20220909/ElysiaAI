# 本番環境用 PowerShell デプロイスクリプト
# Usage: .\scripts\deploy-production.ps1 [-Environment docker|aws|gcp] [-SkipTests] [-SkipBuild]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('docker', 'aws', 'gcp')]
    [string]$Environment = 'docker',
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# カラー出力関数
function Write-Success { param([string]$Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param([string]$Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Warning { param([string]$Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Step { param([string]$Message) Write-Host "`n🔹 $Message" -ForegroundColor Blue }

# バナー表示
Write-Host @"
════════════════════════════════════════════════════════════════
                    🌸 Elysia AI                    
              本番デプロイスクリプト                
════════════════════════════════════════════════════════════════
"@ -ForegroundColor Magenta

Write-Info "デプロイ環境: $Environment"
Write-Info "テストスキップ: $SkipTests"
Write-Info "ビルドスキップ: $SkipBuild"
Write-Host ""

# ================================================
# Step 0: 前提条件チェック
# ================================================
Write-Step "Step 0: 前提条件チェック"

# Node/Bun確認
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Error "Bun がインストールされていません"
    exit 1
}
Write-Success "Bun: $(bun --version)"

# .env ファイル確認
if (-not (Test-Path .env)) {
    Write-Warning ".env ファイルが存在しません"
    Write-Info ".env.example からコピーしてください"
    
    $createEnv = Read-Host "今すぐ作成しますか? (y/n)"
    if ($createEnv -eq 'y') {
        Copy-Item .env.example .env
        Write-Success ".env ファイルを作成しました"
        Write-Warning "JWT_SECRET と AUTH_PASSWORD を必ず変更してください！"
        notepad .env
        $continue = Read-Host "編集完了しましたか? (y/n)"
        if ($continue -ne 'y') {
            Write-Error "デプロイを中止しました"
            exit 1
        }
    } else {
        Write-Error ".env ファイルが必要です"
        exit 1
    }
}
Write-Success ".env ファイル: 存在"

# 環境別の前提条件チェック
switch ($Environment) {
    'docker' {
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            Write-Error "Docker がインストールされていません"
            Write-Info "Docker Desktop をインストールしてください: https://www.docker.com/products/docker-desktop/"
            exit 1
        }
        Write-Success "Docker: $(docker --version)"
    }
    'aws' {
        if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
            Write-Error "AWS CLI がインストールされていません"
            Write-Info "AWS CLI をインストールしてください: https://aws.amazon.com/cli/"
            exit 1
        }
        Write-Success "AWS CLI: $(aws --version)"
        
        # AWS認証情報確認
        try {
            aws sts get-caller-identity | Out-Null
            Write-Success "AWS認証情報: 有効"
        } catch {
            Write-Error "AWS認証情報が設定されていません"
            exit 1
        }
    }
    'gcp' {
        if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
            Write-Error "Google Cloud SDK がインストールされていません"
            Write-Info "gcloud SDK をインストールしてください: https://cloud.google.com/sdk/docs/install"
            exit 1
        }
        Write-Success "Google Cloud SDK: $(gcloud --version | Select-Object -First 1)"
        
        # GCP認証情報確認
        try {
            $project = gcloud config get-value project 2>$null
            if (-not $project) {
                Write-Error "GCPプロジェクトが設定されていません"
                Write-Info "gcloud config set project YOUR_PROJECT_ID を実行してください"
                exit 1
            }
            Write-Success "GCPプロジェクト: $project"
        } catch {
            Write-Error "GCP認証情報が設定されていません"
            exit 1
        }
    }
}

# ================================================
# Step 1: 依存関係インストール
# ================================================
if (-not $SkipBuild) {
    Write-Step "Step 1: 依存関係インストール"
    
    try {
        bun install --frozen-lockfile
        Write-Success "依存関係インストール完了"
    } catch {
        Write-Error "依存関係インストール失敗: $_"
        exit 1
    }
}

# ================================================
# Step 2: コード品質チェック
# ================================================
if (-not $SkipTests) {
    Write-Step "Step 2: コード品質チェック"
    
    # Lint
    Write-Info "Lint実行中..."
    try {
        bun run lint
        Write-Success "Lint: 合格"
    } catch {
        Write-Warning "Lint警告がありますが続行します"
    }
    
    # Format check
    Write-Info "フォーマットチェック中..."
    try {
        bun run format
        Write-Success "フォーマット: 合格"
    } catch {
        Write-Warning "フォーマット警告がありますが続行します"
    }
}

# ================================================
# Step 3: テスト実行
# ================================================
if (-not $SkipTests) {
    Write-Step "Step 3: テスト実行"
    
    Write-Info "単体テスト実行中..."
    try {
        bun test ./tests/unit.test.ts
        Write-Success "単体テスト: 合格"
    } catch {
        Write-Error "単体テスト失敗"
        Write-Warning "Redis依存テストは環境により失敗する可能性があります"
        
        $continue = Read-Host "続行しますか? (y/n)"
        if ($continue -ne 'y') {
            exit 1
        }
    }
    
    # 統合テストは時間がかかるのでスキップオプション
    $runIntegration = Read-Host "統合テストを実行しますか? (y/n)"
    if ($runIntegration -eq 'y') {
        Write-Info "統合テスト実行中..."
        try {
            bun test ./tests/integration.test.ts
            Write-Success "統合テスト: 合格"
        } catch {
            Write-Warning "統合テスト失敗（続行）"
        }
    }
}

# ================================================
# Step 4: 本番ビルド
# ================================================
if (-not $SkipBuild) {
    Write-Step "Step 4: 本番ビルド"
    
    # distディレクトリクリーンアップ
    if (Test-Path dist) {
        Remove-Item -Recurse -Force dist
        Write-Info "dist ディレクトリクリーンアップ完了"
    }
    
    try {
        bun run build
        Write-Success "本番ビルド完了"
        
        # ビルド成果物確認
        if (Test-Path dist/index.js) {
            $size = (Get-Item dist/index.js).Length / 1KB
            Write-Info "ビルドサイズ: $([math]::Round($size, 2)) KB"
        }
    } catch {
        Write-Error "ビルド失敗: $_"
        exit 1
    }
}

# ================================================
# Step 5: 環境別デプロイ
# ================================================
Write-Step "Step 5: デプロイ実行 ($Environment)"

switch ($Environment) {
    'docker' {
        Write-Info "Dockerイメージビルド中..."
        
        # Dockerfile.production を使用してビルド
        try {
            docker build -f Dockerfile.production -t elysia-ai:latest .
            Write-Success "Dockerイメージビルド完了"
        } catch {
            Write-Error "Dockerイメージビルド失敗: $_"
            exit 1
        }
        
        # docker-compose起動確認
        $startCompose = Read-Host "docker-compose で起動しますか? (y/n)"
        if ($startCompose -eq 'y') {
            try {
                docker-compose up -d
                Write-Success "Docker Compose 起動完了"
                
                Start-Sleep -Seconds 5
                
                # ヘルスチェック
                Write-Info "ヘルスチェック実行中..."
                $health = Invoke-RestMethod -Uri http://localhost:3000/health -Method Get
                Write-Success "ヘルスチェック: OK"
                
                Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
                Write-Host "🎉 デプロイ完了！" -ForegroundColor Green
                Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
                Write-Host ""
                Write-Host "アプリケーション: http://localhost:3000" -ForegroundColor Cyan
                Write-Host "ヘルスチェック: http://localhost:3000/health" -ForegroundColor Cyan
                Write-Host "メトリクス: http://localhost:3000/metrics" -ForegroundColor Cyan
                Write-Host "FastAPI: http://localhost:8000" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "ログ確認: docker-compose logs -f" -ForegroundColor Yellow
                Write-Host "停止: docker-compose down" -ForegroundColor Yellow
                
            } catch {
                Write-Error "Docker Compose 起動失敗: $_"
                exit 1
            }
        } else {
            Write-Info "手動起動してください: docker run -p 3000:3000 elysia-ai:latest"
        }
    }
    
    'aws' {
        Write-Info "AWS ECS Fargateへデプロイ中..."
        
        # 環境変数確認
        $stackName = if ($env:STACK_NAME) { $env:STACK_NAME } else { "elysia-ai-prod" }
        $region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
        
        Write-Info "スタック名: $stackName"
        Write-Info "リージョン: $region"
        
        $confirm = Read-Host "デプロイを実行しますか? (y/n)"
        if ($confirm -ne 'y') {
            Write-Warning "デプロイをキャンセルしました"
            exit 0
        }
        
        try {
            # Bashスクリプト実行（WSL必要）
            if (Get-Command wsl -ErrorAction SilentlyContinue) {
                wsl bash cloud/aws/deploy.sh
            } else {
                Write-Error "WSLが必要です。またはLinux環境で実行してください"
                exit 1
            }
            
            Write-Success "AWSデプロイ完了"
            
            # URL取得
            $url = aws cloudformation describe-stacks `
                --stack-name $stackName `
                --region $region `
                --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' `
                --output text
            
            Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host "🎉 AWSデプロイ完了！" -ForegroundColor Green
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host ""
            Write-Host "アプリケーションURL: $url" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "ログ確認: aws logs tail /ecs/$stackName --follow --region $region" -ForegroundColor Yellow
            
        } catch {
            Write-Error "AWSデプロイ失敗: $_"
            exit 1
        }
    }
    
    'gcp' {
        Write-Info "Google Cloud Runへデプロイ中..."
        
        $projectId = gcloud config get-value project
        $region = if ($env:GCP_REGION) { $env:GCP_REGION } else { "us-central1" }
        
        Write-Info "プロジェクトID: $projectId"
        Write-Info "リージョン: $region"
        
        $confirm = Read-Host "デプロイを実行しますか? (y/n)"
        if ($confirm -ne 'y') {
            Write-Warning "デプロイをキャンセルしました"
            exit 0
        }
        
        try {
            # Bashスクリプト実行（WSL必要）
            if (Get-Command wsl -ErrorAction SilentlyContinue) {
                wsl bash cloud/gcp/deploy.sh
            } else {
                Write-Error "WSLが必要です。またはLinux環境で実行してください"
                exit 1
            }
            
            Write-Success "GCPデプロイ完了"
            
            # URL取得
            $url = gcloud run services describe elysia-ai `
                --platform managed `
                --region $region `
                --format 'value(status.url)'
            
            Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host "🎉 GCPデプロイ完了！" -ForegroundColor Green
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host ""
            Write-Host "アプリケーションURL: $url" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "ログ確認: gcloud logging read 'resource.type=cloud_run_revision' --limit 50" -ForegroundColor Yellow
            
        } catch {
            Write-Error "GCPデプロイ失敗: $_"
            exit 1
        }
    }
}

# ================================================
# Step 6: デプロイ後検証
# ================================================
Write-Step "Step 6: デプロイ後検証"

if ($Environment -eq 'docker') {
    $baseUrl = "http://localhost:3000"
} else {
    Write-Warning "クラウド環境のURLは上記を参照してください"
    exit 0
}

Write-Info "エンドポイント検証中..."

# ヘルスチェック
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Success "ヘルスチェック: OK ($($health.status))"
} catch {
    Write-Warning "ヘルスチェック失敗: $_"
}

# メトリクス
try {
    $metrics = Invoke-WebRequest -Uri "$baseUrl/metrics" -Method Get
    if ($metrics.StatusCode -eq 200) {
        Write-Success "メトリクス: OK ($(($metrics.Content -split "`n" | Measure-Object).Count) lines)"
    }
} catch {
    Write-Warning "メトリクス取得失敗: $_"
}

# ルートエンドポイント
try {
    $root = Invoke-WebRequest -Uri $baseUrl -Method Get
    Write-Success "ルートエンドポイント: OK (HTTP $($root.StatusCode))"
} catch {
    Write-Warning "ルートエンドポイント失敗: $_"
}

# ================================================
# 完了メッセージ
# ================================================
Write-Host "`n" -NoNewline
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║         🌸 Elysia AI デプロイ完了 🌸                      ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

Write-Info "次のステップ:"
Write-Host "  1. ログを確認してエラーがないことを確認" -ForegroundColor White
Write-Host "  2. 負荷テストを実行: .\scripts\load-test.ps1 -Report" -ForegroundColor White
Write-Host "  3. 監視ダッシュボードを確認（Grafana等）" -ForegroundColor White
Write-Host "  4. PRODUCTION_DEPLOY_CHECKLIST.md を参照" -ForegroundColor White
Write-Host ""
