const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { validateCreateOrder, validateChangeStatus } = require('../validators/orderValidator');
const { checkDeliveryCoverage } = require('../middlewares/coverageMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

// Middleware global para proteger todas las rutas de pedidos
router.use(authenticateJWT);

/**
 * @swagger
 * /pedidos/{pedidoId}/tracking:
 *   get:
 *     summary: Obtiene el historial de ubicaciones GPS de un pedido
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
 *         description: Historial devuelto exitosamente
 *       401:
 *         description: No autorizado
 */
router.get(
  '/:pedidoId/tracking',
  orderController.getTrackingHistory.bind(orderController)
);

router.post(
  '/', 
  validateCreateOrder, 
  checkDeliveryCoverage, 
  validateRequest, 
  orderController.createOrder.bind(orderController)
);

/**
 * @swagger
 * /pedidos/{pedidoId}/estado:
 *   patch:
 *     summary: Actualiza el estado de un pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [creado, confirmado, en_preparacion, en_camino, entregado, cancelado]
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       400:
 *         description: Transición de estado inválida
 *       403:
 *         description: Permisos insuficientes
 */
router.patch(
  '/:pedidoId/estado',
  authorizeRoles('admin', 'admin_local', 'local', 'repartidor'),
  validateChangeStatus,
  validateRequest,
  orderController.changeStatus.bind(orderController)
);

module.exports = router;