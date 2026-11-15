@echo off
title Desktop-Overlay Dock
cd /d "%~dp0"
echo ========================================================
echo   Launching Desktop-Overlay Native Windows Dock...
echo ========================================================
echo.
if not exist "dist\index.html" (
    echo Building UI assets...
    call npm run build
)
echo Starting native desktop dock...
start "" npx electron electron/main.cjs
echo.
echo [OK] Desktop-Overlay is now docked to the side of your desktop!
echo      - Press Ctrl+Shift+D from anywhere to toggle visibility.
echo      - Right-click the tray icon to switch dock side (Left/Right).
echo.
timeout /t 3 >nul
