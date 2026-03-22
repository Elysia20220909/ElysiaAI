#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Clean build artifacts and temporary files
.DESCRIPTION
    Removes build outputs, logs, and temporary files to free up space and reset the project
#>

param(
    [switch]$Deep,
    [switch]$WhatIf
)

$ErrorActionPreference = "Continue"

Write-Host "🧹 Elysia AI Project Cleanup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Cleanup items
$cleanupItems = @(
    @{ Path = "dist"; Type = "Directory"; Description = "Build output" },
    @{ Path = ".tsbuildinfo"; Type = "File"; Description = "TypeScript build cache" },
    @{ Path = "*.log"; Type = "Pattern"; Description = "Log files" },
    @{ Path = "*-debug.log"; Type = "Pattern"; Description = "Debug log files" },
    @{ Path = "*.tmp"; Type = "Pattern"; Description = "Temporary files" },
    @{ Path = "*.cache"; Type = "Pattern"; Description = "Cache files" },
    @{ Path = "dist.zip"; Type = "File"; Description = "Distribution archive" }
)

if ($Deep) {
    Write-Host "🔥 Deep clean mode enabled" -ForegroundColor Yellow
    $cleanupItems += @(
        @{ Path = "node_modules"; Type = "Directory"; Description = "Dependencies" },
        @{ Path = "bun.lock"; Type = "File"; Description = "Lock file" },
        @{ Path = "logs"; Type = "Directory"; Description = "Log directory" },
        @{ Path = "data/*.jsonl"; Type = "Pattern"; Description = "Data files" }
    )
}

$totalSize = 0
$itemsRemoved = 0

foreach ($item in $cleanupItems) {
    Write-Host "Checking: $($item.Description)..." -NoNewline
    
    $found = $false
    $size = 0
    
    switch ($item.Type) {
        "Directory" {
            if (Test-Path $item.Path -PathType Container) {
                $size = (Get-ChildItem $item.Path -Recurse -File | Measure-Object -Property Length -Sum).Sum
                if (!$WhatIf) {
                    Remove-Item $item.Path -Recurse -Force -ErrorAction SilentlyContinue
                }
                $found = $true
            }
        }
        "File" {
            if (Test-Path $item.Path) {
                $size = (Get-Item $item.Path).Length
                if (!$WhatIf) {
                    Remove-Item $item.Path -Force -ErrorAction SilentlyContinue
                }
                $found = $true
            }
        }
        "Pattern" {
            $files = Get-ChildItem -Path . -Filter $item.Path -File -ErrorAction SilentlyContinue
            if ($files) {
                $size = ($files | Measure-Object -Property Length -Sum).Sum
                if (!$WhatIf) {
                    $files | Remove-Item -Force -ErrorAction SilentlyContinue
                }
                $found = $true
            }
        }
    }
    
    if ($found) {
        $sizeMB = [math]::Round($size / 1MB, 2)
        Write-Host " ✓ Removed ($sizeMB MB)" -ForegroundColor Green
        $totalSize += $size
        $itemsRemoved++
    } else {
        Write-Host " - Not found" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
if ($WhatIf) {
    Write-Host "🔍 What-If mode: No files were actually deleted" -ForegroundColor Yellow
}
Write-Host "✨ Cleanup complete!" -ForegroundColor Green
Write-Host "Items removed: $itemsRemoved" -ForegroundColor Cyan
Write-Host "Space freed: $([math]::Round($totalSize / 1MB, 2)) MB" -ForegroundColor Cyan

if ($Deep) {
    Write-Host ""
    Write-Host "💡 Run 'bun install' to reinstall dependencies" -ForegroundColor Yellow
}

Write-Host ""
