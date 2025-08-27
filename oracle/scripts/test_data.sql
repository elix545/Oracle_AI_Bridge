-- Script de prueba para insertar datos de ejemplo en PROMPT_QUEUE
-- Ejecutar después de crear la tabla y funciones

-- Insertar datos de prueba
INSERT INTO middleware.PROMPT_QUEUE (USUARIO, MODULO, TRANSICION, PROMPT_REQUEST, MODEL, FLAG_LECTURA, FLAG_COMPLETADO, FECHA_REQUEST)
VALUES ('usuario1', 'TEST', 'T001', 'Este es un prompt de prueba 1', 'llama3:8b', 0, 0, SYSDATE);

INSERT INTO middleware.PROMPT_QUEUE (USUARIO, MODULO, TRANSICION, PROMPT_REQUEST, MODEL, FLAG_LECTURA, FLAG_COMPLETADO, FECHA_REQUEST)
VALUES ('usuario2', 'TEST', 'T002', 'Este es un prompt de prueba 2', 'llama3:8b', 0, 1, SYSDATE);

INSERT INTO middleware.PROMPT_QUEUE (USUARIO, MODULO, TRANSICION, PROMPT_REQUEST, MODEL, FLAG_LECTURA, FLAG_COMPLETADO, FECHA_REQUEST)
VALUES ('usuario3', 'TEST', 'T003', 'Este es un prompt de prueba 3', 'llama3:8b', 1, 0, SYSDATE);

-- Verificar que los datos se insertaron
SELECT COUNT(*) as total_registros FROM middleware.PROMPT_QUEUE;

-- Probar la función QUERY_PROMPT_QUEUE
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(NULL, NULL, 'ALLSTATS LAST'));

-- Mostrar los datos insertados
SELECT ID, USUARIO, MODULO, TRANSICION, PROMPT_REQUEST, 
       DBMS_LOB.SUBSTR(PROMPT_RESPONSE, 4000, 1) AS PROMPT_RESPONSE,
       FLAG_LECTURA, FLAG_COMPLETADO, FECHA_REQUEST, MODEL
FROM middleware.PROMPT_QUEUE 
ORDER BY FECHA_REQUEST DESC;
