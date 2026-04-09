# 🌸 Elysia OS - Windows Production Manifestation Build
# This script bundles the full OS cluster into a standalone native installer.

Write-Host "🚀 Initiating Ultimate Manifestation Build (Tauri Bundle)..." -ForegroundColor Cyan

# 1. Pre-flight Resonance Check
python scripts/elysia_check.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Pre-flight resonance check failed. Refusing to manifest unstable build." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 2. Cleanup
Write-Host "🧹 Purging temporary resonance fields..." -ForegroundColor Yellow
if (Test-Path "src-tauri/target") { Remove-Item -Path "src-tauri/target" -Recurse -Force }

# 3. Build Node Assets (if needed - Tauri handles this usually via beforeBuildCommand)
# Write-Host "📦 Synchronizing frontend modules..." -ForegroundColor Blue
# bun install

# 4. Manifest Standalone App
Write-Host "💎 Manifesting Standalone OS EXE..." -ForegroundColor Magenta
bun run tauri build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✨ Manifestation Successful!" -ForegroundColor Green
    Write-Host "Installer location: src-tauri/target/release/bundle/" -ForegroundColor White
} else {
    Write-Host "`n❌ Manifestation Error. Please review the Cargo/Tauri logs." -ForegroundColor Red
    exit $LASTEXITCODE
}
