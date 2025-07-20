@echo off
echo ========================================
echo RESTARTING BACKEND SERVICE
echo ========================================

echo.
echo 1. Stopping node-service...
docker-compose stop node-service

echo.
echo 2. Removing node-service container...
docker-compose rm -f node-service

echo.
echo 3. Building and starting node-service...
docker-compose up --build -d node-service

echo.
echo 4. Waiting for node-service to start...
timeout /t 5 /nobreak

echo.
echo 5. Checking node-service logs...
docker logs node-service

echo.
echo 6. Testing if backend is responding...
curl -s http://localhost:3001/api/requests || echo "Backend not responding"

echo.
echo ========================================
echo BACKEND RESTART COMPLETE
echo ========================================
pause 