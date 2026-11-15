@echo off
cd /d "%~dp0"

:: 1. Fast Pre-Flight Check: Is Desktop-Overlay already running?
:: Exits immediately in milliseconds to prevent redundant process startup or performance spikes.
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name = 'electron.exe'\" | Where-Object CommandLine -like '*Desktop-Overlay*' | ForEach-Object { exit 10 }" >nul 2>&1
if errorlevel 10 (
    exit /b 0
)

:: 2. Ensure UI production assets are built
if not exist "dist\index.html" (
    echo Building UI production assets for Desktop-Overlay...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Build failed! Check errors above.
        pause
        exit /b 1
    )
)

:: 3. Launch Electron detached in the background
if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" .
) else (
    start "" npx electron .
)

:: 4. Immediately exit this terminal window so no console window remains
exit
