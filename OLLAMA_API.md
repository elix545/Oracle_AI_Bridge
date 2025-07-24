# Documentación de APIs de Ollama y Backend Node.js

Este documento describe de forma extensiva las APIs disponibles en el contexto de Oracle AI Bridge, incluyendo:
- Endpoints nativos de Ollama
- Endpoints expuestos por el backend Node.js (proxy, integración Oracle, logging)

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
- **Notas:**
  - El modelo es obligatorio.
  - El prompt es obligatorio.
  - Puede devolver información adicional según la configuración del modelo.

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

## 2. Endpoints del backend Node.js

El backend expone endpoints que actúan como proxy o wrapper para Ollama, y otros para integración con Oracle y logging desde el frontend.

### 2.1. `/api/request`
- **Método:** POST
- **Descripción:** Inserta un nuevo prompt en la base de datos Oracle (cola de prompts).
- **URL:** `http://localhost:3001/api/request`
- **Body:**
  ```json
  {
    "usuario": "testuser",
    "modulo": "MOD1",
    "transicion": "T1",
    "prompt_request": "¿Cuál es la capital de Francia?",
    "model": "llama3:8b" // opcional
  }
  ```
- **Respuesta:**
  ```json
  {
    "id": 123
  }
  ```
- **Notas:**
  - El campo `model` es opcional. Si no se especifica, se usará el modelo por defecto.
  - El ID devuelto corresponde al registro insertado en la tabla `PROMPT_QUEUE`.

### 2.2. `/api/requests`
- **Método:** GET
- **Descripción:** Devuelve la lista completa de prompts y respuestas almacenados en la base de datos Oracle.
- **URL:** `http://localhost:3001/api/requests`
- **Respuesta:**
  ```json
  [
    {
      "ID": 123,
      "USUARIO": "testuser",
      "MODULO": "MOD1",
      "TRANSICION": "T1",
      "PROMPT_REQUEST": "¿Cuál es la capital de Francia?",
      "PROMPT_RESPONSE": "París",
      "FLAG_LECTURA": 0,
      "FLAG_COMPLETADO": 1,
      "FECHA_REQUEST": "2024-07-20T13:34:09.185Z",
      "FECHA_RESPONSE": "2024-07-20T13:34:10.000Z",
      "FECHA_LECTURA": null,
      "MODEL": "llama3:8b"
    },
    ...
  ]
  ```
- **Notas:**
  - El campo `PROMPT_RESPONSE` puede ser largo (tipo CLOB en Oracle).
  - El campo `MODEL` puede ser nulo si no se especificó al crear el prompt.

### 2.3. `/api/generate`
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
- **Notas:**
  - Si se proporciona un `id`, la respuesta se guarda en la base de datos en el registro correspondiente.
  - Si ya existe una respuesta para ese `id`, se devuelve la respuesta almacenada (cache).
  - Si ocurre un error de conexión o timeout con Ollama, se devuelve un error HTTP 500.

### 2.4. `/api/tags`
- **Método:** GET
- **Descripción:** Devuelve los modelos instalados en Ollama (proxy del endpoint nativo).
- **URL:** `http://localhost:3001/api/tags`
- **Respuesta:**
  ```json
  {
    "models": ["llama3:8b", "otro-modelo"]
  }
  ```
- **Notas:**
  - Si Ollama no responde o hay error, devuelve `{ "models": [] }` y un error HTTP 500.

### 2.5. `/api/log`
- **Método:** POST
- **Descripción:** Permite al frontend enviar logs estructurados al backend para su almacenamiento y monitoreo.
- **URL:** `http://localhost:3001/api/log`
- **Body:**
  ```json
  {
    "level": "info", // info, warn, error, debug
    "message": "Mensaje de log",
    "data": { "detalle": "opcional" },
    "timestamp": "2024-07-20T13:34:09.185Z",
    "userAgent": "Mozilla/5.0 ...",
    "url": "http://localhost:5173/"
  }
  ```
- **Respuesta:**
  ```json
  {
    "received": true
  }
  ```
- **Notas:**
  - El backend registra el log con el nivel y datos recibidos.
  - Útil para auditoría, debugging y monitoreo de errores en el frontend.

---

## 3. Ejemplos de uso con curl

### Insertar un nuevo prompt en la base de datos
```bash
curl -X POST http://localhost:3001/api/request \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "testuser",
    "modulo": "MOD1",
    "transicion": "T1",
    "prompt_request": "¿Cuál es la capital de Francia?",
    "model": "llama3:8b"
  }'
```

### Consultar todos los prompts
```bash
curl http://localhost:3001/api/requests
```

### Generar respuesta y guardar en Oracle vía backend
```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{ "prompt": "¿Cuál es la capital de Francia?", "model": "llama3:8b", "id": 123 }'
```

### Generar respuesta directa con Ollama (sin pasar por backend)
```bash
curl -X POST http://localhost:11435/api/generate \
  -H "Content-Type: application/json" \
  -d '{ "model": "llama3:8b", "prompt": "¿Cuál es la capital de Francia?" }'
```

### Listar modelos disponibles
```bash
curl http://localhost:3001/api/tags
```

### Enviar log desde el frontend
```bash
curl -X POST http://localhost:3001/api/log \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Test log desde frontend",
    "data": { "foo": "bar" },
    "timestamp": "2024-07-20T13:34:09.185Z",
    "userAgent": "Mozilla/5.0 ...",
    "url": "http://localhost:5173/"
  }'
```

---

## 4. Notas
- El backend maneja automáticamente timeouts y errores de conexión con Ollama.
- Si se proporciona un `id` en `/api/generate`, la respuesta se guarda en la base de datos Oracle en la columna `PROMPT_RESPONSE` (tipo CLOB).
- El frontend consume estos endpoints para mostrar la cola de prompts y respuestas.
- El endpoint `/api/log` permite centralizar logs del frontend para auditoría y debugging.

---

## 5. Referencias
- [Documentación oficial de Ollama](https://github.com/jmorganca/ollama/blob/main/docs/api.md)
- [Documentación del proyecto Oracle AI Bridge](./README.md) 