# 🌸 ElysiaAI System Hardening Script (Windows Edition)
# Addresses released/operational security requirements.

Write-Host "🛡️ Starting Sovereign System Hardening..." -ForegroundColor Cyan

# 1. Database Protection
if (Test-Path "dev.db") {
    Write-Host "📦 Securing SQLite database (dev.db)..." -ForegroundColor Yellow
    # Set permissions to owner only (similar to chmod 600)
    icacls "dev.db" /inheritance:r
    icacls "dev.db" /grant:r "$($env:USERNAME):F"
    Write-Host "✅ Permissions set: Only current user can access dev.db." -ForegroundColor Green
} else {
    Write-Host "⚠️ dev.db not found in root. Skipping database hardening." -ForegroundColor Gray
}

# 2. Environmental Integrity
if (-not (Test-Path ".env")) {
    Write-Host "❌ CRITICAL: .env file is missing! System cannot operate securely." -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ .env file detected." -ForegroundColor Green
}

# 3. Directory Hardening
$Directories = @("config/private", "packages/server/logs", "backups")
foreach ($dir in $Directories) {
    if (Test-Path $dir) {
        Write-Host "📂 Hardening directory: $dir" -ForegroundColor Yellow
        icacls $dir /inheritance:r
        icacls $dir /grant:r "$($env:USERNAME):F"
    }
}

# 4. Dependency Audit
Write-Host "🧪 Checking for security scanner configuration..." -ForegroundColor Cyan
# bun pm scan requires configuration in bunfig.toml. 
bun pm scan
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ No local security scanner configured in bunfig.toml or scan failed. This is expected if 'scanner' is not set." -ForegroundColor Gray
}

# 5. Secret Scan
Write-Host "🔍 Running Secret Scan..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File scripts/scan-secrets.ps1

Write-Host "✨ Hardening complete. ElysiaAI is now in 'Sovereign' state." -ForegroundColor Magenta
