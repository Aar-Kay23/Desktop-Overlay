@echo off
echo Starting Desktop-Overlay...
start "" npm run dev
timeout /t 2 >nul
start msedge.exe --app=http://localhost:5173 --window-size=420,950
echo Desktop-Overlay launched!

