// Configuration file for the frontend
export const config = {
  // API Configuration
  api: {
    baseURL: import.meta.env.DEV ? '/api' : 'http://localhost:3001/api',
    timeout: 300000, // 5 minutes
  },
  
  // Polling Configuration
  polling: {
    interval: parseInt(import.meta.env.VITE_POLLING_INTERVAL || '15000'), // 15 seconds default
    cacheTime: parseInt(import.meta.env.VITE_POLLING_CACHE_TIME || '10000'), // 10 seconds cache default
    maxRetries: parseInt(import.meta.env.VITE_POLLING_MAX_RETRIES || '3'), // 3 retries default
    emptyQueueInterval: parseInt(import.meta.env.VITE_POLLING_EMPTY_QUEUE_INTERVAL || '30000'), // 30 seconds when queue is empty
    rateLimitBackoff: parseInt(import.meta.env.VITE_POLLING_RATE_LIMIT_BACKOFF || '60000'), // 60 seconds after rate limit
    maxConcurrentRequests: parseInt(import.meta.env.VITE_POLLING_MAX_CONCURRENT_REQUESTS || '1'), // Only allow 1 request at a time
    disablePollingWhenEmpty: import.meta.env.VITE_POLLING_DISABLE_WHEN_EMPTY !== 'false', // true by default
  },
  
  // Rate Limiting
  rateLimit: {
    maxRequestsPerMinute: parseInt(import.meta.env.VITE_RATE_LIMIT_MAX_REQUESTS_PER_MINUTE || '30'), // 30 requests per minute default
  },
  
  // UI Configuration
  ui: {
    maxQueueItems: parseInt(import.meta.env.VITE_UI_MAX_QUEUE_ITEMS || '50'), // 50 items default
    refreshButtonText: import.meta.env.VITE_UI_REFRESH_BUTTON_TEXT || 'Refrescar',
    loadingText: import.meta.env.VITE_UI_LOADING_TEXT || 'Refrescando...',
  },
  
  // Logging Configuration
  logging: {
    level: import.meta.env.VITE_LOGGING_LEVEL || (import.meta.env.DEV ? 'debug' : 'info'), // Configurable with fallback to DEV mode
  },
};

export default config;
