#!/usr/bin/env pwsh
# バックアップスクリプト
# データファイルとログのバックアップを実行

param(
    [string]$BackupDir = "backups",
    [switch]$Compress,
    [switch]$Remote,
    [string]$RemotePath = "",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

# バックアップディレクトリ作成
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $projectRoot $BackupDir $timestamp
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

Write-Host "📦 バックアップ開始: $timestamp" -ForegroundColor Cyan
Write-Host ""

# バックアップ対象
$targets = @(
    @{Path="data"; Name="Data Files"},
    @{Path="logs"; Name="Log Files"},
    @{Path=".env"; Name="Environment Config"},
    @{Path="config"; Name="Configuration"}
)

$totalSize = 0

foreach ($target in $targets) {
    $sourcePath = Join-Path $projectRoot $target.Path
    
    if (Test-Path $sourcePath) {
        Write-Host "📄 バックアップ中: $($target.Name)..." -ForegroundColor Yellow
        
        $destPath = Join-Path $backupPath $target.Path
        Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
        
        # サイズ計算
        if (Test-Path -Path $sourcePath -PathType Container) {
            $size = (Get-ChildItem -Path $sourcePath -Recurse | Measure-Object -Property Length -Sum).Sum
        } else {
            $size = (Get-Item $sourcePath).Length
        }
        
        $sizeMB = [math]::Round($size / 1MB, 2)
        $totalSize += $size
        
        Write-Host "  ✅ 完了 ($sizeMB MB)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  スキップ: $($target.Name) が見つかりません" -ForegroundColor Gray
    }
}

Write-Host ""
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)
Write-Host "📊 合計サイズ: $totalSizeMB MB" -ForegroundColor Cyan

# 圧縮
if ($Compress) {
    Write-Host ""
    Write-Host "🗜️  圧縮中..." -ForegroundColor Yellow
    
    $zipPath = "$backupPath.zip"
    Compress-Archive -Path $backupPath -DestinationPath $zipPath -Force
    
    # 元のディレクトリを削除
    Remove-Item -Path $backupPath -Recurse -Force
    
    $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    $compressionRatio = [math]::Round((1 - $zipSize / $totalSizeMB) * 100, 1)
    
    Write-Host "  ✅ 圧縮完了: $zipPath" -ForegroundColor Green
    Write-Host "  📉 圧縮率: $compressionRatio%" -ForegroundColor Cyan
}

# リモートバックアップ
if ($Remote -and $RemotePath) {
    Write-Host ""
    Write-Host "☁️  リモートバックアップ中..." -ForegroundColor Yellow
    
    $sourcePath = if ($Compress) { "$backupPath.zip" } else { $backupPath }
    
    try {
        # AWS S3の例（要 AWS CLI）
        if ($RemotePath -like "s3://*") {
            aws s3 cp $sourcePath $RemotePath --recursive
        }
        # Azure Blob Storageの例（要 Azure CLI）
        elseif ($RemotePath -like "https://*.blob.core.windows.net/*") {
            az storage blob upload-batch --source $sourcePath --destination $RemotePath
        }
        # その他のリモートパス（SCP等）
        else {
            scp -r $sourcePath $RemotePath
        }
        
        Write-Host "  ✅ リモートバックアップ完了" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ リモートバックアップ失敗: $_" -ForegroundColor Red
    }
}

# 古いバックアップの削除
Write-Host ""
Write-Host "🗑️  古いバックアップのクリーンアップ中..." -ForegroundColor Yellow

$backupRoot = Join-Path $projectRoot $BackupDir
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
$oldBackups = Get-ChildItem -Path $backupRoot | Where-Object { $_.CreationTime -lt $cutoffDate }

if ($oldBackups.Count -gt 0) {
    foreach ($old in $oldBackups) {
        Remove-Item -Path $old.FullName -Recurse -Force
        Write-Host "  🗑️  削除: $($old.Name)" -ForegroundColor Gray
    }
    Write-Host "  ✅ $($oldBackups.Count) 個のバックアップを削除" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  削除するバックアップはありません" -ForegroundColor Gray
}

# バックアップログ
$logPath = Join-Path $backupRoot "backup.log"
$logEntry = "[$timestamp] Backup completed - Size: $totalSizeMB MB - Retention: $RetentionDays days"
Add-Content -Path $logPath -Value $logEntry

Write-Host ""
Write-Host "✅ バックアップ完了！" -ForegroundColor Green
Write-Host "📁 保存先: $backupPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "復元方法:" -ForegroundColor Yellow
Write-Host "  .\scripts\restore-backup.ps1 -BackupPath '$timestamp'" -ForegroundColor Gray
