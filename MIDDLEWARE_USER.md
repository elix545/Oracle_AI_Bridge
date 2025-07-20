# Usuario Middleware - Oracle AI Bridge

## Descripción

El usuario `middleware` es un usuario Oracle dedicado creado específicamente para el Oracle AI Bridge. Este usuario tiene los privilegios mínimos necesarios para operar la aplicación y todos los objetos de base de datos se crean en su esquema.

## Características

### Credenciales
- **Usuario**: `middleware`
- **Contraseña**: `oracle`
- **Esquema**: `middleware`

### Privilegios Otorgados
```sql
GRANT CONNECT, RESOURCE TO middleware;
GRANT CREATE SESSION TO middleware;
GRANT CREATE TABLE TO middleware;
GRANT CREATE SEQUENCE TO middleware;
GRANT CREATE PROCEDURE TO middleware;
GRANT UNLIMITED TABLESPACE TO middleware;
```

## Objetos de Base de Datos

### Tabla Principal
```sql
CREATE TABLE middleware.PROMPT_QUEUE (
  ID NUMBER(18) PRIMARY KEY,
  USUARIO VARCHAR2(35),
  MODULO VARCHAR2(4),
  TRANSICION VARCHAR2(4),
  PROMPT_REQUEST VARCHAR2(4000),
  PROMPT_RESPONSE VARCHAR2(4000),
  FLAG_LECTURA NUMBER(1) DEFAULT 0,
  FLAG_COMPLETADO NUMBER(1) DEFAULT 0,
  FECHA_REQUEST DATE DEFAULT SYSDATE,
  FECHA_RESPONSE DATE,
  FECHA_LECTURA DATE,
  MODEL VARCHAR2(50) DEFAULT NULL
);
```

### Secuencia
```sql
CREATE SEQUENCE middleware.PROMPT_QUEUE_SEQ 
START WITH 1 INCREMENT BY 1;
```

### Constraints
```sql
ALTER TABLE middleware.PROMPT_QUEUE 
ADD CONSTRAINT CHK_FLAG_LECTURA CHECK (FLAG_LECTURA IN (0,1));

ALTER TABLE middleware.PROMPT_QUEUE 
ADD CONSTRAINT CHK_FLAG_COMPLETADO CHECK (FLAG_COMPLETADO IN (0,1));
```

### Funciones PL/SQL

#### INSERT_PROMPT_REQUEST
```sql
CREATE OR REPLACE FUNCTION middleware.INSERT_PROMPT_REQUEST(
  P_USUARIO IN VARCHAR2,
  P_MODULO IN VARCHAR2,
  P_TRANSICION IN VARCHAR2,
  P_PROMPT_REQUEST IN VARCHAR2
) RETURN NUMBER IS
  NEW_ID NUMBER;
BEGIN
  INSERT INTO middleware.PROMPT_QUEUE (ID, USUARIO, MODULO, TRANSICION, PROMPT_REQUEST)
  VALUES (middleware.PROMPT_QUEUE_SEQ.NEXTVAL, P_USUARIO, P_MODULO, P_TRANSICION, P_PROMPT_REQUEST)
  RETURNING ID INTO NEW_ID;
  RETURN NEW_ID;
END;
/
```

#### READ_PROMPT_REQUEST
```sql
CREATE OR REPLACE FUNCTION middleware.READ_PROMPT_REQUEST(
  P_TIMEOUT_SECONDS IN NUMBER DEFAULT 10
) RETURN SYS_REFCURSOR IS
  CUR SYS_REFCURSOR;
  V_START_TIME DATE := SYSDATE;
BEGIN
  LOOP
    OPEN CUR FOR
      SELECT * FROM middleware.PROMPT_QUEUE
      WHERE FLAG_LECTURA = 0 AND FLAG_COMPLETADO = 0
      ORDER BY FECHA_REQUEST
      FETCH FIRST 1 ROWS ONLY;
    EXIT WHEN CUR%FOUND OR (SYSDATE - V_START_TIME) * 86400 > P_TIMEOUT_SECONDS;
    DBMS_LOCK.SLEEP(1);
  END LOOP;
  RETURN CUR;
END;
/
```

### Job de Limpieza
```sql
BEGIN
  DBMS_SCHEDULER.CREATE_JOB (
    job_name        => 'PROMPT_QUEUE_CLEANUP',
    job_type        => 'PLSQL_BLOCK',
    job_action      => 'BEGIN DELETE FROM middleware.PROMPT_QUEUE WHERE FECHA_REQUEST < SYSDATE - 30; END;',
    start_date      => TRUNC(ADD_MONTHS(SYSDATE, 1), 'MM'),
    repeat_interval => 'FREQ=MONTHLY;BYMONTHDAY=1',
    enabled         => TRUE
  );
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignorar errores si DBMS_SCHEDULER no está disponible
END;
/
```

