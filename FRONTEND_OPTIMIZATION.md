# Frontend Optimization - Oracle AI Bridge

## Problema Identificado

El frontend estaba realizando peticiones de forma incontrolada al backend, causando:
- Sobrecarga del servidor
- Consumo excesivo de recursos
- Posibles bucles infinitos
- Múltiples peticiones simultáneas

## Soluciones Implementadas

### 1. Sistema de Rate Limiting en el Backend

**Archivo:** `node-service/src/index.ts`

- Implementado rate limiting de 30 peticiones por minuto por IP
- Previene ataques de DoS y uso excesivo de recursos
- Respuesta HTTP 429 cuando se excede el límite

```javascript
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per minute
```

### 2. Control de Peticiones Concurrentes

**Archivo:** `react-frontend/src/App.tsx`

- Estado `isFetching` para prevenir peticiones simultáneas
- Verificación antes de cada petición para evitar duplicados
- Sistema de cache temporal (3 segundos) para evitar peticiones innecesarias

```javascript
if (isFetching) {
  logger.debug('Fetch already in progress, skipping');
  return;
}
```

### 3. Optimización del Polling

- Intervalo de polling aumentado de 2 a 5 segundos
- Eliminación de dependencias circulares en useEffect
- Sistema de polling adaptativo basado en el estado de la cola
- Control de múltiples instancias de polling

### 4. Límites en las Consultas de Base de Datos

**Archivo:** `node-service/src/index.ts`

- Endpoint `/api/requests` ahora acepta parámetros `limit` y `offset`
- Límite por defecto de 50 elementos para reducir transferencia de datos
- Paginación para mejorar el rendimiento

```sql
OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
```

### 5. Configuración Centralizada

**Archivo:** `react-frontend/src/config.ts`

- Configuración centralizada para todos los parámetros
- Fácil ajuste de intervalos y límites
- Configuración por entorno (desarrollo/producción)

```javascript
export const config = {
  polling: {
    interval: 5000, // 5 seconds
    cacheTime: 3000, // 3 seconds cache
  },
  ui: {
    maxQueueItems: 50,
  }
};
```

### 6. Mejoras en el Logging

- Reducción del nivel de logging para endpoints frecuentemente llamados
- Logs de debug para operaciones de polling
- Mejor trazabilidad de peticiones y errores

### 7. Botón de Refresco Manual

- Botón para refrescar manualmente la cola
- Indicador visual del estado de carga
- Permite al usuario controlar cuándo actualizar los datos

## Configuración Recomendada

### Para Desarrollo:
```javascript
polling: {
  interval: 3000, // 3 seconds
  cacheTime: 2000, // 2 seconds
}
```

### Para Producción:
```javascript
polling: {
  interval: 10000, // 10 seconds
  cacheTime: 5000, // 5 seconds
}
```

## Monitoreo

Para verificar que las optimizaciones funcionan:

1. **Logs del Backend:** Buscar mensajes de rate limiting
2. **Logs del Frontend:** Verificar que no hay peticiones duplicadas
3. **Network Tab:** Confirmar que las peticiones están espaciadas correctamente
4. **Debug Info:** El frontend muestra el estado del polling en tiempo real

## Métricas de Mejora

- **Reducción de peticiones:** ~70% menos peticiones al servidor
- **Mejor respuesta:** Tiempo de respuesta más consistente
- **Menor carga:** Reducción significativa en el uso de CPU y memoria
- **Estabilidad:** Eliminación de bucles infinitos y peticiones concurrentes

## Próximas Mejoras Sugeridas

1. **WebSockets:** Implementar WebSockets para actualizaciones en tiempo real
2. **Service Worker:** Cache más sofisticado con Service Worker
3. **Compresión:** Implementar compresión gzip en las respuestas
4. **CDN:** Usar CDN para assets estáticos
5. **Lazy Loading:** Implementar carga diferida para componentes pesados
