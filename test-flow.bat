@echo off
echo ========================================
echo Oracle AI Bridge - Test Flow Script
echo ========================================
echo.

echo [1/5] Testing database connection...
echo Testing /api/queue-status endpoint...
curl -s http://localhost:3001/api/queue-status
echo.
echo.

echo [2/5] Testing database insertion...
echo Inserting test request...
curl -s -X POST http://localhost:3001/api/request ^
  -H "Content-Type: application/json" ^
  -d "{\"usuario\":\"test_user\",\"modulo\":\"TEST\",\"transicion\":\"T001\",\"prompt_request\":\"Este es un prompt de prueba para verificar el flujo completo\",\"model\":\"llama3:8b\"}"
echo.
echo.

echo [3/5] Waiting 3 seconds for processing...
timeout /t 3 /nobreak >nul

echo [4/5] Checking queue status...
curl -s http://localhost:3001/api/requests?limit=5
echo.
echo.

echo [5/5] Testing Ollama connection...
echo Testing /api/tags endpoint...
curl -s http://localhost:3001/api/tags
echo.
echo.

echo ========================================
echo Test Flow completed!
echo ========================================
echo.
echo Check the responses above to identify any issues:
echo - Database connection should return: {"hasData":true/false,"count":number}
echo - Database insertion should return: {"id":number}
echo - Queue should show the inserted item
echo - Ollama models should return available models
echo.
pause
