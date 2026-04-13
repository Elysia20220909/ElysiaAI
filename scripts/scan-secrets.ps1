# 🌸 ElysiaAI Lightweight Secret Scanner (Windows Edition)
# A fast, regex-based scanner to detect hardcoded keys and secrets.

Write-Host "🔍 Scanning for secrets and hardcoded keys..." -ForegroundColor Cyan

$DangerousPatterns = @(
    "sk-[a-zA-Z0-9]{48}",         # OpenAI
    "AIza[0-9A-Za-z\-_]{35}",    # Google Cloud
    "gh[p|o|u|s|r]_[a-zA-Z0-9]{36,255}", # GitHub
    "ey[a-zA-Z0-9._-]{10,}",      # Potential JWT/Bearer
    "['""][a-zA-Z0-9_-]{32,}['""]" # General 32+ char strings in quotes
)

$Failed = $false
$ExcludeDirs = @("node_modules", "dist", ".git", "docs", "logs", "test-results")

# Scan JS/TS/JSON files
$Files = Get-ChildItem -Recurse -Include *.ts, *.js, *.json, *.yml, *.yaml | Where-Object { 
    $path = $_.FullName
    $exclude = $false
    foreach ($dir in $ExcludeDirs) {
        if ($path -like "*\$dir\*") { $exclude = $true; break }
    }
    -not $exclude -and $path -notlike "*example*" -and $path -notlike "*test*"
}

foreach ($pattern in $DangerousPatterns) {
    foreach ($file in $Files) {
        $matches = Select-String -Path $file.FullName -Pattern $pattern
        if ($matches) {
            Write-Host "⚠️ Potential secret detected in $($file.Name) for pattern: $pattern" -ForegroundColor Yellow
            $matches | ForEach-Object { Write-Host "  Line $($_.LineNumber): $($_.Line.Trim())" }
            $Failed = $true
        }
    }
}

if ($Failed) {
    Write-Host "❌ Secret scan failed. Please move secrets to .env files." -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ No secrets detected in codebase." -ForegroundColor Green
    exit 0
}
