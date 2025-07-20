@echo off
echo Stopping all containers...
docker-compose down

echo Building and starting all services...
docker-compose up --build -d

echo Waiting for services to start...
timeout /t 10 /nobreak

echo Checking container status...
docker-compose ps

echo.
echo Services should now be running:
echo - Frontend: http://localhost:5173
echo - Backend: http://localhost:3001
echo - Oracle: localhost:1621
echo - Ollama: http://localhost:11435
echo.
echo To view logs:
echo - Frontend: docker logs react-frontend
echo - Backend: docker logs node-service
echo - Oracle: docker logs oracle-xe
echo - Ollama: docker logs ollama 