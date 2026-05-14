# Docker Desktop セットアップガイド（Windows）

## 📦 Docker Desktop インストール

### Step 1: システム要件確認

**必須要件:**

- Windows 10/11 (64-bit)
- WSL 2（Windows Subsystem for Linux 2）
- 仮想化機能有効化（BIOS設定）

### Step 2: Docker Desktop ダウンロード

1. **公式サイトからダウンロード**

   ```
   https://www.docker.com/products/docker-desktop/
   ```

2. **または PowerShell から直接ダウンロード**

   ```powershell
   # ダウンロード先ディレクトリ作成
   New-Item -ItemType Directory -Path "$env:TEMP\docker" -Force

   # Docker Desktop インストーラーダウンロード
   $url = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
   $output = "$env:TEMP\docker\DockerDesktopInstaller.exe"

   Write-Host "Docker Desktop をダウンロード中..." -ForegroundColor Cyan
   Invoke-WebRequest -Uri $url -OutFile $output

   Write-Host "ダウンロード完了: $output" -ForegroundColor Green
   ```

### Step 3: WSL 2 セットアップ

Docker Desktop には WSL 2 が必要です。

```powershell
# 管理者権限でPowerShellを開き、以下を実行

# WSL有効化
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# 仮想マシンプラットフォーム有効化
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 再起動が必要
Restart-Computer
```

**再起動後:**

```powershell
# WSL 2をデフォルトに設定
wsl --set-default-version 2

# Ubuntu をインストール（推奨）
wsl --install -d Ubuntu

# WSL更新
wsl --update
```

### Step 4: Docker Desktop インストール

```powershell
# ダウンロードしたインストーラーを実行
Start-Process -FilePath "$env:TEMP\docker\DockerDesktopInstaller.exe" -Wait

# または手動でダウンロードしたファイルをダブルクリック
```

**インストール設定:**

- ✅ Use WSL 2 instead of Hyper-V（推奨）
- ✅ Add shortcut to desktop

**インストール後、PCを再起動してください。**

### Step 5: Docker Desktop 起動

1. スタートメニューから「Docker Desktop」を起動
2. 初回起動時にWSL 2統合を設定
3. Docker Engineが起動するまで待機（1-2分）

### Step 6: インストール確認

```powershell
# Docker バージョン確認
docker --version
# 期待される出力: Docker version 24.x.x, build xxxxx

# Docker Compose バージョン確認
docker compose version
# 期待される出力: Docker Compose version v2.x.x

# Docker 動作確認
docker run hello-world
# 期待される出力: Hello from Docker!
```

---

## 🚀 Redis セットアップ

Docker がインストールされたら、Redis を起動します。

### 方法1: Docker で Redis を起動（推奨）

```powershell
# Redis コンテナ起動
docker run -d `
  --name redis `
  -p 6379:6379 `
  --restart unless-stopped `
  redis:7-alpine

# 起動確認
docker ps | Select-String redis

# Redis接続テスト
docker exec -it redis redis-cli ping
# 期待される出力: PONG
```

### 方法2: docker-compose で起動

既存の `docker-compose.yml` を使用:

```powershell
# Redisのみ起動
docker compose up -d redis

# ログ確認
docker compose logs redis
```

### 方法3: インメモリモード（Redis不要）

`.env` ファイルで設定:

```bash
REDIS_ENABLED=false
```

この場合、レート制限はインメモリで動作します（本番環境非推奨）。

---

## 🌸 .env ファイル作成

### 自動作成スクリプト

```powershell
# .env.example から .env を作成
Copy-Item .env.example .env

# JWT_SECRET 生成（PowerShell）
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$jwtRefreshSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$sessionSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

Write-Host "JWT_SECRET: $jwtSecret" -ForegroundColor Green
Write-Host "JWT_REFRESH_SECRET: $jwtRefreshSecret" -ForegroundColor Green
Write-Host "SESSION_SECRET: $sessionSecret" -ForegroundColor Green

# .envファイルを編集
notepad .env
```

### 必須変更項目

