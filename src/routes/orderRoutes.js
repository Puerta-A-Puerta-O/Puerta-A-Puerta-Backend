// src/routes/orderRoutes.js
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
 * /pedidos:
 *   post:
 *     summary: Crear un nuevo pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [localId, direccionEntrega, longitud, latitud, items]
 *             properties:
 *               localId:
 *                 type: string
 *                 format: uuid
 *               direccionEntrega:
 *                 type: string
 *               longitud:
 *                 type: number
 *               latitud:
 *                 type: number
 *               notas:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productoId, cantidad]
 *                   properties:
 *                     productoId:
 *                       type: string
 *                       format: uuid
 *                     cantidad:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Pedido creado con éxito
 *       400:
 *         description: Datos de entrada inválidos o fuera de área de cobertura
 *       401:
 *         description: No autorizado
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
 *     summary: Obtener el detalle de un pedido
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
 *         description: Detalle del pedido obtenido con éxito
 *       404:
 *         description: Pedido no encontrado
 */
router.get(
  '/:pedidoId',
  orderController.getOrderById ? orderController.getOrderById.bind(orderController) : (req, res) => res.sendStatus(501)
);

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