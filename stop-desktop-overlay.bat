@echo off
cd /d "%~dp0"

:: 1. Terminate any running Electron, Node, or PowerShell daemon processes for Desktop-Overlay
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process | Where-Object { (($_.Name -like '*electron*' -or $_.Name -like '*node*') -and ($_.CommandLine -like '*Desktop-Overlay*' -or $_.ExecutablePath -like '*Desktop-Overlay*')) -or ($_.Name -like '*powershell*' -and $_.CommandLine -like '*media-daemon.ps1*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 2. Release local Vite dev port 5173 if lingering
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: 3. Immediately exit this terminal window so no console window remains
exit
