# Changelog - Oracle AI Bridge

## [2.0.0] - 2025-07-20

### Added
- **Nuevo usuario Oracle `middleware`**: Usuario dedicado con privilegios mínimos para la aplicación
- **Modo Thick de node-oracledb**: Configuración para compatibilidad con Oracle 11g
- **Oracle Instant Client**: Incluido en el contenedor node-service para conexión Thick
- **Documentación completa**: README.md actualizado y nuevo archivo MIDDLEWARE_USER.md

### Changed
- **Script de inicialización Oracle**: `oracle/scripts/init.sql` actualizado para crear usuario middleware
- **Configuración de conexión**: Node.js service configurado para usar usuario middleware
- **Dockerfile node-service**: Actualizado para incluir Oracle Instant Client
- **Variables de entorno**: Configuradas para usar middleware en lugar de SYSTEM

### Fixed
- **Error NJS-138**: Resuelto el problema de compatibilidad con Oracle 11g usando modo Thick
- **Conexión Oracle**: Mejorada la estabilidad de la conexión con configuración optimizada
- **Seguridad**: Implementado principio de menor privilegio con usuario dedicado

### Technical Details

#### Oracle Database Changes
- **Usuario**: `middleware` (en lugar de `SYSTEM`)
- **Contraseña**: `oracle`
- **Esquema**: Todos los objetos en `middleware.*`
- **Privilegios**: CONNECT, RESOURCE, CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE PROCEDURE, UNLIMITED TABLESPACE

#### Node.js Service Changes
- **Conexión**: Modo Thick con Oracle Instant Client
- **Usuario**: `middleware`
- **Configuración**: `oracledb.initOracleClient()`
- **Pool**: Configuración optimizada para Oracle 11g

#### Docker Changes
- **Base image**: `node:20-slim` (en lugar de `node:20-alpine`)
- **Oracle Instant Client**: Descargado e instalado automáticamente
- **Environment variables**: Configuradas para middleware

### Migration Notes
- **Automática**: No requiere migración de datos existentes
- **Backward compatibility**: Mantiene la misma API REST
- **Clean installation**: Recomendado reiniciar completamente para usar el nuevo usuario

### Testing
- ✅ Conexión Oracle funciona correctamente
- ✅ Inserción de registros en `middleware.PROMPT_QUEUE`
- ✅ Consulta de registros desde API REST
- ✅ Compatibilidad con Oracle 11g verificada
- ✅ Modo Thick funcionando sin errores NJS-138

---

## [1.0.0] - 2025-07-19

### Initial Release
- Oracle XE 11g integration
- Ollama llama3:8b integration
- Node.js REST API
- React frontend
- Basic queue management system 