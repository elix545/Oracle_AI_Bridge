@echo off
echo ========================================
echo Oracle AI Bridge - Node Service Test Script
echo ========================================
echo.

echo [1/8] Testing service availability...
echo Testing if Node service is responding...
curl -s -w "HTTP Status: %%{http_code}\n" http://localhost:3001/api/queue-status
echo.

echo [2/8] Testing database connection and queue status...
echo GET /api/queue-status
curl -s http://localhost:3001/api/queue-status | jq . 2>nul || curl -s http://localhost:3001/api/queue-status
echo.
echo.

echo [3/8] Testing database insertion endpoint...
echo POST /api/request
echo Inserting test request with all fields...
curl -s -X POST http://localhost:3001/api/request ^
  -H "Content-Type: application/json" ^
  -d "{\"usuario\":\"test_service\",\"modulo\":\"SVC\",\"transicion\":\"T001\",\"prompt_request\":\"Este es un prompt de prueba del servicio Node.js\",\"model\":\"llama3:8b"}" | jq . 2>nul || curl -s -X POST http://localhost:3001/api/request ^
  -H "Content-Type: application/json" ^
  -d "{\"usuario\":\"test_service\",\"modulo\":\"SVC\",\"transicion\":\"T001\",\"prompt_request\":\"Este es un prompt de prueba del servicio Node.js\",\"model\":\"llama3:8b"}"
echo.
echo.

echo [4/8] Testing queue retrieval endpoint...
echo GET /api/requests?limit=3
curl -s "http://localhost:3001/api/requests?limit=3" | jq . 2>nul || curl -s "http://localhost:3001/api/requests?limit=3"
echo.
echo.

echo [5/8] Testing Ollama models endpoint...
echo GET /api/tags
curl -s http://localhost:3001/api/tags | jq '.models | length' 2>nul || echo "Testing models endpoint..."
curl -s http://localhost:3001/api/tags | jq '.models[0:3]' 2>nul || curl -s http://localhost:3001/api/tags
echo.
echo.

echo [6/8] Testing Ollama generation endpoint...
echo POST /api/generate
echo Testing direct prompt generation...
curl -s -X POST http://localhost:3001/api/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Di hola en español\",\"model\":\"llama3:8b\"}" | jq . 2>nul || curl -s -X POST http://localhost:3001/api/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Di hola en español\",\"model\":\"llama3:8b\"}"
echo.
echo.

echo [7/8] Testing rate limiting status...
echo GET /api/rate-limit-status
curl -s http://localhost:3001/api/rate-limit-status | jq . 2>nul || curl -s http://localhost:3001/api/rate-limit-status
echo.
echo.

echo [8/8] Testing error handling...
echo Testing invalid endpoint...
curl -s -w "HTTP Status: %%{http_code}\n" http://localhost:3001/api/nonexistent
echo.

echo ========================================
echo Node Service Test completed!
echo ========================================
echo.
echo Test Results Summary:
echo - Service availability: Check HTTP status above
echo - Database connection: Should return queue status
echo - Database insertion: Should return ID
echo - Queue retrieval: Should return array of items
echo - Ollama models: Should return available models
echo - Ollama generation: Should return AI response
echo - Rate limiting: Should return current status
echo - Error handling: Should return 404 for invalid endpoints
echo.
echo If all tests pass, the Node service is working correctly!
echo.
pause
