param(
    [string]$TaskName = "ElysiaAI Discord Bot Omoti",
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..\..")
$runnerPath = Join-Path $repoRoot "scripts\discord\run_bot_omoti_forever.ps1"
$envPath = Join-Path $repoRoot ".env"

if ($Uninstall) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "[+] Removed scheduled task: $TaskName"
    exit 0
}

if (-not (Test-Path -LiteralPath $runnerPath)) {
    throw "Runner not found: $runnerPath"
}

if (-not (Test-Path -LiteralPath $envPath)) {
    throw ".env is missing. Add DISCORD_BOT_TOKEN before installing the scheduled task."
}

$tokenLine = Select-String -LiteralPath $envPath -Pattern '^\s*DISCORD_BOT_TOKEN\s*=\s*\S+' -Quiet
if (-not $tokenLine) {
    throw "DISCORD_BOT_TOKEN is missing in .env. Rotate leaked tokens before adding a new one."
}

$currentUser = if ($env:USERDOMAIN) {
    "$env:USERDOMAIN\$env:USERNAME"
}
else {
    $env:USERNAME
}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Keeps ElysiaAI Discord bot_omoti.py running for the current user." `
    -Force | Out-Null

Write-Host "[+] Installed scheduled task: $TaskName"
Write-Host "[i] Start it now with: Start-ScheduledTask -TaskName `"$TaskName`""
