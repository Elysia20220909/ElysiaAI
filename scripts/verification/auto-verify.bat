@echo off
chcp 65001 >nul
echo ========================================
echo    AUTO VERIFICATION STARTING
echo ========================================
echo.

pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify-services.ps1" > "%~dp0verification-results.txt" 2>&1

echo.
echo ========================================
echo    RESULTS SAVED TO:
echo    verification-results.txt
echo ========================================
echo.

type "%~dp0verification-results.txt"

echo.
echo ========================================
echo    VERIFICATION COMPLETE
echo ========================================
