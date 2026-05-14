param(
	[string]$OutputDirectory = (Get-Location).Path
)

$ErrorActionPreference = "Continue"

$repoName = Split-Path -Leaf (Get-Location)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$out = Join-Path $OutputDirectory "git-triage-$repoName-$timestamp.txt"

function Get-CurrentBranch {
	$branch = & git rev-parse --abbrev-ref HEAD 2>$null
	if ($LASTEXITCODE -eq 0 -and $branch) {
		return ($branch | Select-Object -First 1).Trim()
	}

	$shortHead = & git rev-parse --short HEAD 2>$null
	if ($LASTEXITCODE -eq 0 -and $shortHead) {
		return ($shortHead | Select-Object -First 1).Trim()
	}

	return "unknown"
}

function ConvertTo-RedactedLine {
	param([string]$Line)

	$redacted = $Line -replace "(https?://)[^/@\s]+@", '$1<redacted>@'
	$redacted = [regex]::Replace(
		$redacted,
		"([?&](?:access_token|token)=)[^&\s]+",
		'$1<redacted>',
		[System.Text.RegularExpressions.RegexOptions]::IgnoreCase
	)

	if ($redacted -match "^((?:GIT|GH|GITHUB|NETRC|CREDENTIAL|SSH_AUTH_SOCK)[A-Z0-9_]*=)") {
		return "$($Matches[1])<set>"
	}

	return $redacted
}

function Write-ReportLine {
	param([string]$Line = "")

	Add-Content -Path $out -Value $Line -Encoding utf8
	Write-Output $Line
}

function Invoke-ReportCommand {
	param(
		[string]$FilePath,
		[string[]]$ArgumentList = @(),
		[switch]$Redact,
		[int]$First = 0
	)

	$lines = & $FilePath @ArgumentList 2>&1
	if ($First -gt 0) {
		$lines = $lines | Select-Object -First $First
	}

	foreach ($line in $lines) {
		$text = $line.ToString()
		if ($Redact) {
			$text = ConvertTo-RedactedLine $text
		}
		Write-ReportLine $text
	}
}

New-Item -Path $out -ItemType File -Force | Out-Null

Write-ReportLine "=== repo: $repoName"
Write-ReportLine "=== run at: $((Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")) (UTC)"
Write-ReportLine "=== git version: $(& git --version 2>$null)"
$branch = Get-CurrentBranch
Write-ReportLine "=== branch: $branch"
Write-ReportLine "=== git status ==="
Invoke-ReportCommand git @("status", "--porcelain=2", "--branch")
Write-ReportLine "=== branch -vv ==="
Invoke-ReportCommand git @("branch", "-vv")
Write-ReportLine "=== remote -v ==="
Invoke-ReportCommand git @("remote", "-v") -Redact
Write-ReportLine "=== remote show origin ==="
Invoke-ReportCommand git @("remote", "show", "origin") -Redact
Write-ReportLine "=== ls-remote origin (heads + tags) ==="
Invoke-ReportCommand git @("ls-remote", "--heads", "--tags", "origin")
Write-ReportLine "=== fetch --all --prune (attempt, non-fatal) ==="
& git fetch --all --prune *> $null
if ($LASTEXITCODE -eq 0) {
	Write-ReportLine "fetch ok"
} else {
	Write-ReportLine "fetch failed (non-fatal)"
}
Write-ReportLine "=== origin log (head) ==="
$originLog = & git log --oneline -n 30 "origin/$branch" 2>$null
if ($LASTEXITCODE -eq 0 -and $originLog) {
	foreach ($line in $originLog) {
		Write-ReportLine $line
	}
} else {
	Write-ReportLine "no origin/branch or fetch failed"
}
Write-ReportLine "=== local log (latest 50) ==="
Invoke-ReportCommand git @("log", "--oneline", "-n", "50")
Write-ReportLine "=== reflog (latest 200) ==="
Invoke-ReportCommand git @("reflog", "--no-abbrev", "-n", "200")
Write-ReportLine "=== show-ref (all refs) ==="
Invoke-ReportCommand git @("show-ref")
Write-ReportLine "=== for-each-ref (human dates) ==="
Invoke-ReportCommand git @(
	"for-each-ref",
	"--format=%(refname:short) %(objectname) %(authordate:iso8601)",
	"refs/heads",
	"refs/remotes",
	"refs/tags"
)
Write-ReportLine "=== fsck --lost-found (first 200 lines) ==="
Invoke-ReportCommand git @("fsck", "--no-progress", "--lost-found") -First 200
Write-ReportLine "=== credential helpers ==="
Invoke-ReportCommand git @("config", "--get-all", "credential.helper")
Write-ReportLine "=== Git / GH environment hints (values redacted) ==="
Get-ChildItem Env: |
	Where-Object { $_.Name -match "^(GIT|GH|GITHUB|NETRC|CREDENTIAL|SSH_AUTH_SOCK)" } |
	Sort-Object Name |
	ForEach-Object { Write-ReportLine (ConvertTo-RedactedLine "$($_.Name)=$($_.Value)") }
Write-ReportLine "=== end ==="

Write-Host "WROTE $out"
