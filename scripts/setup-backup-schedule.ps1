# Scheduled Database Backup Task
# タスクスケジューラで毎日バックアップを実行

$ErrorActionPreference = "Stop"

Write-Host "📅 自動バックアップタスクを設定中..." -ForegroundColor Cyan

$taskName = "ElysiaAI-DatabaseBackup"
$scriptPath = (Resolve-Path ".\scripts\backup-db.ps1").Path
$workingDir = (Get-Location).Path

# 既存タスクを削除
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "🗑️  既存タスクを削除" -ForegroundColor Yellow
}

# タスク設定
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`"" -WorkingDirectory $workingDir
$trigger = New-ScheduledTaskTrigger -Daily -At "03:00"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# タスク登録
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Elysia AI データベースの自動バックアップ（毎日3:00AM）" | Out-Null

Write-Host "✅ 自動バックアップタスクを設定しました" -ForegroundColor Green
Write-Host "   - タスク名: $taskName" -ForegroundColor White
Write-Host "   - 実行時間: 毎日 3:00 AM" -ForegroundColor White
Write-Host "   - スクリプト: $scriptPath" -ForegroundColor White
Write-Host ""
Write-Host "💡 タスクの管理:" -ForegroundColor Cyan
Write-Host "   確認: Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
Write-Host "   削除: Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false" -ForegroundColor White
Write-Host "   今すぐ実行: Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
