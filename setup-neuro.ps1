@REM Neuro + Elysia AI Integration Setup Script (Windows)
@REM NeuroモジュールとElysia AIの統合をセットアップ

@echo off
setlocal enabledelayedexpansion

echo 🚀 Neuro + Elysia AI Integration Setup
echo ========================================

REM Check if we're in the right directory
if not exist package.json (
    echo ❌ Error: package.json not found. Run from project root.
    exit /b 1
)

REM Install Python dependencies
echo 📦 Installing Python dependencies...
cd python

if not exist venv (
    if not exist .venv (
        echo 📝 Creating Python virtual environment...
        python -m venv venv
        call venv\Scripts\activate.bat
    ) else (
        call .venv\Scripts\activate.bat
    )
)

echo 📥 Installing pip packages...
pip install -r requirements.txt

REM Create necessary directories
echo 📁 Creating data directories...
if not exist data\neuro_memories mkdir data\neuro_memories
if not exist data\exports mkdir data\exports

REM Copy .env if not exists
if not exist .env (
    echo ⚙️  Creating .env from example...
    if exist .env.example (
        copy .env.example .env
    ) else (
        echo ⚠️  .env.example not found, create .env manually
    )
)

cd ..

REM Install Node dependencies if needed
echo 📦 Installing Node dependencies...
if not exist node_modules (
    call bun install || call npm install
)

echo.
echo ✅ Setup Complete!
echo.
echo Next steps:
echo 1. Start FastAPI server:  cd python ^&^& python fastapi_server.py
echo 2. In another terminal:   bun run dev
echo 3. Test Neuro API:        curl http://localhost:3000/api/neuro/health
echo.
echo 📖 See docs/NEURO_INTEGRATION.md for full documentation
