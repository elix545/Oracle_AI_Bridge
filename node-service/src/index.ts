import express from 'express';
import oracledb from 'oracledb';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({
  path: fs.existsSync(path.resolve(__dirname, '../.env')) ? path.resolve(__dirname, '../.env') : undefined
});

const app = express();
app.use(express.json());

const ORACLE_USER = process.env.ORACLE_USER || 'system';
const ORACLE_PASSWORD = process.env.ORACLE_PASSWORD || 'oracle';
const ORACLE_CONNECT_STRING = process.env.ORACLE_CONNECT_STRING || 'oracle-xe:1521/XE';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';

async function getOracleConnection() {
  return await oracledb.getConnection({
    user: ORACLE_USER,
    password: ORACLE_PASSWORD,
    connectString: ORACLE_CONNECT_STRING
  });
}

app.post('/api/request', async (req, res) => {
  const { usuario, modulo, transicion, prompt_request } = req.body;
  try {
    const conn = await getOracleConnection();
    const result = await conn.execute(
      `BEGIN :id := INSERT_PROMPT_REQUEST(:usuario, :modulo, :transicion, :prompt_request); END;`,
      {
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        usuario,
        modulo,
        transicion,
        prompt_request
      }
    );
    await conn.commit();
    await conn.close();
    res.json({ id: result.outBinds.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/request', async (req, res) => {
  const timeout = parseInt(req.query.timeout as string) || 10;
  try {
    const conn = await getOracleConnection();
    const result = await conn.execute(
      `DECLARE
         cur SYS_REFCURSOR;
       BEGIN
         cur := READ_PROMPT_REQUEST(:timeout);
         OPEN :outcur FOR SELECT * FROM TABLE(cur);
       END;`,
      {
        timeout,
        outcur: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR }
      }
    );
    const rows = await result.outBinds.outcur.getRows();
    await conn.close();
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ollama', async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: 'llama3:8b',
      prompt
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Node service listening on port ${PORT}`);
}); 