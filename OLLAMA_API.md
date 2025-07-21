# Documentación de APIs de Ollama

Este documento describe las APIs de Ollama disponibles en el contexto de Oracle AI Bridge, tanto las nativas de Ollama como los endpoints expuestos por el backend Node.js para interactuar con el servicio de IA.

---

## 1. Endpoints nativos de Ollama

Por defecto, Ollama expone su API en el puerto 11434 dentro del contenedor y 11435 en el host (según configuración docker-compose).

### 1.1. `/api/generate`
- **Método:** POST
- **Descripción:** Genera una respuesta de IA a partir de un prompt usando el modelo especificado.
- **URL:** `http://localhost:11435/api/generate`
- **Body:**
  ```json
  {
    "model": "llama3:8b",
    "prompt": "¿Cuál es la capital de Francia?"
  }
  ```
- **Respuesta:**
  ```json
  {
    "model": "llama3:8b",
    "created_at": "2025-07-20T13:34:09.185Z",
    "response": "París",
    "done": true,
    ...
  }
  ```

### 1.2. `/api/tags`
- **Método:** GET
- **Descripción:** Lista los modelos instalados y disponibles en Ollama.
- **URL:** `http://localhost:11435/api/tags`
- **Respuesta:**
  ```json
  {
    "models": ["llama3:8b", "otro-modelo"]
  }
  ```

---

## 2. Endpoints del backend Node.js para Ollama

El backend expone endpoints que actúan como proxy o wrapper para Ollama, facilitando la integración con la base de datos Oracle y el frontend.

### 2.1. `/api/generate`
- **Método:** POST
- **Descripción:** Envía un prompt a Ollama y, opcionalmente, guarda la respuesta en la base de datos si se proporciona un `id`.
- **URL:** `http://localhost:3001/api/generate`
- **Body:**
  ```json
  {
    "prompt": "¿Cuál es la capital de Francia?",
    "model": "llama3:8b", // opcional
    "id": 123 // opcional, si se quiere guardar en la base de datos
  }
  ```
- **Respuesta:**
  ```json
  {
    "model": "llama3:8b",
    "created_at": "2025-07-20T13:34:09.185Z",
    "response": "París",
    "done": true,
    ...
  }
  ```

### 2.2. `/api/tags`
- **Método:** GET
- **Descripción:** Devuelve los modelos instalados en Ollama (proxy del endpoint nativo).
- **URL:** `http://localhost:3001/api/tags`
- **Respuesta:**
  ```json
  {
    "models": ["llama3:8b", "otro-modelo"]
  }
  ```

---

## 3. Ejemplos de uso con curl

### Generar respuesta con Ollama directamente
```bash
curl -X POST http://localhost:11435/api/generate \
  -H "Content-Type: application/json" \
  -d '{ "model": "llama3:8b", "prompt": "¿Cuál es la capital de Francia?" }'
```

### Generar respuesta y guardar en Oracle vía backend
```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{ "prompt": "¿Cuál es la capital de Francia?", "model": "llama3:8b", "id": 123 }'
```

### Listar modelos disponibles
```bash
curl http://localhost:3001/api/tags
```

---

## 4. Notas
- El backend maneja automáticamente timeouts y errores de conexión con Ollama.
- Si se proporciona un `id` en `/api/generate`, la respuesta se guarda en la base de datos Oracle en la columna `PROMPT_RESPONSE` (tipo CLOB).
- El frontend consume estos endpoints para mostrar la cola de prompts y respuestas.

---

## 5. Referencias
- [Documentación oficial de Ollama](https://github.com/jmorganca/ollama/blob/main/docs/api.md)
- [Documentación del proyecto Oracle AI Bridge](./README.md) 