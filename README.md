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

1. **Copia y renombra el archivo de entorno:**
   ```sh
   cp node-service/.env.example node-service/.env
   # Edita los valores si es necesario
   ```

2. **Levanta todos los servicios:**
   ```sh
   docker compose up --build
   ```

3. **Accede al frontend:**
   - [http://localhost:5173](http://localhost:5173)

4. **Prueba la funcionalidad:**
   - Envía un prompt a la base de datos (sección "New Request using DB").
   - Envía un prompt directo a Ollama (sección "New Request using Ollama service").
   - Visualiza la cola de prompts y respuestas.

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
    "prompt_request": "¿Cuál es la capital de Francia?"
  }'
```

### Leer un prompt pendiente (con timeout de 10 segundos)
```bash
curl "http://localhost:3001/api/request?timeout=10"
```

### Enviar un prompt directo a Ollama
```bash
curl -X POST http://localhost:3001/api/ollama \
  -H "Content-Type: application/json" \
  -d '{ "prompt": "Resume la historia de Roma" }'
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
- Usuario: `system` / Contraseña: `oracle` / SID: `xe`
- El script `init.sql` crea la tabla, secuencia, funciones y job de limpieza mensual.

### Node.js Service
- Conecta a Oracle y Ollama.
- Expone endpoints REST para insertar y leer requests.
- Lee variables de entorno desde `.env` o el sistema.

### Ollama
- Modelo: llama3:8b (CPU, 4GB RAM mínimo)
- Puerto: 11434

### React + Vite
- Interfaz web para pruebas y monitoreo.
- Puerto: 5173

## Licencia
Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

## Configuración de variables de entorno

El servicio Node.js requiere un archivo `.env` para la conexión a Oracle y Ollama. Un archivo de ejemplo está disponible en `node-service/.env.example`:

```env
# Oracle DB
ORACLE_USER=system
ORACLE_PASSWORD=oracle
ORACLE_CONNECT_STRING=oracle-xe:1521/XE

# Ollama
OLLAMA_URL=http://ollama:11434

# Puerto del servicio
PORT=3001
```

Copia este archivo como `.env` y ajusta los valores si es necesario:
```sh
cp node-service/.env.example node-service/.env
```

## Funciones PL/SQL en Oracle

El sistema utiliza dos funciones principales en la base de datos Oracle para la gestión de la cola de prompts:

### 1. `INSERT_PROMPT_REQUEST`
Inserta un nuevo request en la tabla de la cola.

**Definición:**
```sql
CREATE OR REPLACE FUNCTION INSERT_PROMPT_REQUEST(
  P_USUARIO IN VARCHAR2,
  P_MODULO IN VARCHAR2,
  P_TRANSICION IN VARCHAR2,
  P_PROMPT_REQUEST IN VARCHAR2
) RETURN NUMBER;
```

**Uso desde SQL:**
```sql
DECLARE
  v_id NUMBER;
BEGIN
  v_id := INSERT_PROMPT_REQUEST('usuario1', 'MOD1', 'T1', '¿Cuál es la capital de Francia?');
  DBMS_OUTPUT.PUT_LINE('ID generado: ' || v_id);
END;
```

### 2. `READ_PROMPT_REQUEST`
Lee el siguiente request pendiente de la cola, con timeout y reintentos.

**Definición:**
```sql
CREATE OR REPLACE FUNCTION READ_PROMPT_REQUEST(
  P_TIMEOUT_SECONDS IN NUMBER DEFAULT 10
) RETURN SYS_REFCURSOR;
```

**Uso desde SQL:**
```sql
DECLARE
  cur SYS_REFCURSOR;
  rec PROMPT_QUEUE%ROWTYPE;
BEGIN
  cur := READ_PROMPT_REQUEST(10);
  LOOP
    FETCH cur INTO rec;
    EXIT WHEN cur%NOTFOUND;
    DBMS_OUTPUT.PUT_LINE('ID: ' || rec.ID || ' - Request: ' || rec.PROMPT_REQUEST);
  END LOOP;
  CLOSE cur;
END;
```

---

## Ejemplo de uso desde Oracle Forms 6i y Forms 12c

### Insertar un request desde Forms (PL/SQL Block)
```plsql
DECLARE
  v_id NUMBER;
BEGIN
  v_id := INSERT_PROMPT_REQUEST(:USUARIO, :MODULO, :TRANSICION, :PROMPT_REQUEST);
  :ID_GENERADO := v_id;
END;
```

