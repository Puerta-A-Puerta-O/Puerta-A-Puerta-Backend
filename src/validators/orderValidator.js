// src/validators/orderValidator.js
const { body, param } = require('express-validator');

const validateCreateOrder = [
  body('localId')
    .isUUID().withMessage('El ID del local debe ser un UUID válido'), //[cite: 2]
  body('direccionEntrega')
    .trim()
    .notEmpty().withMessage('La dirección de entrega es obligatoria') //[cite: 2]
    .isLength({ min: 5 }).withMessage('La dirección debe tener al menos 5 caracteres'), //[cite: 2]
  body('latitud')
    .isFloat({ min: -90, max: 90 }).withMessage('La latitud debe ser un número válido entre -90 y 90'), //[cite: 2]
  body('longitud')
    .isFloat({ min: -180, max: 180 }).withMessage('La longitud debe ser un número válido entre -180 y 180'), //[cite: 2]
  body('items')
    .isArray({ min: 1 }).withMessage('Debe incluir al menos un producto en el pedido'), //[cite: 2]
  body('items.*.productoId')
    .isUUID().withMessage('El ID del producto debe ser un UUID válido'), //[cite: 2]
  body('items.*.cantidad')
    .isInt({ min: 1 }).withMessage('La cantidad del producto debe ser un entero mayor o igual a 1'), //[cite: 2]
];

const validateChangeStatus = [
  param('pedidoId')
    .isUUID().withMessage('El ID del pedido en la URL debe ser un UUID válido'), //[cite: 2]
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
    .withMessage('El estado especificado no es un estado operativo válido'), //[cite: 2]
  body('repartidorId')
    .optional()
    .isUUID().withMessage('El ID del repartidor debe ser un UUID válido')
];

module.exports = {
  validateCreateOrder,
  validateChangeStatus,
};