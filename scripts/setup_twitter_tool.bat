@echo off
REM Twitter Archive Bulk Delete Tool - Setup Script for Windows
REM This script sets up the Python environment and dependencies

echo ============================================================
echo Twitter Archive Bulk Delete Tool - Setup
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

echo [1/4] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/4] Installing dependencies...
pip install -r python\requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo [4/4] Checking config/.env file...
if not exist "config\.env" (
    echo.
    echo WARNING: config/.env file not found
    echo Please create it and add your Twitter API credentials:
    echo.
    echo TWITTER_API_KEY=your-api-key
    echo TWITTER_API_SECRET_KEY=your-api-secret
    echo TWITTER_ACCESS_TOKEN=your-access-token
    echo TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret
    echo.
    echo You can copy config/.env.example and fill in your credentials.
)

echo.
echo ============================================================
echo Setup completed successfully!
echo ============================================================
echo.
echo Next steps:
echo 1. Ensure config/.env contains your Twitter API credentials
echo 2. Download your Twitter archive and extract tweets.js
echo 3. Run: python python\delete_tweets_from_archive.py tweets.js
echo.
echo To activate the virtual environment in the future, run:
echo   venv\Scripts\activate.bat
echo.
pause
