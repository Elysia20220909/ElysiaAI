#!/usr/bin/env pwsh
# 週次保守: ログファイルのローテーション

# 文字化け対策
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

Write-Host "📅 週次保守作業開始..." -ForegroundColor Cyan
Write-Host ""

# ログディレクトリの確認
$logDir = "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Host "✅ ログディレクトリを作成しました" -ForegroundColor Green
}

# アーカイブディレクトリの作成
$archiveDir = "$logDir\archive"
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
}

# 現在の日時
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# ログファイルの検索とアーカイブ
$logFiles = Get-ChildItem -Path . -Include "*.log","*-debug.log" -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.DirectoryName -notlike "*node_modules*" -and $_.DirectoryName -notlike "*archive*" }

if ($logFiles.Count -eq 0) {
    Write-Host "ℹ️  アーカイブするログファイルが見つかりませんでした" -ForegroundColor Yellow
} else {
    Write-Host "🗂️  $($logFiles.Count) 個のログファイルを処理中..." -ForegroundColor Cyan
    
    foreach ($file in $logFiles) {
        $archiveName = "$archiveDir\$($file.BaseName)-$timestamp$($file.Extension)"
        Copy-Item -Path $file.FullName -Destination $archiveName -Force
        Clear-Content -Path $file.FullName -Force
        Write-Host "  ✅ $($file.Name) → アーカイブ済み" -ForegroundColor Green
    }
}

# data/ ディレクトリの .jsonl ファイルをバックアップ
$dataDir = "data"
if (Test-Path $dataDir) {
    $jsonlFiles = Get-ChildItem -Path $dataDir -Filter "*.jsonl" -File
    if ($jsonlFiles.Count -gt 0) {
        $backupDir = "$dataDir\backup"
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }
        
        Write-Host ""
        Write-Host "💾 データファイルのバックアップ中..." -ForegroundColor Cyan
        foreach ($file in $jsonlFiles) {
            $backupName = "$backupDir\$($file.BaseName)-$timestamp$($file.Extension)"
            Copy-Item -Path $file.FullName -Destination $backupName -Force
            Write-Host "  ✅ $($file.Name) → バックアップ済み" -ForegroundColor Green
        }
    }
}

# 古いアーカイブの削除 (30日以上前)
$oldArchives = Get-ChildItem -Path $archiveDir -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }

if ($oldArchives.Count -gt 0) {
    Write-Host ""
    Write-Host "🗑️  30日以上前の古いアーカイブを削除中..." -ForegroundColor Yellow
    foreach ($file in $oldArchives) {
        Remove-Item -Path $file.FullName -Force
        Write-Host "  ✅ $($file.Name) → 削除済み" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Maintenance completed successfully!" -ForegroundColor Green
$nextDate = (Get-Date).AddDays(7).ToString("yyyy/MM/dd")
Write-Host "Next run: $nextDate" -ForegroundColor Cyan
