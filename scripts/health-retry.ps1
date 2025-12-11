# ElysiaAI ヘルスチェック自動リトライ・通知スクリプト
# サーバ起動後、外部サービスのヘルスチェックを定期的に実施

$maxRetries = 10
$interval = 10 # 秒
$success = $false

for ($i = 1; $i -le $maxRetries; $i++) {
    Write-Host "[HealthCheck] 試行 $i/$maxRetries..."
    try {
        $db = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
        if ($db.StatusCode -eq 200) {
            Write-Host "[HealthCheck] サーバ正常稼働"
            $success = $true
            break
        }
    }
    catch {
        Write-Host "[HealthCheck] サーバ未応答、$interval 秒後に再試行..."
        Start-Sleep -Seconds $interval
    }
}

if (-not $success) {
    Write-Host "[HealthCheck] サーバ起動失敗。管理者に通知してください。"
}
