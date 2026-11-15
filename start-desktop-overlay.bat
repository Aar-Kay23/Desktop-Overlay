@echo off
cd /d "%~dp0"

:: 1. Ensure UI production assets are built
if not exist "dist\index.html" (
    echo Building UI production assets for Desktop-Overlay...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Build failed! Check errors above.
        pause
        exit /b 1
    )
)

:: 2. Launch Electron detached in the background
if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" .
) else (
    start "" npx electron .
)

:: 3. Immediately exit this terminal window so no console window remains
exit
