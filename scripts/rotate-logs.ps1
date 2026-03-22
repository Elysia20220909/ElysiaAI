# Log Rotation Script
# 古いログファイルを圧縮・削除

param(
    [int]$MaxSizeMB = 50,
    [int]$MaxAgeDays = 30,
    [int]$KeepCompressed = 5
)

$ErrorActionPreference = "Stop"

Write-Host "🔄 ログローテーション開始..." -ForegroundColor Cyan

$logDir = ".\logs"
$archiveDir = ".\logs\archive"

# アーカイブディレクトリ作成
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    Write-Host "✅ アーカイブディレクトリ作成: $archiveDir" -ForegroundColor Green
}

# ログファイル処理
$logFiles = Get-ChildItem -Path $logDir -Filter "*.log" -File

foreach ($file in $logFiles) {
    $fileSizeMB = $file.Length / 1MB
    $fileAge = (Get-Date) - $file.CreationTime
    
    # サイズチェック
    if ($fileSizeMB -gt $MaxSizeMB) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $archiveName = "$archiveDir\$($file.BaseName)_$timestamp.zip"
        
        Write-Host "📦 圧縮中: $($file.Name) ($([math]::Round($fileSizeMB, 2)) MB)" -ForegroundColor Yellow
        
        # ZIP圧縮
        Compress-Archive -Path $file.FullName -DestinationPath $archiveName -Force
        
        # 元ファイルをクリア
        Clear-Content -Path $file.FullName
        
        Write-Host "✅ 圧縮完了: $archiveName" -ForegroundColor Green
    }
    
    # 古いファイルチェック
    if ($fileAge.Days -gt $MaxAgeDays) {
        Write-Host "🗑️  削除: $($file.Name) (作成から$($fileAge.Days)日経過)" -ForegroundColor Yellow
        Remove-Item $file.FullName -Force
    }
}

# 古いアーカイブを削除
$archives = Get-ChildItem -Path $archiveDir -Filter "*.zip" -ErrorAction SilentlyContinue | Sort-Object CreationTime -Descending
if ($archives.Count -gt $KeepCompressed) {
    $toDelete = $archives | Select-Object -Skip $KeepCompressed
    foreach ($archive in $toDelete) {
        Write-Host "🗑️  古いアーカイブを削除: $($archive.Name)" -ForegroundColor Yellow
        Remove-Item $archive.FullName -Force
    }
}

Write-Host "✅ ログローテーション完了" -ForegroundColor Green
Write-Host "   - 処理ファイル数: $($logFiles.Count)" -ForegroundColor White
Write-Host "   - 保持アーカイブ数: $([Math]::Min($archives.Count, $KeepCompressed))" -ForegroundColor White
