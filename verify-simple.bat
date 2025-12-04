@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo ========================================
echo    SIMPLE SERVICE VERIFICATION
echo ========================================
echo.

set total=0
set ok=0

REM Redis Check
echo [1/4] Redis (6379)... 
powershell -NoProfile -Command "Test-NetConnection localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue" >nul 2>&1
if %errorlevel%==0 (
    echo       [OK] Redis is running
    set /a ok+=1
) else (
    echo       [FAIL] Redis is not responding
)
set /a total+=1

REM FastAPI Check
echo [2/4] FastAPI (8000)...
powershell -NoProfile -Command "try { $r = Invoke-RestMethod 'http://127.0.0.1:8000/health' -TimeoutSec 3; Write-Host $r.stats.quotes_count } catch { exit 1 }" >temp_result.txt 2>nul
if %errorlevel%==0 (
    set /p quotes=<temp_result.txt
    echo       [OK] FastAPI is running ^(!quotes! quotes^)
    set /a ok+=1
) else (
    echo       [FAIL] FastAPI is not responding
)
del temp_result.txt 2>nul
set /a total+=1

REM Ollama Check
echo [3/4] Ollama (11434)...
powershell -NoProfile -Command "try { $r = Invoke-RestMethod 'http://localhost:11434/api/tags' -TimeoutSec 3; Write-Host $r.models.Count } catch { exit 1 }" >temp_result.txt 2>nul
if %errorlevel%==0 (
    set /p models=<temp_result.txt
    echo       [OK] Ollama is running ^(!models! models^)
    set /a ok+=1
) else (
    echo       [FAIL] Ollama is not responding
)
del temp_result.txt 2>nul
set /a total+=1

REM RAG Test
echo [4/4] RAG Search...
powershell -NoProfile -Command "$body = '{\"text\":\"test\"}'; try { $r = Invoke-RestMethod 'http://127.0.0.1:8000/rag' -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 3; Write-Host $r.quotes.Count } catch { exit 1 }" >temp_result.txt 2>nul
if %errorlevel%==0 (
    set /p results=<temp_result.txt
    echo       [OK] RAG search working ^(!results! results^)
    set /a ok+=1
) else (
    echo       [FAIL] RAG search failed
)
del temp_result.txt 2>nul
set /a total+=1

echo.
echo ========================================
echo    RESULT: %ok%/%total% services OK
echo ========================================
echo.

if %ok%==%total% (
    echo [SUCCESS] All services are operational!
    exit /b 0
) else (
    echo [WARNING] Some services are not working
    exit /b 1
)
