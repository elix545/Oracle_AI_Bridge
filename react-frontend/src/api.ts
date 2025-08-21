import axios from 'axios';
import logger from './logger';

// Configurar Axios para usar la URL correcta según el entorno
const baseURL = import.meta.env.DEV ? '/api' : 'http://localhost:3001/api';

const api = axios.create({
  baseURL: baseURL,
  timeout: 300000, // 5 minutos
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para logging de requests
api.interceptors.request.use(
  (config) => {
    logger.debug('API Request', { 
      method: config.method?.toUpperCase(), 
      url: config.url,
      data: config.data 
    });
    return config;
  },
  (error) => {
    logger.error('API Request Error', error);
    return Promise.reject(error);
  }
);

// Interceptor para logging de responses
api.interceptors.response.use(
  (response) => {
    logger.debug('API Response', { 
      status: response.status, 
      url: response.config.url,
      dataLength: response.data?.length || 'N/A'
    });
    return response;
  },
  (error) => {
    logger.error('API Response Error', { 
      message: error.message, 
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data 
    });
    return Promise.reject(error);
  }
);

export default api; 