## Configuración del Node.js Service

### Variables de Entorno
```env
# Oracle DB
ORACLE_USER=middleware
ORACLE_PASSWORD=oracle
ORACLE_CONNECT_STRING=oracle-xe:1521/XE
```

### Conexión Oracle
El servicio Node.js está configurado para usar el modo **Thick** de node-oracledb con Oracle Instant Client para compatibilidad con Oracle 11g.

```typescript
// Configuración de oracledb
oracledb.initOracleClient();

async function getOracleConnection() {
  return await oracledb.getConnection({
    user: ORACLE_USER,           // middleware
    password: ORACLE_PASSWORD,   // oracle
    connectString: ORACLE_CONNECT_STRING,
    events: false,
    poolMin: 0,
    poolMax: 4,
    poolIncrement: 1
  });
}
```

## Ventajas del Usuario Middleware

### Seguridad
- **Principio de menor privilegio**: Solo tiene los permisos necesarios para operar
- **Aislamiento**: Todos los objetos están en su propio esquema
- **Sin acceso a objetos del sistema**: No puede acceder a tablas del sistema

### Mantenimiento
- **Fácil respaldo**: Solo necesita respaldar el esquema `middleware`
- **Migración simple**: Puede moverse a otra instancia Oracle fácilmente
- **Limpieza automática**: Job mensual elimina registros antiguos

### Escalabilidad
- **Independiente**: No interfiere con otros usuarios o aplicaciones
- **Configurable**: Privilegios específicos para la aplicación
- **Monitoreable**: Actividad aislada en un esquema dedicado

## Verificación de la Configuración

### Verificar que el usuario existe
```sql
SELECT username, account_status, created 
FROM dba_users 
WHERE username = 'MIDDLEWARE';
```

### Verificar objetos creados
```sql
SELECT object_name, object_type, created 
FROM dba_objects 
WHERE owner = 'MIDDLEWARE' 
ORDER BY object_type, object_name;
```

### Verificar privilegios
```sql
SELECT privilege, admin_option 
FROM dba_sys_privs 
WHERE grantee = 'MIDDLEWARE';
```

## Troubleshooting

### Error de conexión
Si el Node.js service no puede conectarse:

1. **Verificar que el usuario existe**:
   ```sql
   SELECT username FROM dba_users WHERE username = 'MIDDLEWARE';
   ```

2. **Verificar que el usuario no está bloqueado**:
   ```sql
   SELECT username, account_status FROM dba_users WHERE username = 'MIDDLEWARE';
   ```

3. **Verificar privilegios**:
   ```sql
   SELECT privilege FROM dba_sys_privs WHERE grantee = 'MIDDLEWARE';
   ```

### Error de tabla no encontrada
Si aparece el error `ORA-00942: table or view does not exist`:

1. **Verificar que la tabla existe**:
   ```sql
   SELECT table_name FROM dba_tables WHERE owner = 'MIDDLEWARE';
   ```

2. **Verificar que el usuario tiene acceso**:
   ```sql
   SELECT table_name FROM all_tables WHERE owner = 'MIDDLEWARE';
   ```

### Recrear el usuario (si es necesario)
Si necesitas recrear el usuario desde cero:

```sql
-- Conectar como SYSTEM
CONNECT system/oracle@//localhost:1521/XE

-- Eliminar usuario si existe
DROP USER middleware CASCADE;

-- Recrear usuario
CREATE USER middleware IDENTIFIED BY oracle;
GRANT CONNECT, RESOURCE TO middleware;
GRANT CREATE SESSION TO middleware;
GRANT CREATE TABLE TO middleware;
GRANT CREATE SEQUENCE TO middleware;
GRANT CREATE PROCEDURE TO middleware;
GRANT UNLIMITED TABLESPACE TO middleware;

-- Ejecutar el script init.sql
```

## Migración desde Usuario SYSTEM

Si anteriormente usabas el usuario `SYSTEM`, la migración es automática:

1. **El script `init.sql` crea el usuario `middleware`**
2. **Todos los objetos se crean en el esquema `middleware`**
3. **El Node.js service se configura automáticamente para usar `middleware`**

No es necesario migrar datos existentes ya que el sistema está diseñado para usar el nuevo usuario desde el inicio. 