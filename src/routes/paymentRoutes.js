// src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateJWT } = require('../middlewares/authMiddleware');

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

module.exports = router;