### Leer un request pendiente desde Forms (PL/SQL Block)
```plsql
DECLARE
  cur SYS_REFCURSOR;
  v_id NUMBER;
  v_usuario VARCHAR2(35);
  v_modulo VARCHAR2(4);
  v_transicion VARCHAR2(4);
  v_prompt_request VARCHAR2(4000);
  v_prompt_response VARCHAR2(4000);
  v_flag_lectura NUMBER;
  v_flag_completado NUMBER;
  v_fecha_request DATE;
  v_fecha_response DATE;
  v_fecha_lectura DATE;
BEGIN
  cur := READ_PROMPT_REQUEST(10);
  LOOP
    FETCH cur INTO v_id, v_usuario, v_modulo, v_transicion, v_prompt_request, v_prompt_response, v_flag_lectura, v_flag_completado, v_fecha_request, v_fecha_response, v_fecha_lectura;
    EXIT WHEN cur%NOTFOUND;
    -- Asignar a items de Forms o procesar
    :ID := v_id;
    :USUARIO := v_usuario;
    :MODULO := v_modulo;
    :PROMPT_REQUEST := v_prompt_request;
    :PROMPT_RESPONSE := v_prompt_response;
    -- ...
  END LOOP;
  CLOSE cur;
END;
```

> **Nota:** Los nombres de los items (`:USUARIO`, `:MODULO`, etc.) deben coincidir con los campos de tu formulario en Forms 6i o 12c.

---

## Uso de Docker y Docker Compose

Este proyecto está diseñado para ser ejecutado fácilmente usando Docker y Docker Compose, lo que permite levantar todos los servicios necesarios con un solo comando.

### Comandos principales

- **Construir y levantar todos los servicios:**
  ```sh
  docker compose up --build
  ```
  Esto construye las imágenes (si es necesario) y levanta los contenedores de Oracle XE, Ollama, Node.js y React.

- **Levantar servicios en segundo plano:**
  ```sh
  docker compose up -d
  ```

- **Detener todos los servicios:**
  ```sh
  docker compose down
  ```

- **Eliminar volúmenes y datos persistentes (útil para reinicializar Oracle):**
  ```sh
  docker compose down -v
  ```

### Descripción de los servicios en `docker-compose.yml`

- **oracle-xe**
  - Imagen: `wnameless/oracle-xe-11g-r2`
  - Expone el puerto 1521 para conexiones SQL.
  - Monta los scripts de inicialización en `/docker-entrypoint-initdb.d`.
  - Almacena los datos en un volumen persistente.

- **ollama**
  - Construido desde el Dockerfile en `ollama/`.
  - Usa el modelo `llama3:8b` en CPU, limitado a 4GB de RAM.
  - Expone el puerto 11434 para la API de Ollama.

- **node-service**
  - Construido desde el Dockerfile en `node-service/`.
  - Depende de Oracle y Ollama.
  - Usa variables de entorno desde `.env`.
  - Expone el puerto 3001 para la API REST.

- **react-frontend**
  - Construido desde el Dockerfile en `react-frontend/`.
  - Depende de node-service.
  - Usa variables de entorno desde `.env`.
  - Expone el puerto 5173 para la interfaz web.

Todos los servicios están conectados en la red `ai_bridge_net` para facilitar la comunicación interna.

---

## Troubleshooting: Rebuild y limpieza de contenedores

Si ocurre algún error o necesitas reiniciar completamente el entorno, puedes detener, eliminar y reconstruir todos los contenedores y volúmenes de la siguiente manera:

### 1. Detener todos los contenedores
```sh
docker compose down
```
Esto detiene y elimina todos los contenedores definidos en el `docker-compose.yml`.

### 2. Eliminar volúmenes y datos persistentes
```sh
docker compose down -v
```
Esto elimina también los volúmenes asociados (por ejemplo, los datos de Oracle), permitiendo una inicialización limpia.

### 3. (Opcional) Eliminar imágenes antiguas
```sh
docker image prune -a
```
Esto elimina todas las imágenes no utilizadas para liberar espacio.

### 4. Reconstruir y levantar todo desde cero
```sh
docker compose up --build
```
Esto fuerza la reconstrucción de todas las imágenes y la recreación de los contenedores.

> **Nota:** Si tienes contenedores fuera de Docker Compose, puedes detenerlos todos con:
> ```sh
> docker stop $(docker ps -aq)
> docker rm $(docker ps -aq)
> ```

Con estos pasos puedes garantizar un entorno limpio y funcional ante cualquier error o corrupción de datos.

---
