@echo off
echo ======================================
echo   Khoi dong Backend + Frontend
echo ======================================
echo.

start "BACKEND" cmd /k "cd /d %~dp0backend && ./mvnw spring-boot:run"

timeout /t 10 /nobreak >nul

start "FRONTEND" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Backend dang khoi dong o port 8080
echo Frontend dang khoi dong o port 5173
echo.
echo Dong cua so nay di - processes se chay nen
pause
