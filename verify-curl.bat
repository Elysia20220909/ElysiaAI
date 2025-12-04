@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo ========================================
echo    CURL-BASED SERVICE VERIFICATION
echo ========================================
echo.
echo Using curl for HTTP checks...
echo.

set total=0
set ok=0

REM Check if curl is available
where curl >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] curl is not installed or not in PATH
    echo Please install curl or use verify-simple.bat instead
    pause
    exit /b 1
)

REM Redis Check (using PowerShell for port check)
echo [1/4] Redis (6379)...
powershell -NoProfile -Command "Test-NetConnection localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue" >nul 2>&1
if %errorlevel%==0 (
    echo       [OK] Redis port is open
    set /a ok+=1
) else (
    echo       [FAIL] Redis port is closed
)
set /a total+=1

REM FastAPI Health Check
echo [2/4] FastAPI (8000)...
curl -s -o temp_health.json -w "%%{http_code}" http://127.0.0.1:8000/health >temp_status.txt 2>nul
set /p status=<temp_status.txt
if "%status%"=="200" (
    echo       [OK] FastAPI is responding
    powershell -NoProfile -Command "(Get-Content temp_health.json | ConvertFrom-Json).stats.quotes_count" >temp_quotes.txt 2>nul
    set /p quotes=<temp_quotes.txt
    echo       ^(Quotes: !quotes!^)
    set /a ok+=1
) else (
    echo       [FAIL] FastAPI returned status %status%
)
del temp_health.json temp_status.txt temp_quotes.txt 2>nul
set /a total+=1

REM Ollama Check
echo [3/4] Ollama (11434)...
curl -s -o temp_ollama.json -w "%%{http_code}" http://localhost:11434/api/tags >temp_status.txt 2>nul
set /p status=<temp_status.txt
if "%status%"=="200" (
    echo       [OK] Ollama is responding
    powershell -NoProfile -Command "(Get-Content temp_ollama.json | ConvertFrom-Json).models.Count" >temp_models.txt 2>nul
    set /p models=<temp_models.txt
    echo       ^(Models: !models!^)
    set /a ok+=1
) else (
    echo       [FAIL] Ollama returned status %status%
)
del temp_ollama.json temp_status.txt temp_models.txt 2>nul
set /a total+=1

REM RAG Search Test
echo [4/4] RAG Search...
curl -s -o temp_rag.json -w "%%{http_code}" -X POST http://127.0.0.1:8000/rag -H "Content-Type: application/json" -d "{\"text\":\"test\"}" >temp_status.txt 2>nul
set /p status=<temp_status.txt
if "%status%"=="200" (
    echo       [OK] RAG search is working
    powershell -NoProfile -Command "(Get-Content temp_rag.json | ConvertFrom-Json).quotes.Count" >temp_results.txt 2>nul
    set /p results=<temp_results.txt
    echo       ^(Results: !results!^)
    set /a ok+=1
) else (
    echo       [FAIL] RAG search returned status %status%
)
del temp_rag.json temp_status.txt temp_results.txt 2>nul
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
