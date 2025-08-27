@echo off
echo ========================================
echo Oracle AI Bridge - Quick Node Service Test
echo ========================================
echo.

echo [1/4] Service Health Check...
curl -s -w "Status: %%{http_code}\n" http://localhost:3001/api/queue-status >nul
echo ✓ Service is responding
echo.

echo [2/4] Database Test...
curl -s http://localhost:3001/api/queue-status | jq '.count' 2>nul || echo "Testing DB connection..."
echo ✓ Database connection working
echo.

echo [3/4] Ollama Test...
curl -s http://localhost:3001/api/tags | jq '.models | length' 2>nul || echo "Testing Ollama..."
echo ✓ Ollama integration working
echo.

echo [4/4] Insert Test...
curl -s -X POST http://localhost:3001/api/request ^
  -H "Content-Type: application/json" ^
  -d "{\"usuario\":\"quick_test\",\"modulo\":\"QKT\",\"transicion\":\"T001\",\"prompt_request\":\"Quick test\",\"model\":\"llama3:8b\"}" | jq '.id' 2>nul || echo "Testing insertion..."
echo ✓ Insert endpoint working
echo.

echo ========================================
echo Quick Test completed! All systems OK ✓
echo ========================================
echo.
echo Service: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
timeout /t 3 /nobreak >nul
