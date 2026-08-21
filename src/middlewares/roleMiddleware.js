// src/middlewares/roleMiddleware.js
const restrictTo = (...rolesPermitidos) => {
  return (req, res, next) => {
    // req.user viene inyectado por el authMiddleware tras verificar el JWT
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        status: 'fail',
        mensaje: 'No tienes permisos suficientes para realizar esta acción',
      });
    }
    next();
  };
};

module.exports = restrictTo;