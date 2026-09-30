const { body, param } = require('express-validator');

const validateCreateOrder = [
  body('localId').isUUID().withMessage('El ID del local debe ser un UUID válido'),
  body('direccionEntrega').trim().notEmpty().withMessage('La dirección de entrega es obligatoria').isLength({ min: 5 }),
  body('latitud').isFloat({ min: -90, max: 90 }),
  body('longitud').isFloat({ min: -180, max: 180 }),
  body('items').isArray({ min: 1 }),
  body('items.*.productoId').isUUID(),
  body('items.*.cantidad').isInt({ min: 1 }),
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
      'listo_para_entrega', // <-- Agregar para evitar el fallo de validación
      'en_camino',
      'entregado',
      'cancelado',
    ])
    .withMessage('El estado especificado no es un estado operativo válido'),
  body('repartidorId')
    .optional()
    .isUUID().withMessage('El ID del repartidor debe ser un UUID válido')
];

module.exports = {
  validateCreateOrder,
  validateChangeStatus,
};