#!/usr/bin/env pwsh
# メンテナンスタスクスケジューラ
# Windows Task Schedulerにタスクを登録

param(
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Status
)

$projectPath = $PSScriptRoot | Split-Path -Parent
$taskPrefix = "ElysiaAI-Maintenance"

function Install-MaintenanceTasks {
    Write-Host "📅 メンテナンスタスクをスケジュール登録中..." -ForegroundColor Cyan
    Write-Host ""
    
    # 週次タスク (毎週日曜日 2:00 AM)
    $weeklyAction = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$projectPath\scripts\maintenance-weekly.ps1`"" `
        -WorkingDirectory $projectPath
    
    $weeklyTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2am
    $weeklySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    
    Register-ScheduledTask -TaskName "$taskPrefix-Weekly" `
        -Action $weeklyAction `
        -Trigger $weeklyTrigger `
        -Settings $weeklySettings `
        -Description "エリシアAI 週次メンテナンス (ログローテーション)" `
        -Force
    
    Write-Host "✅ 週次タスク登録完了: 毎週日曜日 2:00 AM" -ForegroundColor Green
    
    # 月次タスク (毎月1日 3:00 AM)
    $monthlyAction = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$projectPath\scripts\maintenance-monthly.ps1`"" `
        -WorkingDirectory $projectPath
    
    $monthlyTrigger = New-ScheduledTaskTrigger -Daily -At 3am
    $monthlyTrigger.DaysInterval = 30  # 約30日ごと
    
    Register-ScheduledTask -TaskName "$taskPrefix-Monthly" `
        -Action $monthlyAction `
        -Trigger $monthlyTrigger `
        -Settings $weeklySettings `
        -Description "エリシアAI 月次メンテナンス (依存関係更新確認)" `
        -Force
    
    Write-Host "✅ 月次タスク登録完了: 毎月1日 3:00 AM" -ForegroundColor Green
    
    # 四半期タスク (1月/4月/7月/10月の1日 4:00 AM)
    $quarterlyAction = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$projectPath\scripts\maintenance-quarterly.ps1`"" `
        -WorkingDirectory $projectPath
    
    $quarterlyTrigger = New-ScheduledTaskTrigger -Daily -At 4am
    $quarterlyTrigger.DaysInterval = 90  # 約90日ごと
    
    Register-ScheduledTask -TaskName "$taskPrefix-Quarterly" `
        -Action $quarterlyAction `
        -Trigger $quarterlyTrigger `
        -Settings $weeklySettings `
        -Description "エリシアAI 四半期メンテナンス (セキュリティ監査)" `
        -Force
    
    Write-Host "✅ 四半期タスク登録完了: 四半期ごと 4:00 AM" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 確認方法: taskschd.msc を開くか、Get-ScheduledTask -TaskName 'ElysiaAI-Maintenance-*'" -ForegroundColor Yellow
}

function Uninstall-MaintenanceTasks {
    Write-Host "🗑️  メンテナンスタスクを削除中..." -ForegroundColor Yellow
    Write-Host ""
    
    $tasks = @("Weekly", "Monthly", "Quarterly")
    foreach ($task in $tasks) {
        $taskName = "$taskPrefix-$task"
        if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
            Write-Host "✅ $taskName 削除完了" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  $taskName は登録されていません" -ForegroundColor Gray
        }
    }
}

function Show-MaintenanceStatus {
    Write-Host "📊 メンテナンスタスクの状態:" -ForegroundColor Cyan
    Write-Host ""
    
    $tasks = Get-ScheduledTask -TaskName "$taskPrefix-*" -ErrorAction SilentlyContinue
    
    if ($tasks.Count -eq 0) {
        Write-Host "ℹ️  メンテナンスタスクは登録されていません" -ForegroundColor Yellow
        Write-Host "登録方法: .\scripts\maintenance-scheduler.ps1 -Install" -ForegroundColor Gray
    } else {
        foreach ($task in $tasks) {
            $info = Get-ScheduledTaskInfo -TaskName $task.TaskName
            Write-Host "📅 $($task.TaskName)" -ForegroundColor Green
            Write-Host "   状態: $($task.State)" -ForegroundColor Gray
            Write-Host "   最終実行: $($info.LastRunTime)" -ForegroundColor Gray
            Write-Host "   次回実行: $($info.NextRunTime)" -ForegroundColor Gray
            Write-Host ""
        }
    }
}

# メイン処理
if ($Install) {
    Install-MaintenanceTasks
} elseif ($Uninstall) {
    Uninstall-MaintenanceTasks
} elseif ($Status) {
    Show-MaintenanceStatus
} else {
    Write-Host "使用方法:" -ForegroundColor Cyan
    Write-Host "  .\scripts\maintenance-scheduler.ps1 -Install     # タスクを登録" -ForegroundColor Gray
    Write-Host "  .\scripts\maintenance-scheduler.ps1 -Uninstall   # タスクを削除" -ForegroundColor Gray
    Write-Host "  .\scripts\maintenance-scheduler.ps1 -Status      # 状態確認" -ForegroundColor Gray
    Write-Host ""
    Write-Host "手動実行:" -ForegroundColor Cyan
    Write-Host "  .\scripts\maintenance-weekly.ps1                 # 週次" -ForegroundColor Gray
    Write-Host "  .\scripts\maintenance-monthly.ps1                # 月次" -ForegroundColor Gray
    Write-Host "  .\scripts\maintenance-quarterly.ps1              # 四半期" -ForegroundColor Gray
}
