// Winston no soporta oficialmente el navegador, así que creamos un wrapper simple
// que puede ser reemplazado por winston-browser si se requiere

const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
};

export default logger; 