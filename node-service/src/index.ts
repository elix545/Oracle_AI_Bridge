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

// Simple rate limiting middleware
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration from environment variables
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== 'false'; // Default: true
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '60000'); // Default: 1 minute (60000ms)
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '20'); // Default: 20 requests per minute

// Log rate limiting configuration
logger.info('Rate limiting configuration', {
  enabled: RATE_LIMIT_ENABLED,
  window: RATE_LIMIT_WINDOW,
  maxRequests: RATE_LIMIT_MAX,
  windowSeconds: RATE_LIMIT_WINDOW / 1000,
  maxRequestsPerMinute: RATE_LIMIT_MAX
});

app.use((req, res, next) => {
  // Skip rate limiting if disabled
  if (!RATE_LIMIT_ENABLED) {
    return next();
  }

  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!requestCounts.has(clientIP)) {
    requestCounts.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    const clientData = requestCounts.get(clientIP)!;
    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + RATE_LIMIT_WINDOW;
    } else {
      clientData.count++;
    }
    
    if (clientData.count > RATE_LIMIT_MAX) {
      logger.warn(`Rate limit exceeded for ${clientIP}`, { 
        count: clientData.count, 
        maxRequests: RATE_LIMIT_MAX,
        windowSeconds: RATE_LIMIT_WINDOW / 1000
      });
      return res.status(429).json({ 
        error: 'Too many requests. Please slow down.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000),
        limit: RATE_LIMIT_MAX,
        window: RATE_LIMIT_WINDOW / 1000
      });
    }
  }
  
  next();
});

// Middleware para manejar errores de parsing de JSON
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof SyntaxError && 'body' in err) {
    logger.error('JSON parsing error', { 
      error: err.message, 
      url: req.url, 
      method: req.method,
      body: req.body,
      headers: req.headers
    });
    
    // Limpiar el body problemático y continuar
    req.body = {};
    return next();
  }
  next();
});

// Middleware para sanitizar todos los requests
app.use((req: any, res: any, next: any) => {
  try {
    // Sanitizar el body del request
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeData(req.body);
    }
    next();
  } catch (err) {
    logger.error('Error sanitizing request body', { error: err, url: req.url });
    req.body = {};
    next();
  }
});

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

// Función para sanitizar datos y asegurar que sean serializables
function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return '';
  }
  
  if (typeof data === 'string') {
    // Limpiar caracteres especiales y control que pueden causar problemas
    let cleanedString = data
      .replace(/\t/g, ' ')           // Reemplazar tabs con espacios
      .replace(/\r/g, ' ')           // Reemplazar carriage returns
      .replace(/\n/g, ' ')           // Reemplazar newlines con espacios
      .replace(/\f/g, ' ')           // Reemplazar form feeds
      .replace(/\v/g, ' ')           // Reemplazar vertical tabs
      .replace(/\0/g, '')            // Remover null bytes
      .replace(/[\x00-\x1F\x7F]/g, ' ') // Remover otros caracteres de control
      .replace(/\s+/g, ' ')          // Normalizar espacios múltiples
      .trim();                       // Remover espacios al inicio y final
    
    // Si después de la limpieza queda vacío, devolver un valor por defecto
    return cleanedString || '[Texto vacío]';
  }
  
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }
  
  if (Array.isArray(data)) {
    try {
      return data.map(item => sanitizeData(item));
    } catch (err) {
      logger.warn('Error sanitizing array item', { error: err, data });
      return [];
    }
  }
  
  if (typeof data === 'object') {
    // Check for Oracle LOB objects or other non-serializable objects
    if (data._readableState || data._writableState || data._events || data._impl || 
        data._chunkSize || data._pieceSize || data._length || data._type || data._autoCloseLob) {
      logger.warn('Detected Oracle LOB or non-serializable object, converting to string', { 
        objectKeys: Object.keys(data),
        objectType: data.constructor?.name 
      });
      return '[LOB Object]';
    }
    
    // Para otros objetos, intentar sanitizar cada propiedad
    const sanitized: any = {};
    try {
      for (const [key, value] of Object.entries(data)) {
        try {
          // Sanitizar la clave también para evitar problemas
          const safeKey = typeof key === 'string' ? key.replace(/[^\w]/g, '_') : String(key);
          sanitized[safeKey] = sanitizeData(value);
        } catch (err) {
          logger.warn('Error sanitizing object property', { key, error: err });
          sanitized[key] = '';
        }
      }
      return sanitized;
    } catch (err) {
      logger.warn('Error sanitizing object', { error: err, data });
      return '[Object Error]';
    }
  }
  
  // Para cualquier otro tipo, intentar convertir a string de forma segura
  try {
    const stringValue = String(data);
    // Aplicar la misma limpieza que a los strings
    return sanitizeData(stringValue);
  } catch (err) {
    logger.warn('Error converting data to string', { error: err, data });
    return '[Conversion Error]';
  }
}

