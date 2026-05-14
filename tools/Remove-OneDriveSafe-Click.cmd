@echo off
setlocal EnableExtensions

set "LAUNCHER_PATH=%~f0"
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_PATH=%SCRIPT_DIR%Remove-OneDriveSafe.ps1"
set "NO_PAUSE="
set "RUN_ONCE="
set "DEBUG="
set "PRESET_CHOICE="

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--debug" (
    set "DEBUG=1"
    set "NO_PAUSE=1"
    set "RUN_ONCE=1"
    set "PRESET_CHOICE=1"
    shift
    goto parse_args
)
if /I "%~1"=="--no-pause" (
    set "NO_PAUSE=1"
    shift
    goto parse_args
)
if /I "%~1"=="--once" (
    set "RUN_ONCE=1"
    shift
    goto parse_args
)
if /I "%~1"=="--choice" (
    set "PRESET_CHOICE=%~2"
    set "RUN_ONCE=1"
    shift
    shift
    goto parse_args
)
echo [WARN] Unknown launcher argument: %~1
shift
goto parse_args

:args_done
if defined DEBUG (
    echo [DEBUG] Launcher: %LAUNCHER_PATH%
    echo [DEBUG] PowerShell script: %SCRIPT_PATH%
    echo [DEBUG] Run once: %RUN_ONCE%
    echo [DEBUG] No pause: %NO_PAUSE%
    echo [DEBUG] Preset choice: %PRESET_CHOICE%
    echo.
)

if not exist "%SCRIPT_PATH%" (
    echo [ERROR] Missing script:
    echo %SCRIPT_PATH%
    echo.
    if not defined NO_PAUSE pause
    exit /b 1
)

:menu
if not defined DEBUG cls
echo ================================================
echo  OneDrive Safe Removal Launcher
echo ================================================
echo.
echo  1. Report only - no changes
echo  2. Remove OneDrive app and normal leftovers
echo  3. Remove OneDrive app, normal leftovers, and installer caches
echo  4. Remove user OneDrive folder too - requires exact confirmation
echo  5. Admin cleanup for machine-wide Explorer registry
echo  0. Exit
echo.
if defined PRESET_CHOICE (
    echo Choose an option: %PRESET_CHOICE%
    set "CHOICE=%PRESET_CHOICE%"
    set "PRESET_CHOICE="
) else (
    set /p "CHOICE=Choose an option: "
)

if "%CHOICE%"=="1" goto report
if "%CHOICE%"=="2" goto apply
if "%CHOICE%"=="3" goto apply_caches
if "%CHOICE%"=="4" goto remove_user_folder
if "%CHOICE%"=="5" goto admin_registry
if "%CHOICE%"=="0" goto end

echo.
echo [WARN] Unknown option.
if not defined NO_PAUSE pause
if defined RUN_ONCE goto end
goto menu

:report
call :run_ps -SkipExplorerRestart
goto done

:apply
call :run_ps -Apply
goto done

:apply_caches
call :run_ps -Apply -PurgeInstallerCaches
goto done

:remove_user_folder
echo.
echo This can delete files under your OneDrive user folder.
echo Type DELETE-ONEDRIVE-DATA to continue.
echo Anything else cancels this option.
echo.
set /p "CONFIRM=Confirmation: "
if not "%CONFIRM%"=="DELETE-ONEDRIVE-DATA" (
    echo.
    echo [OK] Cancelled. No user OneDrive folder deletion was requested.
    goto done
)
call :run_ps -Apply -RemoveUserFolder -ConfirmUserDataDelete DELETE-ONEDRIVE-DATA
goto done

:admin_registry
echo.
echo This option asks Windows for Administrator permission.
echo It only targets machine-wide OneDrive Explorer registry entries.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File','%SCRIPT_PATH%','-Apply','-RemoveMachineRegistry')"
goto done

:run_ps
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%" %*
exit /b %ERRORLEVEL%

:done
echo.
echo Finished. Review the messages above.
if not defined NO_PAUSE pause
if defined RUN_ONCE goto end
goto menu

:end
endlocal
