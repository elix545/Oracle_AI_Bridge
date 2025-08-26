// Configuration file for the frontend
export const config = {
  // API Configuration
  api: {
    baseURL: import.meta.env.DEV ? '/api' : 'http://localhost:3001/api',
    timeout: 300000, // 5 minutes
  },
  
  // Polling Configuration
  polling: {
    interval: 15000, // 15 seconds - increased significantly
    cacheTime: 10000, // 10 seconds cache - increased significantly
    maxRetries: 3,
    emptyQueueInterval: 30000, // 30 seconds when queue is empty
    rateLimitBackoff: 60000, // 60 seconds after rate limit
    maxConcurrentRequests: 1, // Only allow 1 request at a time
    disablePollingWhenEmpty: true, // Completely disable polling when queue is empty
  },
  
  // Rate Limiting
  rateLimit: {
    maxRequestsPerMinute: 30,
  },
  
  // UI Configuration
  ui: {
    maxQueueItems: 50,
    refreshButtonText: 'Refrescar',
    loadingText: 'Refrescando...',
  },
  
  // Logging Configuration
  logging: {
    level: import.meta.env.DEV ? 'debug' : 'info',
  },
};

export default config;
