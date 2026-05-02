@echo off
title Bible Rental App - Fix & Start
color 0A
echo.
echo ============================================
echo   Bible Rental App - Fix Port ^& Start
echo ============================================
echo.

REM ── Step 1: Kill whatever is on port 5001 ──
echo [1/3] Checking port 5001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5001" ^| findstr "LISTENING"') do (
    echo       Found PID %%a on port 5001. Killing it...
    taskkill /F /PID %%a >nul 2>&1
    echo       Done.
)
echo       Port 5001 is now free.
echo.

REM ── Step 2: Start backend ──
echo [2/3] Starting backend server...
start "Backend Server" cmd /k "cd /d E:\Bible-Rental-App\backend && npm run dev"
echo       Backend started in new window.
echo.

REM ── Step 3: Clear Expo cache and start frontend ──
echo [3/3] Starting Expo with cleared cache...
timeout /t 3 /nobreak >nul
start "Expo Frontend" cmd /k "cd /d E:\Bible-Rental-App\frontend && npx expo start --clear"
echo       Expo started in new window.
echo.

echo ============================================
echo   All done! Check the two new windows.
echo ============================================
echo.
pause
