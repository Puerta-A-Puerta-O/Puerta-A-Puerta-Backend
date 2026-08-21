// src/validators/orderValidator.js
const { body, param } = require('express-validator');

const validateCreateOrder = [
  body('localId')
    .isUUID().withMessage('El ID del local debe ser un UUID válido'),
  body('direccionEntrega')
    .trim()
    .notEmpty().withMessage('La dirección de entrega es obligatoria')
    .isLength({ min: 5 }).withMessage('La dirección debe tener al menos 5 caracteres'),
  body('latitud')
    .isFloat({ min: -90, max: 90 }).withMessage('La latitud debe ser un número válido entre -90 y 90'),
  body('longitud')
    .isFloat({ min: -180, max: 180 }).withMessage('La longitud debe ser un número válido entre -180 y 180'),
  body('montoTotal')
    .isFloat({ gt: 0 }).withMessage('El monto total debe ser un número mayor a 0'),
];

const validateChangeStatus = [
  param('pedidoId')
    .isUUID().withMessage('El ID del pedido en la URL debe ser un UUID válido'),
  body('estado')
    .isIn([
      'creado',
      'confirmado',
      'en_preparacion',
      'listo_para_retirar',
      'en_camino',
      'entregado',
      'cancelado',
    ])
    .withMessage('El estado especificado no es un estado operativo válido'),
];

module.exports = {
  validateCreateOrder,
  validateChangeStatus,
};