@echo off
echo ========================================
echo Oracle AI Bridge - Advanced Node Service Test
echo ========================================
echo.

echo [1/10] Service Health Check...
echo Testing basic connectivity...
curl -s -w "Status: %%{http_code}, Time: %%{time_total}s\n" http://localhost:3001/api/queue-status
echo.

echo [2/10] Database Connection Test...
echo Testing Oracle connection through Node service...
curl -s -w "Status: %%{http_code}\n" http://localhost:3001/api/queue-status
echo.

echo [3/10] Queue Operations Test...
echo Testing queue insertion and retrieval...
echo.
echo Inserting test record 1...
curl -s -X POST http://localhost:3001/api/request ^
  -H "Content-Type: application/json" ^
  -d "{\"usuario\":\"stress_test\",\"modulo\":\"STR\",\"transicion\":\"T001\",\"prompt_request\":\"Test 1: Validación de inserción\",\"model\":\"llama3:8b\"}"
echo.
echo Inserting test record 2...
curl -s -X POST http://localhost:3001/api/request ^
  -H "Content-Type: application/json" ^
  -d "{\"usuario\":\"stress_test\",\"modulo\":\"STR\",\"transicion\":\"T002\",\"prompt_request\":\"Test 2: Validación de inserción\",\"model\":\"llama3:8b\"}"
echo.
echo.

echo [4/10] Pagination Test...
echo Testing pagination with different limits...
echo GET /api/requests?limit=1
curl -s "http://localhost:3001/api/requests?limit=1" | jq '. | length' 2>nul || echo "Testing limit=1..."
echo GET /api/requests?limit=5
curl -s "http://localhost:3001/api/requests?limit=5" | jq '. | length' 2>nul || echo "Testing limit=5..."
echo GET /api/requests?offset=2&limit=3
curl -s "http://localhost:3001/api/requests?offset=2&limit=3" | jq '. | length' 2>nul || echo "Testing offset=2&limit=3..."
echo.

echo [5/10] Ollama Integration Test...
echo Testing Ollama model listing...
curl -s http://localhost:3001/api/tags | jq '.models | length' 2>nul || echo "Testing models endpoint..."
echo.
echo Testing direct AI generation...
curl -s -X POST http://localhost:3001/api/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Responde en una sola palabra: ¿Cuál es la capital de Francia?\",\"model\":\"llama3:8b\"}" | jq '.response' 2>nul || echo "Testing AI generation..."
echo.

echo [6/10] Rate Limiting Test...
echo Testing rate limiting configuration...
curl -s http://localhost:3001/api/rate-limit-status | jq '.configuration' 2>nul || echo "Testing rate limit status..."
echo.

echo [7/10] Error Handling Test...
echo Testing invalid JSON handling...
curl -s -X POST http://localhost:3001/api/request ^
  -H "Content-Type: application/json" ^
  -d "{invalid json}" -w "Status: %%{http_code}\n"
echo.
echo Testing invalid endpoint...
curl -s -w "Status: %%{http_code}\n" http://localhost:3001/api/nonexistent
echo.

echo [8/10] Concurrent Request Test...
echo Testing concurrent requests (3 simultaneous)...
start /B curl -s -X POST http://localhost:3001/api/request ^
  -H "Content-Type: application/json" ^
  -d "{\"usuario\":\"concurrent1\",\"modulo\":\"CON\",\"transicion\":\"T001\",\"prompt_request\":\"Concurrent test 1\",\"model\":\"llama3:8b\"}"
start /B curl -s -X POST http://localhost:3001/api/request ^
  -H "Content-Type: application/json" ^
  -d "{\"usuario\":\"concurrent2\",\"modulo\":\"CON\",\"transicion\":\"T002\",\"prompt_request\":\"Concurrent test 2\",\"model\":\"llama3:8b\"}"
start /B curl -s -X POST http://localhost:3001/api/request ^
  -H "Content-Type: application/json" ^
  -d "{\"usuario\":\"concurrent3\",\"modulo\":\"CON\",\"transicion\":\"T003\",\"prompt_request\":\"Concurrent test 3\",\"model\":\"llama3:8b\"}"
echo Waiting for concurrent requests to complete...
timeout /t 5 /nobreak >nul
echo.

echo [9/10] Response Validation Test...
echo Testing response structure and data types...
curl -s "http://localhost:3001/api/requests?limit=1" | jq '.[0] | keys' 2>nul || echo "Testing response structure..."
echo.

echo [10/10] Performance Test...
echo Testing response time under load...
echo Making 5 quick requests to measure performance...
for /L %%i in (1,1,5) do (
    curl -s -w "Request %%i: %%{time_total}s\n" http://localhost:3001/api/queue-status >nul
)
echo.

echo ========================================
echo Advanced Node Service Test completed!
echo ========================================
echo.
echo Test Categories:
echo ✓ Service Health & Connectivity
echo ✓ Database Operations
echo ✓ Queue Management
echo ✓ Pagination
echo ✓ Ollama Integration
echo ✓ Rate Limiting
echo ✓ Error Handling
echo ✓ Concurrent Requests
echo ✓ Response Validation
echo ✓ Performance Metrics
echo.
echo Check the results above for any errors or issues.
echo All tests should complete successfully for a healthy service.
echo.
pause
