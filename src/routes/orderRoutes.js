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

/**
 * @swagger
 * /pedidos/{pedidoId}/tracking:
 *   get:
 *     summary: Obtener el historial de seguimiento (tracking) de un pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del pedido
 *     responses:
 *       200:
 *         description: Historial de transiciones e hitos de seguimiento obtenido con éxito
 *       404:
 *         description: Pedido no encontrado
 */
router.get(
  '/:pedidoId/tracking',
  orderController.getTrackingHistory.bind(orderController)
);

/**
 * @swagger
 * /pedidos/{pedidoId}/estado:
 *   patch:
 *     summary: Cambiar el estado de un pedido
 *     description: Avanza el estado del pedido cumpliendo con las reglas de la máquina de estados.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del pedido
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [confirmado, en_preparacion, listo_para_entrega, en_camino, entregado, cancelado]
 *                 example: en_camino
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *       400:
 *         description: Transición de estado no permitida
 *       403:
 *         description: El rol del usuario no está autorizado para realizar este cambio
 *       404:
 *         description: Pedido no encontrado
 */
router.patch(
  '/:pedidoId/estado',
  authorizeRoles('admin', 'admin_local', 'local', 'repartidor'),
  validateChangeStatus,
  validateRequest,
  orderController.changeStatus.bind(orderController)
);

/**
 * @swagger
 * /pedidos/{pedidoId}/ocultar:
 *   patch:
 *     summary: Ocultar pedido del historial (Soft Delete)
 *     description: Marca el pedido como oculto para la vista del usuario/historial sin eliminarlo de la base de datos.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del pedido a ocultar
 *     responses:
 *       200:
 *         description: Pedido ocultado exitosamente
 *       404:
 *         description: Pedido no encontrado
 */
router.patch(
  '/:pedidoId/ocultar',
  orderController.hideOrder.bind(orderController)
);

/**
 * @swagger
 * /pedidos/{pedidoId}/cancelar:
 *   patch:
 *     summary: Cancelar un pedido activo
 *     description: Cambia el estado del pedido a cancelado siempre que las reglas de negocio lo permitan.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del pedido a cancelar
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 example: "Cliente canceló antes del envío"
 *     responses:
 *       200:
 *         description: Pedido cancelado con éxito
 *       400:
 *         description: El pedido no puede ser cancelado en su estado actual
 *       404:
 *         description: Pedido no encontrado
 */
router.patch(
  '/:pedidoId/cancelar',
  orderController.cancelOrder.bind(orderController)
);

/**
 * @swagger
 * /pedidos/{pedidoId}:
 *   put:
 *     summary: Editar datos de un pedido (Dirección / Notas)
 *     description: Actualiza información de entrega o notas específicas de un pedido activo.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del pedido a modificar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               direccion:
 *                 type: string
 *                 example: "Av. Corrientes 5000, CABA"
 *               notas:
 *                 type: string
 *                 example: "Dejar en portería"
 *     responses:
 *       200:
 *         description: Pedido editado exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *       404:
 *         description: Pedido no encontrado
 */
router.put(
  '/:pedidoId',
  orderController.updateOrder.bind(orderController)
);

module.exports = router;