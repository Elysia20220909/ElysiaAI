param(
    [string]$Port = "3000",
    [string]$TestPattern = "tests/integration/api.test.ts",
    [int]$TimeoutSec = 30
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root

function Wait-ForUrl($url, [int]$timeoutSec = 30) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
        try {
            $r = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
        }
        catch { Start-Sleep -Milliseconds 500 }
    }
    return $false
}

Write-Host "🧪 Starting server for tests on port $Port ..."
$env:PORT = $Port
$env:PRISMA_CLIENT_ENGINE_TYPE = 'library'

# Start server in background
$elysiaOut = Join-Path $root 'logs/test-server.out.log'
$elysiaErr = Join-Path $root 'logs/test-server.err.log'
if (-not (Test-Path (Join-Path $root 'logs'))) { New-Item -ItemType Directory -Path (Join-Path $root 'logs') | Out-Null }

$server = Start-Process -FilePath "bun" -ArgumentList @('start-server.ts') -RedirectStandardOutput $elysiaOut -RedirectStandardError $elysiaErr -PassThru -NoNewWindow

try {
    $ok = Wait-ForUrl ("http://localhost:{0}/ping" -f $Port) $TimeoutSec
    if (-not $ok) {
        Write-Host "❌ Server did not become ready in $TimeoutSec seconds. Logs: $elysiaOut / $elysiaErr"
        Get-Content $elysiaErr -ErrorAction SilentlyContinue | Select-Object -Last 200 | Write-Host
        exit 1
    }
    Write-Host "✅ Server is ready. Running tests..."

    $env:REDIS_ENABLED = 'false'
    $env:DATABASE_URL = 'file:./dev.db'
    bun test $TestPattern
    $exit = $LASTEXITCODE
}
finally {
    if ($server -and -not $server.HasExited) {
        Write-Host "⏹ Stopping test server (PID $($server.Id)) ..."
        Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    }
}

Pop-Location
exit $exit
