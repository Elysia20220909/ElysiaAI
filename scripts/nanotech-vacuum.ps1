#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Elysia Nanotech Vacuum - Advanced Repository Lightweighting
.DESCRIPTION
    A precision tool to remove build artifacts, caches, and redundant data 
    inspired by Iron Man's nanotechnology.
#>

param(
    [switch]$Simulation,
    [switch]$UltraDeep
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "🛡️  ELYSIANA TECHNOLOGY // NANOTECH VACUUM" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor DarkRed
Write-Host "Initiating lightweighting sequence..." -ForegroundColor Gray
Write-Host ""

$cleanupTargets = @(
    # Standard Caches
    @{ Path = "**/__pycache__"; Description = "Python Caches" },
    @{ Path = "**/.mypy_cache"; Description = "MyPy Caches" },
    @{ Path = "**/.ruff_cache"; Description = "Ruff Caches" },
    @{ Path = "**/.pytest_cache"; Description = "PyTest Caches" },
    @{ Path = "**/.tsbuildinfo"; Description = "TypeScript Incremental Info" },
    
    # Build Artifacts
    @{ Path = "**/dist"; Description = "Distribution Builds" },
    @{ Path = "**/target"; Description = "Rust/Tauri Targets" },
    @{ Path = "**/out"; Description = "Generic Output Dirs" },
    @{ Path = "**/build"; Description = "Build Directories" },
    
    # Logs & Temp
    @{ Path = "**/*.log"; Description = "System Logs" },
    @{ Path = "**/*.tmp"; Description = "Temporary Files" },
    @{ Path = "**/playwright-report"; Description = "Test Reports" },
    @{ Path = "**/test-results"; Description = "Test Results" }
)

if ($UltraDeep) {
    Write-Host "⚡ ULTRA-DEEP MODE ACTIVATED" -ForegroundColor Cyan
    $cleanupTargets += @(
        @{ Path = "node_modules/.cache"; Description = "NPM/Bun Caches" },
        @{ Path = "kernel/linux/.git/objects/pack/*.idx"; Description = "Kernel Pack Indices" }
    )
}

$totalFreed = 0
$itemCount = 0

foreach ($target in $cleanupTargets) {
    $items = Get-ChildItem -Path . -Include $target.Path -Recurse -ErrorAction SilentlyContinue
    
    if ($items) {
        Write-Host "Scanning: $($target.Description)..." -NoNewline -ForegroundColor Gray
        
        $currentSize = 0
        foreach ($i in $items) {
            if ($i.PSIsContainer) {
                $currentSize += (Get-ChildItem $i.FullName -Recurse -File | Measure-Object -Property Length -Sum).Sum
            } else {
                $currentSize += $i.Length
            }
        }
        
        if (!$Simulation) {
            $items | Remove-Item -Recurse -Force
            Write-Host " ✓ Cleaned ($([Math]::Round($currentSize / 1MB, 2)) MB)" -ForegroundColor Green
        } else {
            Write-Host " 🔍 Simulation ($([Math]::Round($currentSize / 1MB, 2)) MB)" -ForegroundColor Yellow
        }
        
        $totalFreed += $currentSize
        $itemCount++
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor DarkRed
if ($Simulation) {
    Write-Host "POTENTIAL SPACE SAVINGS: $([Math]::Round($totalFreed / 1MB, 2)) MB" -ForegroundColor Yellow
} else {
    Write-Host "SYSTEM LIGHTWEIGHTED: $([Math]::Round($totalFreed / 1MB, 2)) MB freed." -ForegroundColor Green
}
Write-Host "Status: STABLE // REDUCED FOOTPRINT" -ForegroundColor Gray
Write-Host ""
