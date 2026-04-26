# Database Restore Script
# バックアップからSQLiteデータベースをリストア

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

$DB_FILE = ".\dev.db"
$BACKUP_DIR = ".\backups\database"

Write-Host "🔄 データベースリストア開始..." -ForegroundColor Cyan

# バックアップファイルの選択
if (-not $BackupFile) {
    $backups = Get-ChildItem -Path $BACKUP_DIR -Filter "dev_*.db" -ErrorAction SilentlyContinue | Sort-Object CreationTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Host "❌ バックアップファイルが見つかりません" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "📋 利用可能なバックアップ:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $backup = $backups[$i]
        $size = [math]::Round($backup.Length / 1KB, 2)
        Write-Host "  [$i] $($backup.Name) - $($backup.CreationTime) ($size KB)"
    }
    
    $selection = Read-Host "`n選択してください (0-$($backups.Count - 1))"
    $BackupFile = $backups[[int]$selection].FullName
}

# バックアップファイル存在チェック
if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ バックアップファイルが見つかりません: $BackupFile" -ForegroundColor Red
    exit 1
}

# 現在のDBをバックアップ
if (Test-Path $DB_FILE) {
    $preRestoreBackup = ".\backups\database\pre_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
    Copy-Item -Path $DB_FILE -Destination $preRestoreBackup -Force
    Write-Host "✅ 現在のDBをバックアップ: $preRestoreBackup" -ForegroundColor Green
}

# リストア実行
try {
    Copy-Item -Path $BackupFile -Destination $DB_FILE -Force
    Write-Host "✅ リストア完了: $BackupFile -> $DB_FILE" -ForegroundColor Green
} catch {
    Write-Host "❌ リストア失敗: $_" -ForegroundColor Red
    exit 1
}

Write-Host "✅ データベースのリストアが完了しました" -ForegroundColor Green
