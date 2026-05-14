param(
    [string]$Python = "python3",
    [int]$RestartDelaySeconds = 10
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..\..")
$botPath = Join-Path $repoRoot "bot_omoti.py"
$envPath = Join-Path $repoRoot ".env"
$logDir = Join-Path $repoRoot "logs\discord-bot"

if (-not (Test-Path -LiteralPath $botPath)) {
    throw "Bot entrypoint not found: $botPath"
}

if (-not (Test-Path -LiteralPath $envPath)) {
    throw ".env is missing. Add DISCORD_BOT_TOKEN before starting the bot."
}

$tokenLine = Select-String -LiteralPath $envPath -Pattern '^\s*DISCORD_BOT_TOKEN\s*=\s*\S+' -Quiet
if (-not $tokenLine) {
    throw "DISCORD_BOT_TOKEN is missing in .env. Rotate leaked tokens before adding a new one."
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logPath = Join-Path $logDir "bot-omoti.log"
    "[$timestamp] starting bot_omoti.py" | Tee-Object -FilePath $logPath -Append

    Push-Location $repoRoot
    try {
        & $Python $botPath 2>&1 | Tee-Object -FilePath $logPath -Append
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] bot exited with code $exitCode; restarting in $RestartDelaySeconds seconds" |
        Tee-Object -FilePath $logPath -Append
    Start-Sleep -Seconds $RestartDelaySeconds
}
