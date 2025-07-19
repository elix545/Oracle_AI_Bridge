import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

  const fetchQueue = async () => {
    try {
      const res = await axios.get('/api/request');
      setQueue(res.data.rows || []);
    } catch {}
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/request', dbRequest);
      setDbRequest({ usuario: '', modulo: '', transicion: '', prompt_request: '' });
      fetchQueue();
    } catch {}
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

  return (
    <div style={{ maxWidth: 900, margin: 'auto', padding: 24 }}>
      <h1>Oracle AI Bridge</h1>
      <div style={{ display: 'flex', gap: 32 }}>
        <form onSubmit={handleDbSubmit} style={{ flex: 1 }}>
          <h2>New Request using DB</h2>
          <input placeholder="Usuario" value={dbRequest.usuario} onChange={e => setDbRequest({ ...dbRequest, usuario: e.target.value })} required />
          <input placeholder="Modulo" value={dbRequest.modulo} onChange={e => setDbRequest({ ...dbRequest, modulo: e.target.value })} required />
          <input placeholder="Transicion" value={dbRequest.transicion} onChange={e => setDbRequest({ ...dbRequest, transicion: e.target.value })} required />
          <textarea placeholder="Prompt Request" value={dbRequest.prompt_request} onChange={e => setDbRequest({ ...dbRequest, prompt_request: e.target.value })} required />
          <button type="submit" disabled={loading}>Enviar a DB</button>
        </form>
        <form onSubmit={handleOllamaSubmit} style={{ flex: 1 }}>
          <h2>New Request using Ollama service</h2>
          <textarea placeholder="Prompt" value={ollamaPrompt} onChange={e => setOllamaPrompt(e.target.value)} required />
          <button type="submit" disabled={loading}>Enviar a Ollama</button>
          <div><b>Respuesta:</b><br />{ollamaResponse}</div>
        </form>
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