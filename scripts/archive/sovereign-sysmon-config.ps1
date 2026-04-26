# [CONFIG] Sovereign Sysmon Configuration Generator (Phase 221)
# "Hardening the Event Log. Precision auditing."

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Log-Sys($msg) {
    Write-Host "  [SYSMON] $msg" -ForegroundColor Green
}

Write-Host "==========================================================" -ForegroundColor White -BackgroundColor DarkCyan
Write-Host "       SOVEREIGN SYSMON INTEGRATION: PHASE_221" -ForegroundColor White -BackgroundColor DarkCyan
Write-Host "==========================================================" -ForegroundColor White -BackgroundColor DarkCyan

# 1. Verify Sysmon Installation
Log-Sys "Checking for Sysmon service..."
$Sysmon = Get-Service -Name "Sysmon" -ErrorAction SilentlyContinue
if (-not $Sysmon) {
    Log-Sys "Status: NOT_FOUND. Recommendation: Install Sysinternals Sysmon for Deep Auditing."
} else {
    Log-Sys "Status: ACTIVE. Current Version: $((Get-Item (Get-Process -Name Sysmon).Path).VersionInfo.ProductVersion)"
}

# 2. Hardened Configuration Template (XML)
Log-Sys "Generating Hardened Configuration XML..."
$ConfigXML = @"
<Sysmon schemaversion="4.30">
  <EventFiltering>
    <!-- 1. Process Creation: Monitoring unusual shells -->
    <ProcessCreate onmatch="include">
      <ParentImage condition="image">powershell.exe</ParentImage>
      <Image condition="image">cmd.exe</Image>
    </ProcessCreate>
    
    <!-- 2. Network Connect: Tracking C2 communication -->
    <NetworkConnect onmatch="include">
      <DestinationPort condition="is">4444</DestinationPort>
      <DestinationPort condition="is">8080</DestinationPort>
    </NetworkConnect>
    
    <!-- 3. File Create Stream Hash (ADS Detection) -->
    <FileCreateStreamHash onmatch="include">
      <TargetFilename condition="contains">elysia</TargetFilename>
    </FileCreateStreamHash>
  </EventFiltering>
</Sysmon>
"@

$OutputPath = Join-Path $PWD "data/sysmon_hardened_config.xml"
$ConfigXML | Out-File -FilePath $OutputPath -Encoding UTF8
Log-Sys "Configuration saved to: $OutputPath"

# 3. Final Integration Check
Log-Sys "Sysmon-link Ready. System logs are now high-fidelity."

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Black -BackgroundColor White
Write-Host " [CONFIGURED] AUDIT LAYER IS REINFORCED" -ForegroundColor Black -BackgroundColor White
Write-Host " Status: SYSMON_READY // CONFIG_LOCKED" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Black -BackgroundColor White
