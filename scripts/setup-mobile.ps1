$ErrorActionPreference = 'Stop'

Set-Location (Join-Path $PSScriptRoot '..' 'mobile')

Write-Host "📱 Setting up Elysia AI Mobile App..."

if (Get-Command bun -ErrorAction SilentlyContinue) {
    Write-Host "Using Bun..."
    bun install
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "Using npm..."
    npm install
} else {
    Write-Error "Neither bun nor npm found. Please install Node.js or Bun."
    exit 1
}

Write-Host "✅ Mobile app setup complete!"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  cd mobile"
Write-Host "  npm start      # or: bun start"
Write-Host ""
Write-Host "Then scan the QR code with Expo Go app (iOS/Android)"
