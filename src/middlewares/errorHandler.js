// src/middlewares/errorHandler.js
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Registrar error en la consola del servidor para auditoría
  console.error(`💥 Error [${req.method} ${req.url}]:`, err);

  // Manejo de errores específicos de PostgreSQL
  if (err.code === '23505') {
    // Violación de restricción UNIQUE (ej. email duplicado)
    return res.status(409).json({
      status: 'fail',
      mensaje: 'El registro ya existe en el sistema',
    });
  }

  if (err.code === '22P02') {
    // Sintaxis inválida en PostgreSQL (ej. UUID malformado directo en SQL)
    return res.status(400).json({
      status: 'fail',
      mensaje: 'Formato de parámetro o identificador inválido',
    });
  }

  // Respuesta al cliente
  res.status(err.statusCode).json({
    status: err.status,
    mensaje: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};