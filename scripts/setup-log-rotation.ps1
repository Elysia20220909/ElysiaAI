# Setup Log Rotation Schedule
# ログローテーションタスクをスケジューラに登録

$ErrorActionPreference = "Stop"

Write-Host "📅 ログローテーションタスクを設定中..." -ForegroundColor Cyan

$taskName = "ElysiaAI-LogRotation"
$scriptPath = (Resolve-Path ".\scripts\rotate-logs.ps1").Path
$workingDir = (Get-Location).Path

# 既存タスクを削除
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "🗑️  既存タスクを削除" -ForegroundColor Yellow
}

# タスク設定（毎週日曜日 2:00 AM）
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`"" -WorkingDirectory $workingDir
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "02:00"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# タスク登録
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Elysia AI ログファイルの自動ローテーション（毎週日曜日2:00AM）" | Out-Null

Write-Host "✅ ログローテーションタスクを設定しました" -ForegroundColor Green
Write-Host "   - タスク名: $taskName" -ForegroundColor White
Write-Host "   - 実行時間: 毎週日曜日 2:00 AM" -ForegroundColor White
Write-Host "   - スクリプト: $scriptPath" -ForegroundColor White
Write-Host ""
Write-Host "💡 今すぐ実行: Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Cyan
