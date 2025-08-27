@echo off
echo ========================================
echo Oracle AI Bridge - Ollama API Test Script
echo ========================================
echo.

echo [1/8] Testing Ollama service availability...
echo Testing if Ollama service is responding...
curl -s -w "HTTP Status: %%{http_code}\n" http://localhost:11434/api/tags
echo.

echo [2/8] Testing model listing endpoint...
echo GET /api/tags
echo Available models:
curl -s http://localhost:11434/api/tags | jq '.models[].name' 2>nul || curl -s http://localhost:11434/api/tags
echo.

echo [3/8] Testing specific model information...
echo GET /api/show for llama3:8b
curl -s -X POST http://localhost:11434/api/show ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"llama3:8b\"}" | jq '.model' 2>nul || curl -s -X POST http://localhost:11434/api/show -H "Content-Type: application/json" -d "{\"name\":\"llama3:8b\"}"
echo.

echo [4/8] Testing basic text generation...
echo POST /api/generate
echo Generating simple response...
curl -s -X POST http://localhost:11434/api/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"llama3:8b\",\"prompt\":\"Hello, how are you?\",\"stream\":false}" | jq '.response' 2>nul || curl -s -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d "{\"model\":\"llama3:8b\",\"prompt\":\"Hello, how are you?\",\"stream\":false}"
echo.

echo [5/8] Testing streaming generation...
echo POST /api/generate with streaming
echo Testing streaming response...
curl -s -X POST http://localhost:11434/api/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"llama3:8b\",\"prompt\":\"Write a short poem about AI\",\"stream\":true}" | head -5
echo.

echo [6/8] Testing chat completion...
echo POST /api/chat
echo Testing chat completion...
curl -s -X POST http://localhost:11434/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"llama3:8b\",\"messages\":[{\"role\":\"user\",\"content\":\"What is artificial intelligence?\"}]}" | jq '.message.content' 2>nul || curl -s -X POST http://localhost:11434/api/chat -H "Content-Type: application/json" -d "{\"model\":\"llama3:8b\",\"messages\":[{\"role\":\"user\",\"content\":\"What is artificial intelligence?\"}]}"
echo.

echo [7/8] Testing model download status...
echo GET /api/tags for download status
curl -s http://localhost:11434/api/tags | jq '.models[] | select(.name == "llama3:8b") | {name: .name, size: .size, modified_at: .modified_at}' 2>nul || echo "Testing model status..."
echo.

echo [8/8] Testing integration with Node service...
echo Testing Ollama through Node service...
curl -s http://localhost:3001/api/tags | jq '.models | length' 2>nul || curl -s http://localhost:3001/api/tags
echo.

echo ========================================
echo Ollama API Test Complete!
echo ========================================
echo.
echo Summary:
echo - Service availability: Checked
echo - Model listing: Checked  
echo - Model information: Checked
echo - Text generation: Checked
echo - Streaming: Checked
echo - Chat completion: Checked
echo - Model status: Checked
echo - Node integration: Checked
echo.
pause
