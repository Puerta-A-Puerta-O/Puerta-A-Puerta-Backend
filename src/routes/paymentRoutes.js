// src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /pagos/intent:
 *   post:
 *     summary: Crear intención de pago (Mercado Pago o Efectivo)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pedidoId, metodoPago]
 *             properties:
 *               pedidoId:
 *                 type: string
 *                 format: uuid
 *               metodoPago:
 *                 type: string
 *                 enum: [mercadopago, efectivo]
 *               efectivoPagaCon:
 *                 type: number
 *                 description: Requerido si metodoPago es efectivo
 *     responses:
 *       201:
 *         description: Intención de pago generada exitosamente
 */
router.post('/intent', authenticateJWT, paymentController.createPaymentIntent.bind(paymentController));

/**
 * @swagger
 * /pagos/webhook:
 *   post:
 *     summary: Webhook de notificación de pasarela de pago (Mercado Pago IPN)
 *     tags: [Pagos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferenceId:
 *                 type: string
 *               status:
 *                 type: string
 *               paymentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook recibido y procesado
 */
router.post('/webhook', paymentController.handleWebhook.bind(paymentController));


// En src/routes/paymentRoutes.js

/**
 * @swagger
 * /pagos/pedidos/{pedidoId}/qr:
 *   get:
 *     summary: Generar QR dinámico de cobro (Usado por Caja o Delivery)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payload del QR generado exitosamente
 */
router.get('/pedidos/:pedidoId/qr', authenticateJWT, paymentController.getPaymentQR.bind(paymentController));

/**
 * @swagger
 * /pagos/pedidos/{pedidoId}/confirmar-manual:
 *   post:
 *     summary: Confirmar cobro manual en puerta o mostrador (Efectivo/Transferencia)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [metodoPago]
 *             properties:
 *               metodoPago:
 *                 type: string
 *                 enum: [efectivo, qr_mostrador, transferencia_confirmada]
 *     responses:
 *       200:
 *         description: Pago confirmado y pedido actualizado a pagado
 */
router.post(
  '/pedidos/:pedidoId/confirmar-manual', 
  authenticateJWT, 
  authorizeRoles('admin_local', 'repartidor', 'superadmin'), 
  paymentController.confirmManualPayment.bind(paymentController)
);

module.exports = router;