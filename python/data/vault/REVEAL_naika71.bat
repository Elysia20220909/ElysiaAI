@echo off
chcp 65001 > nul
title AETHER Materializer - naika71
echo 🌸 ElysiaAI - Project AETHER
echo -----------------------------------
echo [SYSTEM] Target identified: naika71.mp4
echo [SYSTEM] Phantom ID: 4cfb1e34
echo [SYSTEM] Initializing materialization from Abyss...
echo.

cd /d "c:\Users\hosih\GitHub\ElysiaAI"
python -c "from python.lib.phantom_vault import phantom_vault; phantom_vault.reveal_video('4cfb1e34')"

echo.
echo -----------------------------------
echo [SYSTEM] Materialization complete.
echo [SYSTEM] Check the vault folder for 'revealed_naika71.mp4'.
pause
