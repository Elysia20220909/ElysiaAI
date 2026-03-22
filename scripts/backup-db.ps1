# Database Backup Script
# SQLite データベースの自動バックアップ

$ErrorActionPreference = "Stop"

# 設定
$DB_FILE = ".\dev.db"
$BACKUP_DIR = ".\backups\database"
$MAX_BACKUPS = 10
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR\dev_$TIMESTAMP.db"

Write-Host "🗄️  データベースバックアップ開始..." -ForegroundColor Cyan

# バックアップディレクトリ作成
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    Write-Host "✅ バックアップディレクトリ作成: $BACKUP_DIR" -ForegroundColor Green
}

# データベースファイル存在チェック
if (-not (Test-Path $DB_FILE)) {
    Write-Host "❌ データベースファイルが見つかりません: $DB_FILE" -ForegroundColor Red
    exit 1
}

# バックアップ実行
try {
    Copy-Item -Path $DB_FILE -Destination $BACKUP_FILE -Force
    $fileSize = (Get-Item $BACKUP_FILE).Length / 1KB
    Write-Host "✅ バックアップ完了: $BACKUP_FILE ($([math]::Round($fileSize, 2)) KB)" -ForegroundColor Green
} catch {
    Write-Host "❌ バックアップ失敗: $_" -ForegroundColor Red
    exit 1
}

# 古いバックアップを削除
$backups = Get-ChildItem -Path $BACKUP_DIR -Filter "dev_*.db" | Sort-Object CreationTime -Descending
if ($backups.Count -gt $MAX_BACKUPS) {
    $toDelete = $backups | Select-Object -Skip $MAX_BACKUPS
    foreach ($file in $toDelete) {
        Remove-Item $file.FullName -Force
        Write-Host "🗑️  古いバックアップを削除: $($file.Name)" -ForegroundColor Yellow
    }
}

Write-Host "✅ バックアップ完了。現在のバックアップ数: $($backups.Count)" -ForegroundColor Green
Write-Host ""
Write-Host "💡 リストア方法:" -ForegroundColor Cyan
Write-Host "   .\scripts\restore-db.ps1 -BackupFile '$BACKUP_FILE'" -ForegroundColor White
