@echo off
echo ========================================
echo DEBUGGING BACKEND ISSUES
echo ========================================

echo.
echo 1. Checking if Docker is running...
docker --version
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or not installed
    pause
    exit /b 1
)

echo.
echo 2. Checking container status...
docker-compose ps

echo.
echo 3. Checking if node-service container exists...
docker ps -a | findstr node-service

echo.
echo 4. Checking node-service logs...
docker logs node-service

echo.
echo 5. Checking if port 3001 is in use...
netstat -an | findstr :3001

echo.
echo 6. Checking Docker networks...
docker network ls

echo.
echo 7. Checking if containers can communicate...
docker exec node-service ping oracle-xe
docker exec node-service ping ollama

echo.
echo ========================================
echo DEBUG COMPLETE
echo ========================================
pause 