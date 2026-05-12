param(
  [string]$HostName = "10.10.20.30",
  [string]$SshUser = "elisia",
  [string]$BindIp = "",
  [string]$Timezone = "Asia/Tokyo",
  [string]$DomainSuffix = "home.arpa",
  [string]$PullModel = "llama3.2",
  [string]$SourceDir = "",
  [string]$TargetDir = "/opt/elisia-core",
  [switch]$Start,
  [switch]$ValidateOnly,
  [switch]$SkipCopy,
  [switch]$SkipDockerInstall,
  [switch]$FetchCaddyRoot,
  [string]$LocalCertPath = "",
  [switch]$Help
)

$ErrorActionPreference = "Stop"

function Show-Usage {
  @"
E.L.I.S.I.A. local server setup launcher for Windows.

Usage:
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-server/Invoke-ElisiaLocalServerSetup.ps1 [options]

Safe default:
  Copies deploy/elisia-core and runs setup.sh with --no-start.
  Add -Start to start containers and optionally pull an Ollama model.

Options:
  -HostName HOST          Docker Core VM host or IP. Default: 10.10.20.30
  -SshUser USER           SSH user. Default: elisia
  -BindIp IP              Service bind IP. Default: same as HostName
  -Timezone TZ            Timezone. Default: Asia/Tokyo
  -DomainSuffix NAME      Local DNS suffix. Default: home.arpa
  -PullModel MODEL        Ollama model pulled when -Start is set. Default: llama3.2
  -SourceDir DIR          Local deploy/elisia-core path
  -TargetDir DIR          Remote target directory. Default: /opt/elisia-core
  -Start                  Start containers after validation
  -ValidateOnly           Validate existing remote files only
  -SkipCopy               Do not copy deploy files
  -SkipDockerInstall      Pass --skip-docker-install to setup.sh
  -FetchCaddyRoot         Copy remote caddy/root.crt to this workstation after setup
  -LocalCertPath PATH     Destination for root.crt. Default: ./root.crt

Examples:
  # Prepare, validate, and do not start containers
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-server/Invoke-ElisiaLocalServerSetup.ps1

  # Start the stack and pull llama3.2
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-server/Invoke-ElisiaLocalServerSetup.ps1 -Start

  # Start against a custom host and model
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-server/Invoke-ElisiaLocalServerSetup.ps1 -HostName 10.10.20.30 -PullModel qwen2.5:7b -Start
"@
}

if ($Help) {
  Show-Usage
  exit 0
}

function Invoke-Checked {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  Write-Host ""
  Write-Host "==> $Command $($Arguments -join ' ')"
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Command"
  }
}

function Quote-Sh {
  param([string]$Value)
  if ($Value.Contains("'")) {
    throw "Single quotes are not supported in remote shell arguments: $Value"
  }
  return "'" + $Value + "'"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if ([string]::IsNullOrWhiteSpace($SourceDir)) {
  $SourceDir = Join-Path $repoRoot "deploy\elisia-core"
}
if ([string]::IsNullOrWhiteSpace($BindIp)) {
  $BindIp = $HostName
}
if ([string]::IsNullOrWhiteSpace($LocalCertPath)) {
  $LocalCertPath = Join-Path (Get-Location) "root.crt"
}

$SourceDir = (Resolve-Path $SourceDir).Path
if (-not (Test-Path (Join-Path $SourceDir "setup.sh"))) {
  throw "setup.sh not found in SourceDir: $SourceDir"
}
if (-not (Test-Path (Join-Path $SourceDir "compose.yaml"))) {
  throw "compose.yaml not found in SourceDir: $SourceDir"
}

$sshTarget = "${SshUser}@${HostName}"
$quotedTargetDir = Quote-Sh $TargetDir

Write-Host "E.L.I.S.I.A. local server setup launcher"
Write-Host "Target: ${sshTarget}:$TargetDir"
Write-Host "Source: $SourceDir"
Write-Host "Mode:   $(if ($Start) { 'start' } elseif ($ValidateOnly) { 'validate-only' } else { 'prepare-no-start' })"

if (-not $SkipCopy -and -not $ValidateOnly) {
  $remotePrepare = "rm -rf /tmp/elisia-core-upload && sudo mkdir -p $quotedTargetDir && sudo chown -R " + '"$USER:$USER"' + " $quotedTargetDir"
  Invoke-Checked "ssh" @($sshTarget, $remotePrepare)

  Invoke-Checked "scp" @("-r", $SourceDir, "${sshTarget}:/tmp/elisia-core-upload")

  $remoteCopy = "sudo cp -a /tmp/elisia-core-upload/. $quotedTargetDir && sudo chown -R " + '"$USER:$USER"' + " $quotedTargetDir"
  Invoke-Checked "ssh" @($sshTarget, $remoteCopy)
}

$setupArgs = @("--target-dir", $TargetDir, "--bind-ip", $BindIp, "--timezone", $Timezone, "--domain-suffix", $DomainSuffix)
if ($SkipDockerInstall) {
  $setupArgs += "--skip-docker-install"
} else {
  $setupArgs += "--install-docker"
}

if ($ValidateOnly) {
  $setupArgs += "--validate-only"
} elseif (-not $Start) {
  $setupArgs += "--no-start"
}

if ($Start -and -not [string]::IsNullOrWhiteSpace($PullModel)) {
  $setupArgs += @("--pull-model", $PullModel)
}

$quotedSetupArgs = ($setupArgs | ForEach-Object { Quote-Sh $_ }) -join " "
$remoteSetup = "cd $quotedTargetDir && chmod +x setup.sh backup-volumes.sh && sudo ./setup.sh $quotedSetupArgs"
Invoke-Checked "ssh" @($sshTarget, $remoteSetup)

if ($FetchCaddyRoot) {
  Invoke-Checked "scp" @("${sshTarget}:$TargetDir/caddy/root.crt", $LocalCertPath)
  Write-Host ""
  Write-Host "Caddy root certificate copied to: $LocalCertPath"
  Write-Host "Trust it manually after verifying this is your local E.L.I.S.I.A. Caddy CA."
}

Write-Host ""
Write-Host "E.L.I.S.I.A. local server setup launcher complete."
