param(
    [int]$FastApiPort = 8000,
    [int]$ElysiaPort = 3000,
    [switch]$NetworkSim,
    [switch]$NoWaitStop
)

$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
$logs = Join-Path $root 'logs'
if (-not (Test-Path $logs)) { New-Item -ItemType Directory -Path $logs | Out-Null }

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Wait-ForUrl($url, [int]$timeoutSec = 30) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
        try {
            $r = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    return $false
}

Write-Host "🧰 Logs: $logs"

# 1) Start FastAPI (background)
$fastapiOut = Join-Path $logs 'fastapi.out.log'
$fastapiErr = Join-Path $logs 'fastapi.err.log'

Write-Host "🚀 Starting FastAPI (port $FastApiPort) ..."
$fastapi = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    '-NoProfile','-ExecutionPolicy','Bypass','-File',
    (Join-Path $PSScriptRoot 'start-fastapi.ps1')
) -RedirectStandardOutput $fastapiOut -RedirectStandardError $fastapiErr -PassThru -WindowStyle Hidden

if (-not $fastapi) { throw "Failed to start FastAPI" }

$ok = Wait-ForUrl ("http://127.0.0.1:{0}/docs" -f $FastApiPort) 40
if ($ok) {
    Write-Host "✅ FastAPI is up: http://127.0.0.1:$FastApiPort"
} else {
    Write-Warning "FastAPI did not become ready in time. Check $fastapiOut / $fastapiErr"
}

# 2) Optional: Start Network Simulation API (background)
$sim = $null
if ($NetworkSim) {
    $simOut = Join-Path $logs 'network-sim.out.log'
    $simErr = Join-Path $logs 'network-sim.err.log'
    Write-Host "🌐 Starting Network Simulation API ..."
    $sim = Start-Process -FilePath "powershell.exe" -ArgumentList @(
        '-NoProfile','-ExecutionPolicy','Bypass','-File',
        (Join-Path $PSScriptRoot 'start-network-sim.ps1')
    ) -RedirectStandardOutput $simOut -RedirectStandardError $simErr -PassThru -WindowStyle Hidden
}

# 3) Start Elysia server (background)
$elysiaOut = Join-Path $logs 'elysia.out.log'
$elysiaErr = Join-Path $logs 'elysia.err.log'

Write-Host "⚡ Starting Elysia (port $ElysiaPort) ..."
$elysia = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    '-NoProfile','-ExecutionPolicy','Bypass','-File',
    (Join-Path $PSScriptRoot 'start-server.ps1'),
    '-Port', "$ElysiaPort"
) -RedirectStandardOutput $elysiaOut -RedirectStandardError $elysiaErr -PassThru -WindowStyle Hidden

if (-not $elysia) { throw "Failed to start Elysia" }

$ok2 = Wait-ForUrl ("http://localhost:{0}" -f $ElysiaPort) 20
if ($ok2) {
    Write-Host "✅ Elysia is up: http://localhost:$ElysiaPort"
} else {
    Write-Warning "Elysia did not become ready in time. Check $elysiaOut / $elysiaErr"
}

Write-Host "---"
Write-Host "📌 Summary"
Write-Host ("FastAPI PID: {0}  logs: {1} / {2}" -f $fastapi.Id, $fastapiOut, $fastapiErr)
if ($sim) { Write-Host ("NetworkSim PID: {0}" -f $sim.Id) }
Write-Host ("Elysia PID: {0}  logs: {1} / {2}" -f $elysia.Id, $elysiaOut, $elysiaErr)
Write-Host "Open:  http://127.0.0.1:$FastApiPort/docs   http://localhost:$ElysiaPort"
Write-Host "---"

if (-not $NoWaitStop) {
    Write-Host "Press Enter to stop all..."
    [void][System.Console]::ReadLine()
}

Write-Host "⏹ Stopping processes..."
foreach ($p in @($elysia,$sim,$fastapi)) {
    if ($p -and -not $p.HasExited) {
        try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {}
    }
}
Write-Host "✅ Stopped."