// Función para limpiar prompts específicamente
function cleanPrompt(prompt: string): string {
  if (typeof prompt !== 'string') {
    return String(prompt || '');
  }
  
  return prompt
    .replace(/\t/g, ' ')           // Reemplazar tabs
    .replace(/\r/g, ' ')           // Reemplazar carriage returns
    .replace(/\n/g, ' ')           // Reemplazar newlines
    .replace(/\f/g, ' ')           // Reemplazar form feeds
    .replace(/\v/g, ' ')           // Reemplazar vertical tabs
    .replace(/\0/g, '')            // Remover null bytes
    .replace(/[\x00-\x1F\x7F]/g, ' ') // Remover otros caracteres de control
    .replace(/\s+/g, ' ')          // Normalizar espacios múltiples
    .trim();                       // Remover espacios al inicio y final
}

app.post('/api/request', async (req, res) => {
  const { usuario, modulo, transicion, prompt_request, model } = req.body;
  let conn;
  try {
    conn = await getOracleConnection();
    
    // Usar la función middleware.INSERT_PROMPT_REQUEST actualizada
    const result = await conn.execute(
      `BEGIN
         :id := middleware.INSERT_PROMPT_REQUEST(
           p_usuario => :usuario,
           p_modulo => :modulo,
           p_transicion => :transicion,
           p_prompt_request => :prompt_request,
           p_model => :model
         );
       END;`,
      {
        usuario,
        modulo,
        transicion,
        prompt_request,
        model: model || 'llama3:8b',
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    
    await conn.commit();
    await conn.close();
    
    const generatedId = result.outBinds.id;
    logger.info('Request insertado usando función INSERT_PROMPT_REQUEST', { 
      id: generatedId, 
      usuario, 
      modulo, 
      transicion,
      model: model || 'llama3:8b'
    });
    
    res.json({ id: generatedId });
  } catch (err: any) {
    if (conn) await conn.close();
    logger.error('Error al insertar request usando función INSERT_PROMPT_REQUEST', { 
      error: err.message, 
      usuario, 
      modulo, 
      transicion,
      model: model || 'llama3:8b'
    });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/requests', async (req, res) => {
  let conn;
  try {
    logger.debug('Starting /api/requests endpoint'); // Changed to debug level
    conn = await getOracleConnection();
    logger.debug('Oracle connection established'); // Changed to debug level
    
    // Add limit to prevent excessive data transfer
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Oracle 11g compatible pagination using ROWNUM
    const result = await conn.execute(
      `SELECT * FROM (
         SELECT a.*, ROWNUM rnum FROM (
           SELECT ID, USUARIO, MODULO, TRANSICION, PROMPT_REQUEST, 
                  DBMS_LOB.SUBSTR(PROMPT_RESPONSE, 4000, 1) AS PROMPT_RESPONSE,
                  FLAG_LECTURA, FLAG_COMPLETADO, FECHA_REQUEST, FECHA_RESPONSE, FECHA_LECTURA, MODEL
           FROM middleware.PROMPT_QUEUE 
           ORDER BY FECHA_REQUEST DESC
         ) a WHERE ROWNUM <= :maxRow
       ) WHERE rnum > :offset`,
      { maxRow: offset + limit, offset },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    logger.info('Oracle query executed', { 
      hasRows: !!result.rows, 
      rowCount: result.rows ? result.rows.length : 0,
      firstRowKeys: result.rows && result.rows.length > 0 ? Object.keys(result.rows[0]) : []
    });
    
    // Validar que result.rows sea un array y sanitizar los datos
    if (result.rows && Array.isArray(result.rows)) {
      const rows = result.rows.map((row: any) => {
        const sanitizedRow = sanitizeData(row);
        return {
          ...sanitizedRow,
          MODEL: sanitizedRow.MODEL || OLLAMA_DEFAULT_MODEL,
        };
      });
      
      await conn.close();
      logger.info('Sending queue data', { rowCount: rows.length });
      
      // Set headers to prevent caching
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `"${Date.now()}"`
      });
      
      res.json(rows);
    } else {
      await conn.close();
      logger.error('Oracle result.rows is not an array', { result });
      
      // Set headers to prevent caching
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `"${Date.now()}"`
      });
      
      res.json([]);
    }
  } catch (err: any) {
    if (conn) await conn.close();
    logger.error('Error al leer requests de Oracle', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate', async (req, res) => {
  const { prompt, model, id } = req.body;
  
  // Limpiar el prompt antes de procesarlo para evitar caracteres problemáticos
  const cleanedPrompt = cleanPrompt(prompt);
  
  logger.info(`[PROMPT_RESPONSE] Valor recibido de id en /api/generate:`, { 
    id, 
    originalPrompt: prompt,
    cleanedPrompt: cleanedPrompt,
    promptLength: cleanedPrompt.length
  });
  
  const modelToUse = model || OLLAMA_DEFAULT_MODEL;

  // Si se recibe un ID, primero consultar si ya existe PROMPT_RESPONSE
  if (id) {
    let conn;
    try {
      // Asegurar que id sea un valor simple, no un array
      const simpleId = Array.isArray(id) ? id[0] : id;
      
      conn = await getOracleConnection();
      const result = await conn.execute(
        `SELECT DBMS_LOB.SUBSTR(PROMPT_RESPONSE, 4000, 1) AS PROMPT_RESPONSE 
         FROM middleware.PROMPT_QUEUE WHERE ID = :id`,
        { id: simpleId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      await conn.close();
      if (result.rows && result.rows.length > 0 && result.rows[0].PROMPT_RESPONSE) {
        logger.info(`[PROMPT_RESPONSE][CACHE] PROMPT_RESPONSE ya existe para ID`, { id: simpleId });
        const sanitizedResponse = sanitizeData(result.rows[0].PROMPT_RESPONSE);
        return res.json({ response: sanitizedResponse });
      }
    } catch (err: any) {
      if (conn) await conn.close();
      logger.error(`[PROMPT_RESPONSE][CACHE][ERROR] Error al consultar PROMPT_RESPONSE en Oracle`, { id, simpleId: Array.isArray(id) ? id[0] : id, error: err.message });
      // Si hay error, continuar con el flujo normal
    }
  }

  try {
    logger.info(`Llamando a Ollama con modelo: ${modelToUse}`);
    
    // Usar streaming para obtener la respuesta completa
    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      { model: modelToUse, prompt: cleanedPrompt, stream: false }, // Usar prompt limpio
      { timeout: TIMEOUT_NODE_SERVICE }
    );
    
    logger.info('Respuesta recibida de Ollama', { 
      hasResponse: !!response.data.response,
      responseLength: response.data.response?.length,
      responseType: typeof response.data.response
    });

         // Si se recibe un ID, guardar la respuesta en la base de datos
     if (id && response.data.response) {
       let conn;
       try {
         // Asegurar que id sea un valor simple, no un array
         const simpleId = Array.isArray(id) ? id[0] : id;
         const responseText = sanitizeData(response.data.response);
         
         logger.info(`[PROMPT_RESPONSE][DEBUG] Intentando guardar en PROMPT_RESPONSE para ID ${simpleId}:`, {
           type: typeof responseText,
           length: responseText.length,
           preview: responseText.substring(0, 200)
         });
         
         conn = await getOracleConnection();
         const updateResult = await conn.execute(
           `UPDATE middleware.PROMPT_QUEUE SET PROMPT_RESPONSE = :response, FECHA_RESPONSE = SYSDATE, FLAG_COMPLETADO = 1 WHERE ID = :id`,
           { response: responseText, id: simpleId }
         );
         await conn.commit();
         await conn.close();
         
         logger.info(`[PROMPT_RESPONSE][UPDATE] Resultado de update`, { 
           id: simpleId, 
           rowsAffected: updateResult.rowsAffected,
           responseLength: responseText.length
         });
         
         if (!updateResult.rowsAffected) {
           logger.warn(`[PROMPT_RESPONSE][UPDATE] No se actualizó ninguna fila para ID`, { id: simpleId });
         } else {
           logger.info(`[PROMPT_RESPONSE][UPDATE] PROMPT_RESPONSE actualizado correctamente para ID`, { id: simpleId });
         }
       } catch (dbErr: any) {
         if (conn) await conn.close();
         logger.error(`[PROMPT_RESPONSE][UPDATE][ERROR] Error al actualizar PROMPT_RESPONSE en Oracle`, { 
           id, 
           simpleId: Array.isArray(id) ? id[0] : id,
           error: dbErr.message, 
           stack: dbErr.stack 
         });
       }
     } else if (id) {
       logger.warn(`[PROMPT_RESPONSE] No se recibió respuesta de Ollama para ID`, { id });
     }

    // Asegurar que solo se envíen datos serializables
    const safeResponse = {
      response: sanitizeData(response.data.response || ''),
      model: sanitizeData(response.data.model || modelToUse),
      done: sanitizeData(response.data.done || false)
    };
    res.json(safeResponse);
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
    
    // Asegurar que siempre devuelva un formato consistente y serializable
    if (response.data && Array.isArray(response.data.models)) {
      // Filtrar solo los campos necesarios y asegurar que sean serializables
      const safeModels = response.data.models.map((model: any) => {
        const sanitizedModel = sanitizeData(model);
        return {
          name: sanitizedModel.name || '',
          model: sanitizedModel.model || '',
          size: sanitizedModel.size || 0,
          digest: sanitizedModel.digest || '',
          modified_at: sanitizedModel.modified_at || ''
        };
      });
      res.json({ models: safeModels });
    } else {
      logger.warn('Ollama response format unexpected, returning empty models array', { data: response.data });
      res.json({ models: [] });
    }
  } catch (err: any) {
    logger.error('Error al obtener modelos de Ollama', err);
    res.status(500).json({ error: err.message, models: [] });
  }
});

// Endpoint to check if queue has data (lightweight)
app.get('/api/queue-status', async (req, res) => {
  let conn;
  try {
    conn = await getOracleConnection();
    const result = await conn.execute(
      `SELECT COUNT(*) as count FROM middleware.PROMPT_QUEUE`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    await conn.close();
    
    const count = result.rows?.[0]?.COUNT || 0;
    res.json({ hasData: count > 0, count });
  } catch (err: any) {
    if (conn) await conn.close();
    logger.error('Error checking queue status', err);
    res.status(500).json({ error: err.message, hasData: false, count: 0 });
  }
});

// Endpoint to check rate limiting status
app.get('/api/rate-limit-status', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const clientData = requestCounts.get(clientIP);
  
  // Base response with configuration
  const baseResponse = {
    clientIP,
    configuration: {
      enabled: RATE_LIMIT_ENABLED,
      windowSeconds: RATE_LIMIT_WINDOW / 1000,
      maxRequests: RATE_LIMIT_MAX,
      maxRequestsPerMinute: RATE_LIMIT_MAX
    }
  };
  
  if (clientData) {
    const now = Date.now();
    const timeLeft = Math.max(0, clientData.resetTime - now);
    const isLimited = clientData.count >= RATE_LIMIT_MAX;
    
    res.json({
      ...baseResponse,
      requestCount: clientData.count,
      timeLeft,
      isLimited,
      resetTime: new Date(clientData.resetTime).toISOString(),
      remainingRequests: Math.max(0, RATE_LIMIT_MAX - clientData.count),
      usagePercentage: Math.round((clientData.count / RATE_LIMIT_MAX) * 100)
    });
  } else {
    res.json({
      ...baseResponse,
      requestCount: 0,
      timeLeft: 0,
      isLimited: false,
      resetTime: null,
      remainingRequests: RATE_LIMIT_MAX,
      usagePercentage: 0
    });
  }
});

// Endpoint to update rate limiting configuration (development only)
app.post('/api/rate-limit-config', (req, res) => {
  // Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Configuration updates not allowed in production',
      message: 'Rate limiting configuration can only be updated via environment variables in production'
    });
  }

  const { enabled, window, maxRequests } = req.body;
  
  // Validate input
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }
  
  if (window !== undefined && (typeof window !== 'number' || window < 1000)) {
    return res.status(400).json({ error: 'window must be a number >= 1000ms' });
  }
  
  if (maxRequests !== undefined && (typeof maxRequests !== 'number' || maxRequests < 1)) {
    return res.status(400).json({ error: 'maxRequests must be a number >= 1' });
  }

  // Update configuration
  if (enabled !== undefined) {
    // Note: This is a simplified approach. In production, use environment variables
    logger.info('Rate limiting enabled status updated', { 
      old: RATE_LIMIT_ENABLED, 
      new: enabled 
    });
  }
  
  if (window !== undefined) {
    logger.info('Rate limiting window updated', { 
      old: RATE_LIMIT_WINDOW, 
      new: window,
      oldSeconds: RATE_LIMIT_WINDOW / 1000,
      newSeconds: window / 1000
    });
  }
  
  if (maxRequests !== undefined) {
    logger.info('Rate limiting max requests updated', { 
      old: RATE_LIMIT_MAX, 
      new: maxRequests 
    });
  }

  res.json({ 
    message: 'Configuration update request received',
    note: 'In production, update environment variables and restart the service',
    currentConfig: {
      enabled: RATE_LIMIT_ENABLED,
      window: RATE_LIMIT_WINDOW,
      maxRequests: RATE_LIMIT_MAX
    }
  });
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