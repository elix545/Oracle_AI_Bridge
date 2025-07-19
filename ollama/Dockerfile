FROM ollama/ollama:latest

# Usar solo CPU (no instalar CUDA ni dependencias GPU)
ENV OLLAMA_MODELS=/models
ENV OLLAMA_MODEL=llama3:8b

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 11434

ENTRYPOINT ["/entrypoint.sh"] 