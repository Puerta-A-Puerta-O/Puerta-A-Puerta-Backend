// src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateJWT } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /notificaciones/dispositivo-token:
 *   post:
 *     summary: Registrar FCM Token del celular/dispositivo para recibir Notificaciones Push
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fcmToken]
 *             properties:
 *               fcmToken:
 *                 type: string
 *               plataforma:
 *                 type: string
 *                 enum: [android, ios, web]
 *     responses:
 *       201:
 *         description: Token guardado exitosamente
 */
router.post('/dispositivo-token', authenticateJWT, notificationController.registerToken.bind(notificationController));

module.exports = router;