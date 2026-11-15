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
if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" .
) else (
    start "" npx electron .
)
echo.
echo [OK] macOS Desktop Widgets are now active on your desktop!
echo      - Sits directly on your desktop layer (behind open apps and tabs).
echo      - Click-through enabled: clicks outside widgets pass straight to desktop/apps!
echo      - Press Ctrl+Shift+D or click the system tray icon to toggle.
echo      - Freely drag any widget anywhere on your desktop.
echo      - To stop the overlay anytime, run: stop-desktop-overlay.bat
echo.
ping 127.0.0.1 -n 3 >nul
