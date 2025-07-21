# Oracle AI Bridge

Oracle AI Bridge es una solución de integración entre Oracle Forms y modelos de IA (Ollama/llama3:8b) usando una arquitectura basada en contenedores Docker. Permite enviar y recibir prompts entre una base de datos Oracle y un modelo de lenguaje, con una interfaz web para pruebas y monitoreo.

---

## Badges

![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker)
![Node.js](https://img.shields.io/badge/node-%3E%3D20.x-brightgreen?logo=node.js)
![React](https://img.shields.io/badge/react-18.x-blue?logo=react)
![Oracle](https://img.shields.io/badge/oracle-xe--11g-red?logo=oracle)
![MIT License](https://img.shields.io/badge/license-MIT-green)

---

## Arquitectura

- **Oracle XE 11g**: Base de datos para la cola de prompts y respuestas.
- **Ollama (llama3:8b, CPU)**: Servicio de modelo de lenguaje.
- **Node.js (TypeScript)**: Servicio backend que conecta Oracle y Ollama, expone API REST.
- **React + Vite**: Frontend para enviar prompts y visualizar la cola.

## Estructura de Carpetas

```
.
├── docker-compose.yml
├── oracle/
│   └── scripts/
│       └── init.sql
├── ollama/
│   └── Dockerfile
├── node-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── react-frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       └── main.tsx
```

## Requisitos
- Docker y Docker Compose
- (Opcional) Node.js y npm para desarrollo local

## Uso rápido

1. **Levanta todos los servicios:**
   ```sh
   docker compose up --build -d
   ```

2. **Accede al frontend:**
   - [http://localhost:5173](http://localhost:5173)

3. **Prueba la funcionalidad:**
   - Envía un prompt a la base de datos (sección "New Request using DB").
   - Envía un prompt directo a Ollama (sección "New Request using Ollama service").
   - Visualiza la cola de prompts y respuestas.

---

## Configuración de Oracle

### Usuario Middleware
El sistema utiliza un usuario Oracle dedicado llamado `middleware` con las siguientes características:

- **Usuario**: `middleware`
- **Contraseña**: `oracle`
- **Privilegios**: CONNECT, RESOURCE, CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE PROCEDURE, UNLIMITED TABLESPACE

### Objetos de Base de Datos
Todos los objetos se crean en el esquema `middleware`:

- **Tabla**: `middleware.PROMPT_QUEUE`
- **Secuencia**: `middleware.PROMPT_QUEUE_SEQ`
- **Funciones**: `middleware.INSERT_PROMPT_REQUEST`, `middleware.READ_PROMPT_REQUEST`
- **Job de limpieza**: `PROMPT_QUEUE_CLEANUP` (elimina registros de más de 30 días)

### Conexión Oracle
El sistema utiliza el modo **Thick** de node-oracledb para compatibilidad con Oracle 11g, incluyendo Oracle Instant Client en el contenedor.

---

## Probar Ollama directamente (curl)

### Listar modelos disponibles
```bash
curl http://localhost:11435/api/tags
```

### Generar respuesta con el modelo llama3:8b
```bash
curl -X POST http://localhost:11435/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3:8b",
    "prompt": "¿Cuál es la capital de Francia?"
  }'
```

---

## Ejemplo de uso de la API

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

### Listar los modelos existente en ollama desde el servicio Node.js: `/api/tags`

- **Propósito:** Obtener el listado de modelos instalados y disponibles en el servicio Ollama.
- **Método:** GET
- **Respuesta:**
  ```json
  {
    "models": ["llama3:8b", "otro-modelo", ...]
  }
  ```
- **Ejemplo de uso:**
  ```bash
  curl http://localhost:3001/api/tags
  ```
- **Uso en frontend:** El portal React permite consultar y visualizar los modelos disponibles usando este endpoint.

### Enviar un prompt directo a Ollama desde el servicio Node.js: `/api/generate`

```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{ "prompt": "Resume la historia de Roma" }'
```

- Puedes especificar el modelo opcionalmente:

```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{ "prompt": "Resume la historia de Roma", "model": "llama3:8b" }'
```

---

## Desarrollo local

1. Instala dependencias en cada servicio:
   ```sh
   cd node-service && npm install
   cd ../react-frontend && npm install
   ```
2. Levanta Oracle y Ollama con Docker Compose:
   ```sh
   docker compose up oracle-xe ollama
   ```
3. Inicia el backend Node.js en modo desarrollo:
   ```sh
   cd node-service
   npm run build && npm run start
   # O con nodemon para hot reload (instala nodemon si lo deseas)
   # npx nodemon src/index.ts
   ```
4. Inicia el frontend React en modo desarrollo:
   ```sh
   cd react-frontend
   npm run dev
   ```
5. Accede a [http://localhost:5173](http://localhost:5173)

---

## Detalles de los servicios

### Oracle XE 11g
- Imagen: `wnameless/oracle-xe-11g-r2`
- Usuario: `middleware` / Contraseña: `oracle` / SID: `xe`
- El script `init.sql` crea el usuario middleware, tabla, secuencia, funciones y job de limpieza mensual.
- Modo de conexión: Thick mode con Oracle Instant Client

### Node.js Service
- Conecta a Oracle y Ollama.
- Expone endpoints REST para insertar y leer requests.
- Lee variables de entorno desde `.env` o el sistema.
- Configurado para usar el usuario `middleware` de Oracle.

### Ollama
- Modelo: llama3:8b (CPU, 8GB RAM mínimo, 4 núcleos)
- Puerto host: 11435
- Puerto contenedor: 11434
- El modelo llama3:8b se descarga automáticamente al iniciar el contenedor, no es necesario hacerlo manualmente.

### React + Vite
- Interfaz web para pruebas y monitoreo.
- Puerto: 5173

## Licencia
Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

## Configuración de variables de entorno

Cada servicio utiliza su propio archivo `.env` localizado en su carpeta correspondiente:

- `node-service/.env` (o `.env.example` como plantilla)
- `react-frontend/.env` (si es necesario para configuración del frontend)

El archivo `docker-compose.yml` está configurado para usar la opción `env_file` y así cargar automáticamente el archivo `.env` de cada servicio:

```yaml
  node-service:
    # ...
    env_file:
      - ./node-service/.env
  react-frontend:
    # ...
    env_file:
      - ./react-frontend/.env
```

No es necesario un archivo `.env` global en la raíz del proyecto, a menos que quieras definir variables globales para todos los servicios.

### Ejemplo de uso para node-service

Copia el archivo de ejemplo y edítalo según tus necesidades:

```sh
cp node-service/.env.example node-service/.env
```

Contenido sugerido para `node-service/.env.example`:

```env
# Oracle DB
ORACLE_USER=middleware
ORACLE_PASSWORD=oracle
ORACLE_CONNECT_STRING=oracle-xe:1521/XE

# Ollama
OLLAMA_URL=http://ollama:11434
OLLAMA_DEFAULT_MODEL=llama3:8b

# Service Configuration
PORT=3001
TIMEOUT_NODE_SERVICE=300000
```

## Solución de problemas

### Error NJS-138: Oracle Thin mode no compatible
Si encuentras el error `NJS-138: connections to this database server version are not supported by node-oracledb in Thin mode`, el sistema ya está configurado para usar el modo Thick con Oracle Instant Client.

### Verificar conexión Oracle
Para verificar que la conexión Oracle funciona correctamente:

```bash
# Verificar que el endpoint responde sin errores
curl http://localhost:3001/api/requests

# Insertar un registro de prueba
curl -X POST http://localhost:3001/api/request \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "test",
    "modulo": "TEST",
    "transicion": "TEST",
    "prompt_request": "Test prompt",
    "model": "llama3:8b"
  }'
```

### Logs de los servicios
```bash
# Ver logs de Oracle
docker-compose logs oracle-xe

# Ver logs del node-service
docker-compose logs node-service

# Ver logs de Ollama
docker-compose logs ollama
```

### Notas sobre CLOB

La columna PROMPT_RESPONSE es ahora de tipo CLOB para soportar respuestas largas de IA. El backend Node.js está configurado para leer y escribir CLOBs automáticamente usando la opción fetchAsString de node-oracledb.

## Uso de Docker Compose: build, up y down de contenedores específicos

Docker Compose permite gestionar los servicios de forma individual o conjunta. Aquí tienes ejemplos prácticos para cada contenedor:

### Build de un contenedor específico

```sh
# Build solo del backend Node.js
docker compose build node-service

# Build solo del frontend React
docker compose build react-frontend

# Build solo de Ollama
docker compose build ollama

# Build solo de Oracle XE
docker compose build oracle-xe
```

### Levantar (up) un contenedor específico

```sh
# Levantar solo Oracle XE
docker compose up -d oracle-xe

# Levantar solo Ollama
docker compose up -d ollama

# Levantar solo el backend Node.js
docker compose up -d node-service

# Levantar solo el frontend React
docker compose up -d react-frontend
```

### Detener (down) un contenedor específico

```sh
# Detener solo Oracle XE
docker compose stop oracle-xe

# Detener solo Ollama
docker compose stop ollama

# Detener solo el backend Node.js
docker compose stop node-service

# Detener solo el frontend React
docker compose stop react-frontend
```

### Eliminar (down) todos los servicios y recursos

```sh
# Detener y eliminar todos los contenedores, redes y volúmenes definidos en docker-compose.yml
docker compose down
```

> **Nota:** Puedes combinar los comandos para build, up y down según tus necesidades de desarrollo o despliegue.

