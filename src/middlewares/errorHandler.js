// src/middlewares/errorHandler.js
const logger = require('../config/logger');

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // 1. Logging Estructurado con Winston
  logger.error(`${err.statusCode} - ${err.message} - [${req.method} ${req.url}] - IP: ${req.ip}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  // 2. Manejo de errores específicos de PostgreSQL
  if (err.code === '23505') {
    // Violación de restricción UNIQUE (ej. email duplicado)
    return res.status(409).json({
      status: 'fail',
      mensaje: 'El registro ya existe en el sistema',
    });
  }

  if (err.code === '22P02') {
    // Sintaxis inválida en PostgreSQL (ej. UUID o ID malformado)
    return res.status(400).json({
      status: 'fail',
      mensaje: 'Formato de parámetro o identificador inválido',
    });
  }

  // 3. Respuesta estandarizada al cliente
  res.status(err.statusCode).json({
    status: err.status,
    mensaje: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};