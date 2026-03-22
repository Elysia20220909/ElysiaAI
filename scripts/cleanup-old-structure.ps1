#!/usr/bin/env pwsh
# Cleanup old directory structure after migration to .internal/
# Run this ONLY after verifying the new structure works

Write-Host "🧹 Cleaning up old directory structure..." -ForegroundColor Cyan

$items = @(
    "config\private",
    "src\config\internal",
    "src\core\security",
    "src\database\config"
)

foreach ($item in $items) {
    if (Test-Path $item) {
        Write-Host "  Removing: $item" -ForegroundColor Yellow
        Remove-Item -Path $item -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host "New structure:" -ForegroundColor Cyan
Write-Host "  .internal/secure/env/    - Environment variables" -ForegroundColor Gray
Write-Host "  .internal/app/llm/       - LLM configuration" -ForegroundColor Gray
Write-Host "  .internal/secure/auth/   - Security modules" -ForegroundColor Gray
Write-Host "  .internal/secure/db/     - Database config" -ForegroundColor Gray
