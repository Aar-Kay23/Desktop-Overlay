@echo off
setlocal enabledelayedexpansion
title Stop Desktop-Overlay
cd /d "%~dp0"

echo ========================================================
echo        Stopping Desktop-Overlay (Desktop Widgets)...
echo ========================================================
echo.

echo [1/3] Terminating Desktop-Overlay Electron instances...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'electron.exe' -or $_.Name -eq 'node.exe') -and ($_.CommandLine -like '*Desktop-Overlay*' -or $_.ExecutablePath -like '*Desktop-Overlay*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [2/3] Checking for any lingering overlay instances...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-Process -Name electron -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*Desktop-Overlay*' } | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>&1

echo [3/3] Checking and releasing local Vite port 5173...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ========================================================
echo   [OK] Desktop-Overlay has been completely stopped!
echo ========================================================
ping 127.0.0.1 -n 3 >nul
