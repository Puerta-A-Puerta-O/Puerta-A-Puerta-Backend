// src/config/logger.js
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'puerta-a-puerta-backend' },
  transports: [
    // Guardar logs de nivel 'error' en archivo separado
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Guardar todos los logs (info, warn, error)
    new transports.File({ filename: 'logs/combined.log' })
  ]
});

// Si no estamos en producción, también imprimimos en consola con colores
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, stack }) => {
          return `${timestamp} [${level}]: ${stack || message}`;
        })
      )
    })
  );
}

module.exports = logger;