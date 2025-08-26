import React, { useState, useEffect } from 'react';
import api from './api';
import logger from './logger';

interface PromptQueueItem {
  ID: number;
  MODULO: string;
  FLAG_COMPLETADO: number;
  PROMPT_REQUEST: string;
  PROMPT_RESPONSE: string;
  [key: string]: any; // Para permitir campos adicionales
}

interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  modified_at: string;
}

// Error Boundary para capturar errores de React
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React Error Boundary caught an error', { 
      error: error.message, 
      stack: error.stack,
      componentStack: errorInfo.componentStack 
    });
    
    // Si es un error de serialización, intentar limpiar el estado
    if (error.message.includes('Objects are not valid as a React child') || 
        error.message.includes('serializable')) {
      logger.warn('Serialization error detected, attempting to clean up state');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          backgroundColor: '#ffebee', 
          border: '1px solid #ef5350',
          borderRadius: '4px'
        }}>
          <h2>Algo salió mal</h2>
          <p>Ha ocurrido un error en la aplicación. Por favor, recarga la página.</p>
          <details style={{ marginTop: '10px' }}>
            <summary>Detalles del error</summary>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '10px', 
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {this.state.error?.toString()}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  console.log('App component rendering...');
  
  const [dbRequest, setDbRequest] = useState({ usuario: '', modulo: '', transicion: '', prompt_request: '' });
  const [ollamaPrompt, setOllamaPrompt] = useState('');
  const [ollamaResponse, setOllamaResponse] = useState('');
  const [queue, setQueue] = useState<PromptQueueItem[]>([]);
  const [rowResponses, setRowResponses] = useState<{ [id: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [showOllamaModels, setShowOllamaModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Función para limpiar datos y asegurar que sean serializables
  function sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return '';
    }
    
    if (typeof data === 'string') {
      return data;
    }
    
    if (typeof data === 'number' || typeof data === 'boolean') {
      return String(data);
    }
    
    if (typeof data === 'object') {
      // Check if it's an Oracle CLOB object
      if (data._readableState || data._impl || data._type || data._events) {
        logger.warn('Detected Oracle LOB or non-serializable object, converting to string', {
          objectKeys: Object.keys(data),
          objectType: typeof data
        });
        return '[LOB Object]';
      }
      
      // Check if it's an array
      if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
      }
      
      // For other objects, try to convert to string
      try {
        return String(data);
      } catch (err) {
        logger.warn('Error converting object to string', { error: err, data });
        return '[Object]';
      }
    }
    
    return String(data);
  }

  // Función para extraer el nombre del modelo de un objeto modelo
  const getModelName = (model: any): string => {
    if (typeof model === 'string') {
      return model;
    }
    if (typeof model === 'object' && model !== null) {
      // Si es un objeto modelo de Ollama, usar la propiedad name
      if (model.name) {
        return String(model.name);
      }
      // Si tiene otras propiedades, intentar encontrar un nombre
      if (model.model) {
        return String(model.model);
      }
      // Si no tiene propiedades conocidas, convertir a string
      return String(model);
    }
    return String(model || '');
  };

  logger.info('App component initialized');

  const fetchQueue = async () => {
    logger.info('Fetching queue from /api/requests');
    try {
      // Add cache-busting parameter to prevent browser caching
      const timestamp = Date.now();
      const res = await api.get(`/requests?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'If-Modified-Since': '0'
        }
      });
      logger.info('Queue response received', { 
        status: res.status, 
        dataLength: res.data?.length, 
        dataType: typeof res.data,
        data: res.data 
      });
      
      // Log specific items to debug
      if (Array.isArray(res.data) && res.data.length > 0) {
        logger.info('First few items in queue:', res.data.slice(0, 3).map(item => ({
          ID: item.ID,
          PROMPT_REQUEST: item.PROMPT_REQUEST,
          PROMPT_RESPONSE: item.PROMPT_RESPONSE,
          FLAG_COMPLETADO: item.FLAG_COMPLETADO
        })));
      }
      
      // Asegurar que los datos sean serializables y válidos
      let rows: PromptQueueItem[] = [];
      if (Array.isArray(res.data)) {
        if (res.data.length > 0 && Array.isArray(res.data[0])) {
          // Si es array de arrays, mapear a objetos
          const keys = [
            'ID', 'USUARIO', 'MODULO', 'TRANSICION', 'PROMPT_REQUEST', 'PROMPT_RESPONSE',
            'FLAG_LECTURA', 'FLAG_COMPLETADO', 'FECHA_REQUEST', 'FECHA_RESPONSE', 'FECHA_LECTURA', 'MODEL'
          ];
          rows = res.data.map((arr: any[]) => {
            const obj: any = {};
            keys.forEach((k, i) => { 
              obj[k] = sanitizeData(arr[i]);
            });
            return obj;
          });
        } else {
          // Si ya es array de objetos, asegurar que sean serializables
          rows = res.data.map((item: any) => sanitizeData(item));
        }
        setQueue(rows);
        setError(null);
      } else {
        logger.error('Queue response is not an array', { data: res.data });
        setQueue([]);
        setError('Error: La respuesta del servidor no es válida');
      }
    } catch (err: any) {
      logger.error('Error fetching queue', { error: err.message, status: err.response?.status });
      setQueue([]);
      setError(`Error al obtener la cola: ${err.message}`);
    }
  };

  const fetchModels = async () => {
    logger.info('=== fetchModels function called ===');
    logger.info('Fetching models from /api/tags');
    try {
      logger.info('Making API call to /api/tags...');
      const res = await api.get('/tags');
      logger.info('API call to /api/tags completed', { 
        status: res.status, 
        models: res.data?.models, 
        dataType: typeof res.data,
        data: res.data 
      });
      
      // Validar que res.data.models sea un array y asegurar que sea serializable
      if (res.data && Array.isArray(res.data.models)) {
        logger.info('Models array found, processing...');
        // Extraer solo los nombres de los modelos para el selector
        const modelNames = res.data.models.map((model: any) => {
          const modelName = getModelName(model);
          logger.debug('Processing model', { original: model, extractedName: modelName, type: typeof modelName });
          return modelName;
        });
        
        logger.info('Processed model names', { modelNames, count: modelNames.length });
        setModels(modelNames);
        setError(null);
        logger.info('=== fetchModels completed successfully ===');
      } else {
        logger.error('Models response is not valid', { data: res.data });
        setModels([]);
        setError('Error: La respuesta de modelos no es válida');
      }
    } catch (err: any) {
      logger.error('Error fetching models', { error: err.message, status: err.response?.status, stack: err.stack });
      setModels([]);
      setError(`Error al obtener modelos: ${err.message}`);
    }
  };

  useEffect(() => {
    console.log('App useEffect triggered - initializing component');
    logger.info('=== App useEffect triggered - initializing component ===');
    
    const initializeApp = async () => {
      try {
        console.log('Starting app initialization...');
        logger.info('=== Starting app initialization... ===');
        
        // Fetch initial data - call them separately to see which one fails
        console.log('Calling fetchQueue...');
        logger.info('=== Calling fetchQueue... ===');
        await fetchQueue();
        console.log('fetchQueue completed');
        logger.info('=== fetchQueue completed ===');
        
        console.log('About to call fetchModels...');
        logger.info('=== About to call fetchModels... ===');
        await fetchModels();
        console.log('fetchModels call completed');
        logger.info('=== fetchModels call completed ===');
        
        setIsInitialized(true);
        console.log('App initialization completed successfully');
        logger.info('=== App initialization completed successfully ===');
      } catch (err: any) {
        console.error('Error during app initialization:', err);
        logger.error('=== Error during app initialization ===', { error: err.message, stack: err.stack });
        setError(`Error durante la inicialización: ${err.message}`);
      }
    };
    
    console.log('Calling initializeApp...');
    logger.info('=== Calling initializeApp... ===');
    initializeApp();
    
    // Set up polling interval with adaptive timing
    const interval = setInterval(() => {
      logger.debug('Polling queue - interval triggered');
      
      // Check if there are pending requests and adjust polling frequency
      const hasPendingRequests = queue.some(item => item.FLAG_COMPLETADO === 0);
      
      if (hasPendingRequests) {
        logger.debug('Pending requests detected, polling more frequently');
        fetchQueue();
        
        // Also check for new responses in pending requests
        queue.forEach(item => {
          if (item.FLAG_COMPLETADO === 0 && item.PROMPT_RESPONSE) {
            logger.info('Found pending request with response, updating rowResponses', { 
              id: item.ID, 
              response: item.PROMPT_RESPONSE 
            });
            setRowResponses(prev => ({ ...prev, [item.ID]: item.PROMPT_RESPONSE }));
          }
        });
      } else {
        fetchQueue();
      }
    }, 2000); // Reduced to 2 seconds for better responsiveness
    
    logger.info('Polling interval set up for queue updates');
    
    return () => {
      logger.info('Cleaning up interval');
      clearInterval(interval);
    };
  }, [queue]); // Added queue as dependency to react to changes

  // Mostrar automáticamente los responses ya procesados en la tabla
  useEffect(() => {
    console.log('useEffect triggered - queue changed', { queueLength: queue.length });
    logger.info('useEffect triggered - queue changed', { queueLength: queue.length });
    
    if (Array.isArray(queue) && queue.length > 0) {
      logger.info('Auto-updating rowResponses from queue', { 
        queueLength: queue.length, 
        itemsWithResponses: queue.filter(item => item.PROMPT_RESPONSE).map(item => ({ ID: item.ID, response: item.PROMPT_RESPONSE }))
      });
      
      setRowResponses(prev => {
        const updated: { [id: number]: string } = { ...prev };
        let changes = 0;
        queue.forEach(item => {
          if (item.PROMPT_RESPONSE && !updated[item.ID]) {
            updated[item.ID] = item.PROMPT_RESPONSE;
            changes++;
            logger.info('Auto-added response for ID', { id: item.ID, response: item.PROMPT_RESPONSE });
          }
        });
        if (changes > 0) {
          logger.info('Updated rowResponses', { changes, newKeys: Object.keys(updated) });
        }
        return updated;
      });
    }
  }, [queue]);

  // Ensure models state is always an array of strings
  useEffect(() => {
    if (Array.isArray(models)) {
      const sanitizedModels = models.map((model: any) => {
        if (typeof model === 'string') {
          return model;
        }
        if (typeof model === 'object' && model !== null) {
          return model.name || model.model || String(model);
        }
        return String(model || '');
      });
      
      // Only update if there's a difference
      if (JSON.stringify(sanitizedModels) !== JSON.stringify(models)) {
        logger.warn('Sanitizing models state', { original: models, sanitized: sanitizedModels });
        setModels(sanitizedModels);
      }
    }
  }, [models]);

  const handleDbRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.info('Submitting DB request', { formData: dbRequest, selectedModel: model });
    setLoading(true);
    setError(null);
    
    try {
      const requestData = {
        ...dbRequest,
        model: model || undefined,
      };
      logger.info('Sending POST to /api/request', requestData);
      
      const res = await api.post('/request', requestData);
      logger.info('DB request submitted successfully', { response: res.data });
      
      setDbRequest({ usuario: '', modulo: '', transicion: '', prompt_request: '' });
      setModel('');
      
      // Si se recibió un ID, generar la respuesta automáticamente
      if (res.data && res.data.id) {
        const requestId = res.data.id;
        logger.info('Auto-generating response for ID', { id: requestId, prompt: requestData.prompt_request, model: requestData.model });
        
        try {
          // Generar la respuesta automáticamente
          const generateRes = await api.post('/generate', { prompt: requestData.prompt_request, model: requestData.model, id: requestId });
          logger.info('Auto-generate response received', { status: generateRes.status, response: generateRes.data });
          
          // Esperar un momento para que la base de datos se actualice
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Refrescar la tabla para mostrar la respuesta
          await fetchQueue();
          
          // Verificar múltiples veces si la respuesta se cargó correctamente
          const checkResponse = async (attempt: number = 1) => {
            try {
              const timestamp = Date.now();
              const queueRes = await api.get(`/requests?t=${timestamp}`, {
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                }
              });
              
              if (queueRes.data && Array.isArray(queueRes.data)) {
                const newItem = queueRes.data.find((item: any) => item.ID === requestId);
                logger.info(`Checking response for ID ${requestId} (attempt ${attempt})`, { 
                  found: !!newItem, 
                  hasResponse: !!(newItem && newItem.PROMPT_RESPONSE),
                  isCompleted: newItem?.FLAG_COMPLETADO === 1,
                  response: newItem?.PROMPT_RESPONSE 
                });
                
                if (newItem && newItem.PROMPT_RESPONSE && newItem.FLAG_COMPLETADO === 1) {
                  setRowResponses(prev => ({ ...prev, [requestId]: newItem.PROMPT_RESPONSE }));
                  logger.info('Auto-updated row response for ID', { id: requestId, response: newItem.PROMPT_RESPONSE });
                  return true; // Success
                }
              }
              
              // If not found and we haven't tried too many times, try again
              if (attempt < 5) {
                logger.info(`Response not ready for ID ${requestId}, retrying in 1 second (attempt ${attempt})`);
                setTimeout(() => checkResponse(attempt + 1), 1000);
              } else {
                logger.warn(`Response not found for ID ${requestId} after ${attempt} attempts`);
              }
            } catch (err) {
              logger.error('Error checking response', { error: err, attempt });
            }
          };
          
          // Start checking for response
          checkResponse();
          
        } catch (generateErr: any) {
          logger.error('Error in auto-generate', { error: generateErr.message, status: generateErr.response?.status });
          // Aún así, refrescar la tabla para mostrar la solicitud creada
          await fetchQueue();
        }
      } else {
        logger.warn('No ID received from request, skipping auto-generate', { response: res.data });
        await fetchQueue();
      }
    } catch (err: any) {
      logger.error('Error submitting DB request', { error: err.message, status: err.response?.status });
      setError(`Error al enviar request: ${err.message}`);
    }
    setLoading(false);
  };

  const handleOllamaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.info('Submitting Ollama request', { prompt: ollamaPrompt });
    setLoading(true);
    setError(null);
    
    try {
      logger.info('Sending POST to /api/generate', { prompt: ollamaPrompt });
      const res = await api.post('/generate', { prompt: ollamaPrompt });
      logger.info('Ollama response received', { status: res.status, responseLength: res.data?.response?.length });
      
      // Asegurar que la respuesta sea siempre una cadena de texto y sea serializable
      let responseText = '';
      try {
        if (res.data && res.data.response) {
          responseText = typeof res.data.response === 'string' ? res.data.response : String(res.data.response);
        } else if (res.data) {
          responseText = typeof res.data === 'string' ? res.data : String(res.data);
        } else {
          responseText = 'No se recibió respuesta';
        }
      } catch (serializeErr) {
        logger.error('Error serializing response', { error: serializeErr, data: res.data });
        responseText = 'Error al procesar la respuesta';
      }
      
      setOllamaResponse(responseText);
    } catch (err: any) {
      logger.error('Error submitting Ollama request', { error: err.message, status: err.response?.status });
      setOllamaResponse(`Error: ${err.message}`);
      setError(`Error al enviar a Ollama: ${err.message}`);
    }
    setLoading(false);
  };

  const handleFetchOllamaModels = async () => {
    logger.info('Fetching Ollama models');
    try {
      const res = await api.get('/tags');
      logger.info('Ollama models response received', { status: res.status, models: res.data?.models, dataType: typeof res.data });
      
      // Validar que res.data.models sea un array y asegurar que sea serializable
      if (res.data && Array.isArray(res.data.models)) {
        // Asegurar que todos los modelos sean serializables y tengan la estructura correcta
        const safeModels = res.data.models.map((model: any) => ({
          name: getModelName(model),
          model: typeof model === 'object' && model.model ? String(model.model) : getModelName(model),
          size: typeof model === 'object' && model.size ? Number(model.size) || 0 : 0,
          digest: typeof model === 'object' && model.digest ? String(model.digest) : '',
          modified_at: typeof model === 'object' && model.modified_at ? String(model.modified_at) : ''
        }));
        setOllamaModels(safeModels);
        setShowOllamaModels(true);
        setError(null);
      } else {
        logger.error('Ollama models response is not valid', { data: res.data });
        setOllamaModels([]);
        setError('Error: La respuesta de modelos de Ollama no es válida');
      }
    } catch (err: any) {
      logger.error('Error fetching Ollama models', { error: err.message, status: err.response?.status });
      setOllamaModels([]);
      setError(`Error al obtener modelos de Ollama: ${err.message}`);
    }
  };

  const handleReadRow = async (item: PromptQueueItem) => {
    // Si ya hay respuesta, no hacer nada
    if (item.PROMPT_RESPONSE) return;
    setRowResponses(prev => ({ ...prev, [item.ID]: 'Cargando...' }));
    try {
      const res = await api.post('/generate', { prompt: item.PROMPT_REQUEST, model: item.MODEL, id: item.ID });
      let responseText = '';
      try {
        if (res.data && res.data.response) {
          responseText = typeof res.data.response === 'string' ? res.data.response : String(res.data.response);
        } else if (res.data) {
          responseText = typeof res.data === 'string' ? res.data : String(res.data);
        } else {
          responseText = 'No se recibió respuesta';
        }
      } catch (serializeErr) {
        logger.error('Error serializing response in handleReadRow', { error: serializeErr, data: res.data });
        responseText = 'Error al procesar la respuesta';
      }
      setRowResponses(prev => ({ ...prev, [item.ID]: responseText }));
    } catch (err: any) {
      setRowResponses(prev => ({ ...prev, [item.ID]: `Error: ${err.message}` }));
    }
  };

  logger.debug('App render state', { 
    queueLength: queue.length, 
    modelsLength: models.length, 
    loading, 
    error: error || null,
    isInitialized
  });

  // Si no está inicializado, mostrar loading
  if (!isInitialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Inicializando Oracle AI Bridge...</h2>
        <p>Conectando con los servicios...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ maxWidth: 900, margin: 'auto', padding: 24 }}>
        <h1>Oracle AI Bridge</h1>
        
        {error && (
          <div style={{ 
            backgroundColor: '#ffebee', 
            color: '#c62828', 
            padding: '12px', 
            marginBottom: '16px', 
            borderRadius: '4px',
            border: '1px solid #ef5350'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 32 }}>
          <form onSubmit={handleDbRequest} style={{ flex: 1 }}>
            <h2>New Request using DB</h2>
            <input placeholder="Usuario" value={dbRequest.usuario} onChange={e => setDbRequest({ ...dbRequest, usuario: e.target.value })} required />
            <input placeholder="Modulo" value={dbRequest.modulo} onChange={e => setDbRequest({ ...dbRequest, modulo: e.target.value })} required />
            <input placeholder="Transicion" value={dbRequest.transicion} onChange={e => setDbRequest({ ...dbRequest, transicion: e.target.value })} required />
            <textarea placeholder="Prompt Request" value={dbRequest.prompt_request} onChange={e => setDbRequest({ ...dbRequest, prompt_request: e.target.value })} required />
            <label>
              Modelo:
              <select 
                value={model} 
                onChange={e => setModel(e.target.value)}
                onClick={async () => {
                  if (models.length === 0) {
                    logger.info('Model selector clicked, fetching models...');
                    await fetchModels();
                  }
                }}
              >
                <option value="">(Por defecto)</option>
                {Array.isArray(models) && models.map((modelName: any, idx: number) => {
                  // Ensure we never render objects
                  const displayName = typeof modelName === 'string' ? modelName : 
                                    typeof modelName === 'object' && modelName !== null ? 
                                    (modelName.name || modelName.model || String(modelName)) : 
                                    String(modelName || '');
                  
                  const value = typeof modelName === 'string' ? modelName : 
                               typeof modelName === 'object' && modelName !== null ? 
                               (modelName.name || modelName.model || '') : 
                               String(modelName || '');
                  
                  return (
                    <option key={displayName || idx} value={value}>
                      {displayName}
                    </option>
                  );
                })}
              </select>
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar a DB'}
            </button>
          </form>
          <form onSubmit={handleOllamaSubmit} style={{ flex: 1 }}>
            <h2>New Request using Ollama service</h2>
            <textarea placeholder="Prompt" value={ollamaPrompt} onChange={e => setOllamaPrompt(e.target.value)} required />
            <button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar a Ollama'}
            </button>
            <div><b>Respuesta:</b><br />{String(ollamaResponse || '')}</div>
          </form>
        </div>
        <div style={{ margin: '24px 0' }}>
          <button onClick={handleFetchOllamaModels}>Ver modelos instalados en Ollama</button>
          <button onClick={fetchModels} style={{ marginLeft: '10px' }}>Test fetchModels</button>
          {showOllamaModels && (
            <div>
              <h3>Modelos instalados en Ollama:</h3>
              <ul>
                {!Array.isArray(ollamaModels) || ollamaModels.length === 0 ? (
                  <li>No hay modelos instalados.</li>
                ) : (
                  ollamaModels.map((model: OllamaModel, idx: number) => (
                    <li key={model.name || idx}>
                      <strong>{model.name}</strong>
                      {model.size > 0 && ` (${Math.round(model.size / 1024 / 1024 / 1024 * 100) / 100} GB)`}
                      {model.modified_at && ` - Última modificación: ${model.modified_at}`}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
        <h2 style={{ marginTop: 40 }}>Prompt Queue ({queue.length} items)</h2>
        {/* Debug info */}
        <div style={{ fontSize: '12px', color: 'gray', marginBottom: '10px' }}>
          Debug: Queue length: {queue.length} | RowResponses keys: {Object.keys(rowResponses).join(', ')}
        </div>
        <table border={1} cellPadding={6} style={{ width: '100%', marginTop: 12 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Modulo</th>
              <th>Transicion</th>
              <th>Status</th>
              <th>Request</th>
              <th>Response</th>
              <th>Leer</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(queue) && queue.length > 0 ? (
              queue.map((item, idx) => (
                <tr key={item.ID ?? idx}>
                  <td>{String(item.ID || '')}</td>
                  <td>{String(item.USUARIO || '')}</td>
                  <td>{String(item.MODULO || '')}</td>
                  <td>{String(item.TRANSICION || '')}</td>
                  <td>{item.FLAG_COMPLETADO === 1 ? 'Completado' : 'Pendiente'}</td>
                  <td>{String(item.PROMPT_REQUEST || '')}</td>
                  <td>{(() => {
                    const response = rowResponses[item.ID] !== undefined ? rowResponses[item.ID] : (item.PROMPT_RESPONSE || '');
                    // Handle any remaining [LOB Object] strings or CLOB objects
                    if (response === '[LOB Object]' || response === '[Error converting CLOB]') {
                      return 'Respuesta disponible (CLOB)';
                    }
                    // Check if it's a CLOB object
                    if (response && typeof response === 'object' && (response as any)._length) {
                      return `Respuesta disponible (${(response as any)._length} caracteres)`;
                    }
                    // Log for debugging
                    if (item.ID === 27) {
                      console.log('Rendering ID 27:', { 
                        rowResponses: rowResponses[item.ID], 
                        itemResponse: item.PROMPT_RESPONSE, 
                        finalResponse: response 
                      });
                    }
                    return String(response);
                  })()}</td>
                  <td>
                    <button onClick={() => handleReadRow(item)}>
                      Leer
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#666' }}>
                  No hay elementos en la cola
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ErrorBoundary>
  );
};

export default App; 