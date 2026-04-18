#!/usr/bin/env pwsh
Write-Host "🚀 Elysia AI Heavy Asset Purge (OneDrive Optimization)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$heavyFiles = @(
    "kernel/*.vmem",
    "kernel/*.vmdk",
    "kernel/*.log",
    "kernel/nvram",
    "src-tauri/target",
    "node_modules",
    "dist"
)

$totalFreed = 0

foreach ($pattern in $heavyFiles) {
    $items = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
    if ($items) {
        foreach ($item in $items) {
            $size = (Get-ChildItem $item.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            if ($null -eq $size) { $size = (Get-Item $item.FullName).Length }
            
            Write-Host "🗑️ Removing: $($item.FullName) ($([math]::Round($size / 1GB, 2)) GB)" -ForegroundColor Yellow
            Remove-Item $item.FullName -Recurse -Force -ErrorAction SilentlyContinue
            $totalFreed += $size
        }
    }
}

Write-Host ""
Write-Host "✅ Purge Complete!" -ForegroundColor Green
Write-Host "📦 Total Space Freed: $([math]::Round($totalFreed / 1GB, 2)) GB" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 NOTE: After this, OneDrive syncing should stop for these files." -ForegroundColor Gray
Write-Host "💡 NOTE: You will need to run 'bun install' and rebuild the kernel to continue work." -ForegroundColor Gray
