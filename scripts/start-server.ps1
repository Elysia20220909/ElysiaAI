param(
    [string]$Port = "3000"
)

Write-Host "🚀 Starting Elysia server on http://localhost:$Port ..."

# Check Bun availability
$bun = Get-Command bun -ErrorAction SilentlyContinue
if (-not $bun) {
    Write-Error "Bun is not installed or not in PATH. Install from https://bun.sh"
    exit 1
}

# Set PORT env and run
$env:PORT = $Port
bun run src/index.ts