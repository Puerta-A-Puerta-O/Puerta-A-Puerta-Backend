// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'fail', error: 'Acceso denegado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ status: 'fail', error: 'Token inválido o expirado' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.rol || req.user?.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({ status: 'fail', message: 'No tienes permisos suficientes' });
    }
    return next();
  };
};

module.exports = {
  authenticateJWT,
  authorizeRoles,
};
