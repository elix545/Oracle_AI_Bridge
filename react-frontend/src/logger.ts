// Winston no soporta oficialmente el navegador, así que creamos un wrapper simple
// que puede ser reemplazado por winston-browser si se requiere

const getTimestamp = () => new Date().toISOString();

const sendLogToServer = async (level: string, message: string, data?: any) => {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        data,
        timestamp: getTimestamp(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    });
  } catch (err) {
    // Silently fail if server is not available
  }
};

const logger = {
  info: (message: string, data?: any) => {
    const logMessage = `[INFO] ${getTimestamp()} - ${message}`;
    console.log(logMessage, data || '');
    sendLogToServer('info', message, data);
  },
  warn: (message: string, data?: any) => {
    const logMessage = `[WARN] ${getTimestamp()} - ${message}`;
    console.warn(logMessage, data || '');
    sendLogToServer('warn', message, data);
  },
  error: (message: string, error?: any) => {
    const logMessage = `[ERROR] ${getTimestamp()} - ${message}`;
    console.error(logMessage, error || '');
    sendLogToServer('error', message, error);
  },
  debug: (message: string, data?: any) => {
    const logMessage = `[DEBUG] ${getTimestamp()} - ${message}`;
    console.debug(logMessage, data || '');
    sendLogToServer('debug', message, data);
  },
};

export default logger; 