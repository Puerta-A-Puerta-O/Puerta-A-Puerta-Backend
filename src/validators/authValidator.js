// src/validators/authValidator.js
const { body } = require('express-validator');

const ROLES_PUBLICOS = ['cliente', 'repartidor'];

const validateRegister = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede superar 100 caracteres'),
  body('email')
    .trim()
    .isEmail().withMessage('El email no es válido')
    .normalizeEmail(),
  body('telefono')
    .trim()
    .notEmpty().withMessage('El teléfono es obligatorio')
    .isLength({ max: 30 }).withMessage('El teléfono no puede superar 30 caracteres'),
  body('password')
    .isLength({ min: 8, max: 72 }).withMessage('La contraseña debe tener entre 8 y 72 caracteres'),
  body('rol')
    .optional()
    .isIn(ROLES_PUBLICOS)
    .withMessage(`El rol debe ser uno de: ${ROLES_PUBLICOS.join(', ')}`),
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('El email no es válido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es obligatoria'),
];

module.exports = {
  ROLES_PUBLICOS,
  validateRegister,
  validateLogin,
};
