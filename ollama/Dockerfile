FROM ollama/ollama:latest

# Usar solo CPU (no instalar CUDA ni dependencias GPU)
ENV OLLAMA_MODELS=/models
ENV OLLAMA_MODEL=llama3:8b

# Descargar el modelo al build y dejarlo disponible en el contenedor
RUN ollama pull llama3:8b

EXPOSE 11434

CMD ["serve"] 