# ElysiaAI サービス一括起動スクリプト
# Redis, Ollama, DB, サーバを順次起動


# Redisヘルスチェック
Write-Host "[1/4] Redisサーバ起動..."
$redisPort = 6379
$redisRetries = 5
$redisStarted = $false
for ($i = 1; $i -le $redisRetries; $i++) {
    try {
        $tcp = Test-NetConnection -ComputerName "localhost" -Port $redisPort
        if ($tcp.TcpTestSucceeded) {
            Write-Host "[Redis] 既に起動済み ($redisPort)"
            $redisStarted = $true
            break
        }
    }
    catch {}
    Write-Host "[Redis] 起動試行 $i/$redisRetries..."
    Start-Process -NoNewWindow -FilePath "redis-server" -ArgumentList "--service-start" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}
if (-not $redisStarted) {
    $tcp = Test-NetConnection -ComputerName "localhost" -Port $redisPort
    if (-not $tcp.TcpTestSucceeded) {
        Write-Host "[警告] Redisサーバ起動失敗。管理者に通知してください。"
    }
}


# Ollamaヘルスチェック
Write-Host "[2/4] Ollamaサーバ起動..."
$ollamaPort = 11434
$ollamaRetries = 5
$ollamaStarted = $false
for ($i = 1; $i -le $ollamaRetries; $i++) {
    try {
        $tcp = Test-NetConnection -ComputerName "localhost" -Port $ollamaPort
        if ($tcp.TcpTestSucceeded) {
            Write-Host "[Ollama] 既に起動済み ($ollamaPort)"
            $ollamaStarted = $true
            break
        }
    }
    catch {}
    Write-Host "[Ollama] 起動試行 $i/$ollamaRetries..."
    Start-Process -NoNewWindow -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}
if (-not $ollamaStarted) {
    $tcp = Test-NetConnection -ComputerName "localhost" -Port $ollamaPort
    if (-not $tcp.TcpTestSucceeded) {
        Write-Host "[警告] Ollamaサーバ起動失敗。管理者に通知してください。"
    }
}


# PostgreSQL/Prismaヘルスチェック
Write-Host "[3/4] DB (PostgreSQL/Prisma) マイグレーション..."
$dbPort = 5432
$dbRetries = 5
$dbStarted = $false
for ($i = 1; $i -le $dbRetries; $i++) {
    try {
        $tcp = Test-NetConnection -ComputerName "localhost" -Port $dbPort
        if ($tcp.TcpTestSucceeded) {
            Write-Host "[DB] PostgreSQL既に起動済み ($dbPort)"
            $dbStarted = $true
            break
        }
    }
    catch {}
    Write-Host "[DB] 起動試行 $i/$dbRetries..."
    # DB起動はdockerやサービス管理に依存するため、ここではPrismaマイグレーションのみ
    bun prisma generate
    bunx prisma migrate dev
    Start-Sleep -Seconds 2
}
if (-not $dbStarted) {
    $tcp = Test-NetConnection -ComputerName "localhost" -Port $dbPort
    if (-not $tcp.TcpTestSucceeded) {
        Write-Host "[警告] DB(PostgreSQL)起動失敗。管理者に通知してください。"
    }
}


Write-Host "[4/4] ElysiaAIサーバ起動..."
bun src/index.ts

# サーバ・外部サービス起動後にヘルスチェックとAPIテストを自動実行
Write-Host "[自動化] ヘルスチェック・APIテスト開始..."
powershell -ExecutionPolicy Bypass -File ./scripts/health-retry.ps1
powershell -ExecutionPolicy Bypass -File ./scripts/api-e2e-test.ps1
