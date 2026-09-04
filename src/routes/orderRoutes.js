// src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { validateCreateOrder, validateChangeStatus } = require('../validators/orderValidator');
const { checkDeliveryCoverage } = require('../middlewares/coverageMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticateJWT);

/**
 * @swagger
 * /pedidos:
 *   get:
 *     summary: Obtener el historial de pedidos (filtrado por clienteId, localId o por token)
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clienteId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de pedidos devuelta con éxito
 */
router.get(
  '/',
  orderController.getOrders.bind(orderController)
);

/**
 * @swagger
 * /pedidos:
 *   post:
 *     summary: Crear un nuevo pedido
 *     tags: [Pedidos]
 */
router.post(
  '/', 
  validateCreateOrder, 
  checkDeliveryCoverage, 
  validateRequest, 
  orderController.createOrder.bind(orderController)
);

/**
 * @swagger
 * /pedidos/{pedidoId}:
 *   get:
 *     summary: Obtener el detalle de un pedido por ID
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalle del pedido devuelto exitosamente
 *       404:
 *         description: Pedido no encontrado
 */
router.get(
  '/:pedidoId',
  orderController.getOrderById.bind(orderController)
);

router.get(
  '/:pedidoId/tracking',
  orderController.getTrackingHistory.bind(orderController)
);

router.patch(
  '/:pedidoId/estado',
  authorizeRoles('admin', 'admin_local', 'local', 'repartidor'),
  validateChangeStatus,
  validateRequest,
  orderController.changeStatus.bind(orderController)
);

module.exports = router;