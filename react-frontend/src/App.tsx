import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logger from './logger';

interface PromptQueueItem {
  ID: number;
  MODULO: string;
  FLAG_COMPLETADO: number;
  PROMPT_REQUEST: string;
  PROMPT_RESPONSE: string;
}

const App: React.FC = () => {
  const [dbRequest, setDbRequest] = useState({ usuario: '', modulo: '', transicion: '', prompt_request: '' });
  const [ollamaPrompt, setOllamaPrompt] = useState('');
  const [ollamaResponse, setOllamaResponse] = useState('');
  const [queue, setQueue] = useState<PromptQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [showOllamaModels, setShowOllamaModels] = useState(false);

  const fetchQueue = async () => {
    try {
      const res = await axios.get('/api/requests');
      setQueue(res.data);
      logger.info('Cola de prompts actualizada', res.data);
    } catch (err) {
      logger.error('Error al obtener la cola de prompts', err);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Obtener modelos disponibles
    axios.get('/api/tags').then(res => {
      setModels(res.data.models || []);
    });
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDbRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/request', {
        ...dbRequest,
        model: model || undefined,
      });
      setDbRequest({ usuario: '', modulo: '', transicion: '', prompt_request: '' });
      setModel('');
      fetchQueue();
    } catch (err) {
      logger.error('Error al enviar request a la base de datos', err);
    }
    setLoading(false);
  };

  const handleOllamaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('/api/ollama', { prompt: ollamaPrompt });
      setOllamaResponse(res.data.response || JSON.stringify(res.data));
    } catch (err: any) {
      setOllamaResponse(err.message);
    }
    setLoading(false);
  };

  const handleFetchOllamaModels = async () => {
    try {
      const res = await axios.get('/api/tags');
      setOllamaModels(res.data.models || []);
      setShowOllamaModels(true);
      logger.info('Modelos instalados en Ollama:', res.data.models);
    } catch (err) {
      logger.error('Error al obtener modelos de Ollama', err);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: 'auto', padding: 24 }}>
      <h1>Oracle AI Bridge</h1>
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
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={loading}>Enviar a DB</button>
        </form>
        <form onSubmit={handleOllamaSubmit} style={{ flex: 1 }}>
          <h2>New Request using Ollama service</h2>
          <textarea placeholder="Prompt" value={ollamaPrompt} onChange={e => setOllamaPrompt(e.target.value)} required />
          <button type="submit" disabled={loading}>Enviar a Ollama</button>
          <div><b>Respuesta:</b><br />{ollamaResponse}</div>
        </form>
      </div>
      <div style={{ margin: '24px 0' }}>
        <button onClick={handleFetchOllamaModels}>Ver modelos instalados en Ollama</button>
        {showOllamaModels && (
          <div>
            <h3>Modelos instalados en Ollama:</h3>
            <ul>
              {ollamaModels.length === 0 && <li>No hay modelos instalados.</li>}
              {ollamaModels.map(m => <li key={m}>{m}</li>)}
            </ul>
          </div>
        )}
      </div>
      <h2 style={{ marginTop: 40 }}>Prompt Queue</h2>
      <table border={1} cellPadding={6} style={{ width: '100%', marginTop: 12 }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Module</th>
            <th>Status</th>
            <th>Request</th>
            <th>Response</th>
          </tr>
        </thead>
        <tbody>
          {queue.map(item => (
            <tr key={item.ID}>
              <td>{item.ID}</td>
              <td>{item.MODULO}</td>
              <td>{item.FLAG_COMPLETADO === 1 ? 'Completado' : 'Pendiente'}</td>
              <td>{item.PROMPT_REQUEST}</td>
              <td>{item.PROMPT_RESPONSE}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App; 