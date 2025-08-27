@echo off
echo ========================================
echo Oracle AI Bridge - Rebuild Services
echo ========================================
echo.

echo [1/3] Building all services...
docker-compose build --no-cache
if %errorlevel% neq 0 (
    echo Error: Build failed! Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo [2/3] Restarting services with new builds...
docker-compose up -d --force-recreate
if %errorlevel% neq 0 (
    echo Error: Failed to restart services!
    pause
    exit /b 1
)

echo.
echo [3/3] Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo Services have been rebuilt and restarted!
echo ========================================
echo.
echo Services status:
docker-compose ps
echo.
echo ========================================
echo Rebuild completed successfully!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo Ollama:   http://localhost:11435
echo Oracle:   localhost:1621
echo.
pause
