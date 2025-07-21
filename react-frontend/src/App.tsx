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
  const [dbRequest, setDbRequest] = useState({ usuario: '', modulo: '', transicion: '', prompt_request: '' });
  const [ollamaPrompt, setOllamaPrompt] = useState('');
  const [ollamaResponse, setOllamaResponse] = useState('');
  const [queue, setQueue] = useState<PromptQueueItem[]>([]);
  const [rowResponses, setRowResponses] = useState<{ [id: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [showOllamaModels, setShowOllamaModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  logger.info('App component initialized');

  const fetchQueue = async () => {
    logger.info('Fetching queue from /api/requests');
    try {
      const res = await api.get('/requests');
      logger.info('Queue response received', { 
        status: res.status, 
        dataLength: res.data?.length, 
        dataType: typeof res.data,
        data: res.data 
      });
      // Corregir mapeo: si es array de arrays, mapear a objetos con claves
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
            keys.forEach((k, i) => { obj[k] = arr[i]; });
            return obj;
          });
        } else {
          // Si ya es array de objetos
          rows = res.data;
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
    logger.info('Fetching models from /api/tags');
    try {
      const res = await api.get('/tags');
      logger.info('Models response received', { 
        status: res.status, 
        models: res.data?.models, 
        dataType: typeof res.data,
        data: res.data 
      });
      
      // Validar que res.data.models sea un array
      if (res.data && Array.isArray(res.data.models)) {
        setModels(res.data.models);
        setError(null);
      } else {
        logger.error('Models response is not valid', { data: res.data });
        setModels([]);
        setError('Error: La respuesta de modelos no es válida');
      }
    } catch (err: any) {
      logger.error('Error fetching models', { error: err.message, status: err.response?.status });
      setModels([]);
      setError(`Error al obtener modelos: ${err.message}`);
    }
  };

  useEffect(() => {
    logger.info('App useEffect triggered - initializing component');
    
    const initializeApp = async () => {
      try {
        // Fetch initial data
        await Promise.all([fetchQueue(), fetchModels()]);
        setIsInitialized(true);
        logger.info('App initialization completed successfully');
      } catch (err: any) {
        logger.error('Error during app initialization', { error: err.message });
        setError(`Error durante la inicialización: ${err.message}`);
      }
    };
    
    initializeApp();
    
    // Set up polling interval
    const interval = setInterval(() => {
      logger.debug('Polling queue - interval triggered');
      fetchQueue();
    }, 5000);
    
    logger.info('Polling interval set up for queue updates');
    
    return () => {
      logger.info('Cleaning up interval');
      clearInterval(interval);
    };
  }, []);

  // Mostrar automáticamente los responses ya procesados en la tabla
  useEffect(() => {
    if (Array.isArray(queue) && queue.length > 0) {
      setRowResponses(prev => {
        const updated: { [id: number]: string } = { ...prev };
        queue.forEach(item => {
          if (item.PROMPT_RESPONSE && !updated[item.ID]) {
            updated[item.ID] = item.PROMPT_RESPONSE;
          }
        });
        return updated;
      });
    }
  }, [queue]);

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
      logger.info('DB request submitted successfully');
      
      setDbRequest({ usuario: '', modulo: '', transicion: '', prompt_request: '' });
      setModel('');
      fetchQueue();

      // Si se recibió un ID, generar la respuesta automáticamente
      if (res.data && res.data.id) {
        await api.post('/generate', { prompt: requestData.prompt_request, model: requestData.model, id: res.data.id });
        fetchQueue(); // Refrescar la tabla para mostrar la respuesta
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
      
      // Asegurar que la respuesta sea siempre una cadena de texto
      let responseText = '';
      if (res.data && res.data.response) {
        responseText = typeof res.data.response === 'string' ? res.data.response : JSON.stringify(res.data.response);
      } else if (res.data) {
        responseText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      } else {
        responseText = 'No se recibió respuesta';
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
      
      // Validar que res.data.models sea un array
      if (res.data && Array.isArray(res.data.models)) {
        setOllamaModels(res.data.models);
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
      if (res.data && res.data.response) {
        responseText = typeof res.data.response === 'string' ? res.data.response : JSON.stringify(res.data.response);
      } else if (res.data) {
        responseText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      } else {
        responseText = 'No se recibió respuesta';
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
              <select value={model} onChange={e => setModel(e.target.value)}>
                <option value="">(Por defecto)</option>
                {Array.isArray(models) && models.map((m: any, idx: number) => {
                  const key = typeof m === 'string' ? m : m.model || m.name || idx;
                  const value = typeof m === 'string' ? m : m.model || m.name || '';
                  const label = typeof m === 'string' ? m : m.name || m.model || JSON.stringify(m);
                  return (
                    <option key={key} value={value}>
                      {label}
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
            <div><b>Respuesta:</b><br />{typeof ollamaResponse === 'string' ? ollamaResponse : JSON.stringify(ollamaResponse)}</div>
          </form>
        </div>
        <div style={{ margin: '24px 0' }}>
          <button onClick={handleFetchOllamaModels}>Ver modelos instalados en Ollama</button>
          {showOllamaModels && (
            <div>
              <h3>Modelos instalados en Ollama:</h3>
              <ul>
                {!Array.isArray(ollamaModels) || ollamaModels.length === 0 ? (
                  <li>No hay modelos instalados.</li>
                ) : (
                  ollamaModels.map((m: any, idx: number) => (
                    <li key={m.model || m.name || idx}>
                      {typeof m === 'string' ? m : m.name || m.model || JSON.stringify(m)}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
        <h2 style={{ marginTop: 40 }}>Prompt Queue ({queue.length} items)</h2>
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
                  <td>{item.ID}</td>
                  <td>{item.USUARIO}</td>
                  <td>{item.MODULO}</td>
                  <td>{item.TRANSICION}</td>
                  <td>{item.FLAG_COMPLETADO === 1 ? 'Completado' : 'Pendiente'}</td>
                  <td>{item.PROMPT_REQUEST}</td>
                  <td>{rowResponses[item.ID] !== undefined ? rowResponses[item.ID] : item.PROMPT_RESPONSE}</td>
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