@echo off
title Desktop-Overlay (macOS Desktop Widgets for Windows)
cd /d "%~dp0"
echo ========================================================
echo   Launching Desktop-Overlay (macOS Desktop Widgets)...
echo ========================================================
echo.
if not exist "dist\index.html" (
    echo Building UI production assets...
    call npm run build
)
echo Starting native desktop widgets layer...
start "" node electron/main.cjs
echo.
echo [OK] macOS Desktop Widgets are now active on your desktop!
echo      - Sits directly on your desktop layer (behind open apps and tabs).
echo      - Press Ctrl+Shift+D or click the system tray icon to toggle.
echo      - Real hardware telemetry (Intel CPU, Iris Xe GPU, RAM, Disks, Battery).
echo.
timeout /t 3 >nul
