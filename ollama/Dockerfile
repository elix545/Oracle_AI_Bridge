FROM ollama/ollama:latest

# Usar solo CPU (no instalar CUDA ni dependencias GPU)
ENV OLLAMA_MODELS=/models
ENV OLLAMA_MODEL=llama3:8b

# Copy entrypoint script and fix line endings
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 11434

ENTRYPOINT ["/entrypoint.sh"] 