```bash
# 🔐 セキュリティ（必須）
JWT_SECRET=<上記で生成したJWT_SECRET>
JWT_REFRESH_SECRET=<上記で生成したJWT_REFRESH_SECRET>
SESSION_SECRET=<上記で生成したSESSION_SECRET>
AUTH_PASSWORD=<強力なパスワード>

# 🚀 本番環境設定
NODE_ENV=production
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

---

## 🎯 デプロイ実行

すべての準備が整ったら、デプロイスクリプトを実行:

```powershell
# 本番デプロイスクリプト実行
.\scripts\deploy-production.ps1 -Environment docker

# テストスキップで高速デプロイ
.\scripts\deploy-production.ps1 -Environment docker -SkipTests

# ビルドもスキップ（既にビルド済みの場合）
.\scripts\deploy-production.ps1 -Environment docker -SkipTests -SkipBuild
```

### デプロイ確認

```powershell
# コンテナ起動確認
docker ps

# ログ確認
docker compose logs -f

# ヘルスチェック
curl http://localhost:3000/health

# アプリケーションアクセス
Start-Process http://localhost:3000
```

---

## 📊 監視スタック起動

Docker がインストールされたら、Prometheus + Grafana を起動できます:

```powershell
# 監視ディレクトリへ移動
cd monitoring

# 監視スタック起動
docker compose up -d

# サービス確認
docker compose ps

# Grafana アクセス
Start-Process http://localhost:3001
# ログイン: admin / <redacted>

# Prometheus アクセス
Start-Process http://localhost:9090
```

### Grafana 初期設定

1. http://localhost:3001 にアクセス
2. 初回ログイン: `admin` / `admin`
3. 新しいパスワードを設定
4. データソース追加:
   - Name: Prometheus
   - Type: Prometheus
   - URL: `http://prometheus:9090`
   - Save & Test
5. ダッシュボードインポート:
   - Node Exporter Full (ID: 1860)
   - Redis Dashboard (ID: 11835)

---

## 🧪 負荷テスト実行

サーバー起動後に負荷テストを実行:

```powershell
# 基本的な負荷テスト
.\scripts\load-test.ps1

# HTMLレポート付き
.\scripts\load-test.ps1 -Report

# カスタム設定
.\scripts\load-test.ps1 -Duration 30 -Connections 50 -Endpoint "/api/chat"
```

---

## 🎭 Playwright E2E テスト実行

```powershell
# サーバー起動（別ターミナル）
bun run dev

# E2E テスト実行
bunx playwright test

# ヘッドモード（ブラウザ表示）
bunx playwright test --headed

# 特定のテスト実行
bunx playwright test tests/e2e/app.spec.ts

# UIモード（インタラクティブ）
bunx playwright test --ui
```

---

## 🔧 トラブルシューティング

### Docker が起動しない

```powershell
# Docker サービス再起動
Restart-Service docker

# Docker Desktop 再起動
Stop-Process -Name "Docker Desktop" -Force
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# WSL 再起動
wsl --shutdown
wsl
```

### Redis 接続エラー

```powershell
# Redis コンテナ状態確認
docker ps -a | Select-String redis

# Redis ログ確認
docker logs redis

# Redis 再起動
docker restart redis

# ポート確認
netstat -ano | Select-String 6379
```

### ポート競合エラー

```powershell
# ポート3000を使用しているプロセスを確認
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object State, OwningProcess

# プロセス詳細
Get-Process -Id <OwningProcess>

# プロセス終了
Stop-Process -Id <OwningProcess> -Force
```

---

## 📚 参考リンク

- [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- [WSL 2 インストールガイド](https://docs.microsoft.com/ja-jp/windows/wsl/install)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [Docker Compose ドキュメント](https://docs.docker.com/compose/)
- [Grafana ダッシュボード](https://grafana.com/grafana/dashboards/)

---

## ✅ セットアップ完了チェックリスト

- [ ] WSL 2 インストール完了
- [ ] Docker Desktop インストール完了
- [ ] `docker --version` 実行成功
- [ ] Redis コンテナ起動完了
- [ ] `.env` ファイル作成・シークレット設定完了
- [ ] `.\scripts\deploy-production.ps1 -Environment docker` 実行成功
- [ ] http://localhost:3000/health アクセス成功
- [ ] 監視スタック起動完了（Grafana http://localhost:3001）
- [ ] 負荷テスト実行完了
- [ ] E2E テスト実行完了

すべてチェックが完了したら、本番環境準備完了です！ 🎉
