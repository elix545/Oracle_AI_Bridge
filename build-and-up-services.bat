@echo off
echo ========================================
echo Oracle AI Bridge - Build and Up Services
echo ========================================
echo.

echo Building all services...
docker-compose build --no-cache

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed! Check the errors above.
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo.

echo Starting all services...
docker-compose up -d

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Services failed to start! Check the errors above.
    pause
    exit /b 1
)

echo.
echo Waiting for services to start...
timeout /t 15 /nobreak

echo.
echo Checking container status...
docker-compose ps

echo.
echo ========================================
echo Services Status Summary:
echo ========================================
echo.

echo Checking each service individually:
echo.

echo 1. Oracle XE Database:
docker-compose ps oracle-xe
echo.

echo 2. Ollama AI Service:
docker-compose ps ollama
echo.

echo 3. Node.js Backend:
docker-compose ps node-service
echo.

echo 4. React Frontend:
docker-compose ps react-frontend
echo.

echo ========================================
echo Service URLs:
echo ========================================
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:3001
echo - Oracle Database: localhost:1621
echo - Ollama API: http://localhost:11435
echo.

echo ========================================
echo Useful Commands:
echo ========================================
echo - View all logs: docker-compose logs -f
echo - View specific service logs:
echo   - Frontend: docker-compose logs -f react-frontend
echo   - Backend: docker-compose logs -f node-service
echo   - Oracle: docker-compose logs -f oracle-xe
echo   - Ollama: docker-compose logs -f ollama
echo.
echo - Stop all services: docker-compose down
echo - Restart specific service: docker-compose restart [service-name]
echo.

echo ========================================
echo Build and Up completed!
echo ========================================
echo.
pause
