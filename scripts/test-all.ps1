#!/usr/bin/env pwsh
# Integrated Health Check & Test Script for All Platforms

param(
    [switch]$Quick,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

Write-Host "🏥 Elysia AI - Integrated Health Check & Test" -ForegroundColor Magenta
Write-Host ""

$results = @{
    Passed   = 0
    Failed   = 0
    Warnings = 0
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$Timeout = 5
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $Timeout -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✓ $Name : OK (${response.StatusCode})" -ForegroundColor Green
            $results.Passed++
            return $true
        }
        else {
            Write-Host "  ⚠ $Name : Unexpected status ${response.StatusCode}" -ForegroundColor Yellow
            $results.Warnings++
            return $false
        }
    }
    catch {
        Write-Host "  ✗ $Name : FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $results.Failed++
        return $false
    }
}

function Test-ApiFeature {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "POST",
        [hashtable]$Body
    )

    try {
        $json = $Body | ConvertTo-Json
        $response = Invoke-WebRequest -Uri $Url -Method $Method -Body $json -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing

        if ($response.StatusCode -lt 300) {
            Write-Host "  ✓ $Name : OK" -ForegroundColor Green
            if ($Verbose) {
                Write-Host "    Response: $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))..." -ForegroundColor Gray
            }
            $results.Passed++
            return $true
        }
        else {
            Write-Host "  ⚠ $Name : Status ${response.StatusCode}" -ForegroundColor Yellow
            $results.Warnings++
            return $false
        }
    }
    catch {
        Write-Host "  ✗ $Name : FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $results.Failed++
        return $false
    }
}

# 1. Backend Health Checks
Write-Host "🔍 Backend Services" -ForegroundColor Cyan
Write-Host ""

$backends = @{
    "FastAPI Health" = "http://localhost:8000/health"
    "Elysia Ping"    = "http://localhost:3000/ping"
    "Elysia Health"  = "http://localhost:3000/health"
}

foreach ($name in $backends.Keys) {
    Test-Endpoint -Name $name -Url $backends[$name]
}

Write-Host ""

# 2. API Functional Tests
Write-Host "🧪 API Functional Tests" -ForegroundColor Cyan
Write-Host ""

# Test demo chat endpoint
$chatTest = Test-ApiFeature -Name "Demo Chat API" -Url "http://localhost:3000/api/demo/chat" -Body @{
    message  = "こんにちは"
    strategy = "quality"
}

# Test demo voice endpoint
$voiceTest = Test-ApiFeature -Name "Demo Voice API" -Url "http://localhost:3000/api/demo/voice" -Body @{
    text = "テストメッセージ"
}

Write-Host ""

# 3. Frontend Availability
if (-not $Quick) {
    Write-Host "🌐 Frontend Pages" -ForegroundColor Cyan
    Write-Host ""

    $pages = @{
        "Web Demo (AIRI)" = "http://localhost:3000/demo-airi.html"
        "Admin Dashboard" = "http://localhost:3000/admin-extended.html"
        "Main Index"      = "http://localhost:3000/index.html"
        "Swagger UI"      = "http://localhost:3000/swagger"
    }

    foreach ($name in $pages.Keys) {
        Test-Endpoint -Name $name -Url $pages[$name]
    }

    Write-Host ""
}

# 4. Desktop App Checks
Write-Host "🖥️ Desktop Applications" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "desktop/package.json") {
    Write-Host "  ✓ Electron app : Found" -ForegroundColor Green
    $results.Passed++
}
else {
    Write-Host "  ⚠ Electron app : Not found" -ForegroundColor Yellow
    $results.Warnings++
}

if (Test-Path "tauri-app/package.json") {
    Write-Host "  ✓ Tauri app : Found" -ForegroundColor Green
    $results.Passed++
}
else {
    Write-Host "  ⚠ Tauri app : Not found" -ForegroundColor Yellow
    $results.Warnings++
}

Write-Host ""

# 5. Mobile App Checks
Write-Host "📱 Mobile Application" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "mobile/package.json") {
    Write-Host "  ✓ Expo mobile : Found" -ForegroundColor Green
    $results.Passed++
}
else {
    Write-Host "  ⚠ Expo mobile : Not found" -ForegroundColor Yellow
    $results.Warnings++
}

Write-Host ""

# 6. Summary
Write-Host "📊 Test Summary" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Passed   : $($results.Passed)" -ForegroundColor Green
Write-Host "  Warnings : $($results.Warnings)" -ForegroundColor Yellow
Write-Host "  Failed   : $($results.Failed)" -ForegroundColor Red
Write-Host ""

$total = $results.Passed + $results.Warnings + $results.Failed
$passRate = if ($total -gt 0) { [math]::Round(($results.Passed / $total) * 100, 1) } else { 0 }

Write-Host "  Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -gt 80) { "Green" } elseif ($passRate -gt 50) { "Yellow" } else { "Red" })
Write-Host ""

# Exit code
if ($results.Failed -eq 0) {
    Write-Host "✨ All critical tests passed!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "❌ Some tests failed. Please check the logs." -ForegroundColor Red
    exit 1
}
