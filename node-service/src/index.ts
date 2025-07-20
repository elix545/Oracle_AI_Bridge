import express from 'express';
import oracledb from 'oracledb';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import logger from './logger';

dotenv.config({
  path: fs.existsSync(path.resolve(__dirname, '../.env')) ? path.resolve(__dirname, '../.env') : undefined
});

// Configure oracledb to use Thick mode for Oracle 11g compatibility
oracledb.initOracleClient();

const app = express();
app.use(express.json());

// Middleware para loguear todas las peticiones entrantes
app.use((req, res, next) => {
  logger.info(`Request: ${req.method} ${req.originalUrl}`, { body: req.body });
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`Response: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

const ORACLE_USER = process.env.ORACLE_USER || 'middleware';
const ORACLE_PASSWORD = process.env.ORACLE_PASSWORD || 'oracle';
const ORACLE_CONNECT_STRING = process.env.ORACLE_CONNECT_STRING || 'oracle-xe:1521/XE';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const OLLAMA_DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || 'llama3:8b';
const TIMEOUT_NODE_SERVICE = parseInt(process.env.TIMEOUT_NODE_SERVICE || '300000'); // 5 minutos por defecto

async function getOracleConnection() {
  return await oracledb.getConnection({
    user: ORACLE_USER,
    password: ORACLE_PASSWORD,
    connectString: ORACLE_CONNECT_STRING,
    // Additional options for Oracle 11g compatibility
    events: false,
    poolMin: 0,
    poolMax: 4,
    poolIncrement: 1
  });
}

app.post('/api/request', async (req, res) => {
  const { usuario, modulo, transicion, prompt_request, model } = req.body;
  let conn;
  try {
    conn = await getOracleConnection();
    const result = await conn.execute(
      `INSERT INTO middleware.PROMPT_QUEUE (ID, USUARIO, MODULO, TRANSICION, PROMPT_REQUEST, FLAG_LECTURA, FLAG_COMPLETADO, FECHA_REQUEST, MODEL)
       VALUES (middleware.PROMPT_QUEUE_SEQ.NEXTVAL, :usuario, :modulo, :transicion, :prompt_request, 0, 0, SYSDATE, :model)
       RETURNING ID INTO :id`,
      {
        usuario,
        modulo,
        transicion,
        prompt_request,
        model: model || null,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    await conn.commit();
    await conn.close();
    res.json({ id: result.outBinds.id });
  } catch (err: any) {
    if (conn) await conn.close();
    logger.error('Error al insertar request en Oracle', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/requests', async (req, res) => {
  let conn;
  try {
    conn = await getOracleConnection();
    const result = await conn.execute(
      `SELECT ID, USUARIO, MODULO, TRANSICION, PROMPT_REQUEST, PROMPT_RESPONSE, FLAG_LECTURA, FLAG_COMPLETADO, FECHA_REQUEST, FECHA_RESPONSE, FECHA_LECTURA, MODEL
       FROM middleware.PROMPT_QUEUE ORDER BY FECHA_REQUEST DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    await conn.close();
    
    // Validar que result.rows sea un array
    if (result.rows && Array.isArray(result.rows)) {
      const rows = result.rows.map((row: any) => ({
        ...row,
        MODEL: row.MODEL || OLLAMA_DEFAULT_MODEL,
      }));
      logger.info('Sending queue data', { rowCount: rows.length });
      res.json(rows);
    } else {
      logger.error('Oracle result.rows is not an array', { result });
      res.json([]);
    }
  } catch (err: any) {
    if (conn) await conn.close();
    logger.error('Error al leer requests de Oracle', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate', async (req, res) => {
  const { prompt, model } = req.body;
  const modelToUse = model || OLLAMA_DEFAULT_MODEL;
  try {
    logger.info(`Llamando a Ollama con modelo: ${modelToUse}`);
    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      { model: modelToUse, prompt },
      { timeout: TIMEOUT_NODE_SERVICE }
    );
    logger.info('Respuesta recibida de Ollama');
    res.json(response.data);
  } catch (err: any) {
    logger.error('Error o timeout al generar respuesta con Ollama', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tags', async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    logger.info('Ollama tags response received', { 
      status: response.status, 
      data: response.data 
    });
    
    // Asegurar que siempre devuelva un formato consistente
    if (response.data && Array.isArray(response.data.models)) {
      res.json(response.data);
    } else {
      logger.warn('Ollama response format unexpected, returning empty models array', { data: response.data });
      res.json({ models: [] });
    }
  } catch (err: any) {
    logger.error('Error al obtener modelos de Ollama', err);
    res.status(500).json({ error: err.message, models: [] });
  }
});

// Endpoint para recibir logs del frontend
app.post('/api/log', async (req, res) => {
  const { level, message, data, timestamp, userAgent, url } = req.body;
  
  // Log con el nivel correspondiente
  const logMessage = `[FRONTEND-${level.toUpperCase()}] ${timestamp} - ${message}`;
  
  switch (level.toLowerCase()) {
    case 'error':
      logger.error(logMessage, { data, userAgent, url });
      break;
    case 'warn':
      logger.warn(logMessage, { data, userAgent, url });
      break;
    case 'debug':
      logger.debug(logMessage, { data, userAgent, url });
      break;
    default:
      logger.info(logMessage, { data, userAgent, url });
  }
  
  res.json({ received: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Node service listening on port ${PORT}`);
}); 