# Final Service Verification Script
Write-Host "===========================================`n"
Write-Host "   FINAL SERVICE VERIFICATION   `n" -ForegroundColor Green
Write-Host "===========================================`n"

$results = @()

# Redis Check
Write-Host "Checking Redis (6379)... " -NoNewline
try {
    $redis = Test-NetConnection localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($redis) {
        Write-Host "OK" -ForegroundColor Green
        $results += @{Service="Redis"; Status="OK"; Port=6379}
    } else {
        Write-Host "FAILED" -ForegroundColor Red
        $results += @{Service="Redis"; Status="FAILED"; Port=6379}
    }
} catch {
    Write-Host "ERROR" -ForegroundColor Red
    $results += @{Service="Redis"; Status="ERROR"; Port=6379}
}

# FastAPI Check
Write-Host "Checking FastAPI (8000)... " -NoNewline
try {
    $fa = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 5
    Write-Host "OK" -ForegroundColor Green
    Write-Host "  - Quotes: $($fa.stats.quotes_count)" -ForegroundColor Gray
    Write-Host "  - Ollama: $($fa.ollama_status)" -ForegroundColor Gray
    $results += @{Service="FastAPI"; Status="OK"; Port=8000; Details="Quotes: $($fa.stats.quotes_count)"}
} catch {
    Write-Host "FAILED" -ForegroundColor Red
    $results += @{Service="FastAPI"; Status="FAILED"; Port=8000}
}

# Ollama Check
Write-Host "Checking Ollama (11434)... " -NoNewline
try {
    $ollama = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5
    Write-Host "OK" -ForegroundColor Green
    Write-Host "  - Models: $($ollama.models.Count)" -ForegroundColor Gray
    $results += @{Service="Ollama"; Status="OK"; Port=11434; Details="Models: $($ollama.models.Count)"}
} catch {
    Write-Host "FAILED" -ForegroundColor Red
    $results += @{Service="Ollama"; Status="FAILED"; Port=11434}
}

# RAG Test
Write-Host "`nTesting RAG Search... " -NoNewline
try {
    $ragBody = @{text="エリシアに会いたい"} | ConvertTo-Json
    $rag = Invoke-RestMethod -Uri "http://127.0.0.1:8000/rag" -Method POST -ContentType "application/json" -Body $ragBody -TimeoutSec 5
    Write-Host "OK" -ForegroundColor Green
    Write-Host "  - Found: $($rag.quotes.Count) quotes" -ForegroundColor Gray
    if ($rag.quotes.Count -gt 0) {
        Write-Host "  - Top: $($rag.quotes[0].Substring(0, [Math]::Min(50, $rag.quotes[0].Length)))..." -ForegroundColor Gray
    }
    $results += @{Service="RAG"; Status="OK"; Details="Found: $($rag.quotes.Count)"}
} catch {
    Write-Host "FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $results += @{Service="RAG"; Status="FAILED"}
}

# Summary
Write-Host "`n===========================================`n" -ForegroundColor Cyan
$okCount = ($results | Where-Object {$_.Status -eq "OK"}).Count
$totalCount = $results.Count
Write-Host "  RESULT: $okCount/$totalCount services operational`n" -ForegroundColor $(if($okCount -eq $totalCount){"Green"}else{"Yellow"})
Write-Host "===========================================`n" -ForegroundColor Cyan

# Job Status
Write-Host "FastAPI Job Status:" -ForegroundColor Cyan
Get-Job -Id 1 -ErrorAction SilentlyContinue | Format-Table Id,State,HasMoreData -AutoSize
