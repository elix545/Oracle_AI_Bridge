@echo off
echo ========================================
echo Oracle AI Bridge - Rebuild and Up Services
echo ========================================
echo.

echo [1/6] Stopping all running containers...
docker-compose stop
if %errorlevel% neq 0 (
    echo Warning: Some containers may not have been stopped properly
)

echo.
echo [2/6] Removing all containers and networks...
docker-compose down --remove-orphans
if %errorlevel% neq 0 (
    echo Warning: Some containers or networks may not have been removed properly
)

echo.
echo [3/6] Removing all images to force rebuild...
docker-compose down --rmi all --volumes --remove-orphans
if %errorlevel% neq 0 (
    echo Warning: Some images or volumes may not have been removed properly
)

echo.
echo [4/6] Building all services...
docker-compose build --no-cache
if %errorlevel% neq 0 (
    echo Error: Build failed! Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo [5/6] Starting Oracle database (waiting for it to be ready)...
docker-compose up -d oracle-xe
if %errorlevel% neq 0 (
    echo Error: Failed to start Oracle database!
    pause
    exit /b 1
)

echo Waiting for Oracle database to be ready...
timeout /t 30 /nobreak >nul

echo.
echo [6/6] Starting all services...
docker-compose up -d
if %errorlevel% neq 0 (
    echo Error: Failed to start services!
    pause
    exit /b 1
)

echo.
echo ========================================
echo All services have been rebuilt and started!
echo ========================================
echo.
echo Services status:
docker-compose ps
echo.
echo Logs for all services:
docker-compose logs --tail=20
echo.
echo ========================================
echo Rebuild and up completed successfully!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo Ollama:   http://localhost:11435
echo Oracle:   localhost:1621
echo.
pause
