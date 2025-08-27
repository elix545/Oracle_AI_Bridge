#!/bin/sh
ollama serve &
sleep 5
ollama pull llama3:8b
ollama pull llama3.1:8b
ollama pull llama3.2:1b
ollama pull llama3.2:8b
ollama pull gemma3:270m
ollama pull gemma3:1b
ollama pull gemma3:4b
ollama pull gemma3n:e2b
ollama pull gemma3n:e4b
ollama pull mistral:7b
ollama pull deepseek-r1:1.5b
ollama pull deepseek-r1:7b
ollama pull qwen3:0.6b
ollama pull qwen3:1.7b
wait 