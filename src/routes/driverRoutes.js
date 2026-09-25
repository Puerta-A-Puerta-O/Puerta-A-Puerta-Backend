// src/routes/driverRoutes.js
const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticateJWT);
router.use(authorizeRoles('repartidor', 'superadmin', 'admin_local'));

/**
 * @swagger
 * /repartidores/hoja-de-ruta:
 *   get:
 *     summary: Obtener la hoja de ruta optimizada de entregas para el repartidor
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitudActual
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitudActual
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Hoja de ruta calculada exitosamente
 */
router.get('/hoja-de-ruta', driverController.getDeliveryRoute.bind(driverController));

/**
 * @swagger
 * /repartidores/disponibilidad:
 *   patch:
 *     summary: Cambiar estado de disponibilidad del repartidor
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [offline, disponible, ocupado]
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 */
router.patch('/disponibilidad', driverController.updateAvailability.bind(driverController));

/**
 * @swagger
 * /repartidores/ubicacion:
 *   post:
 *     summary: Enviar actualización de ubicación GPS en tiempo real
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitud:
 *                 type: number
 *               longitud:
 *                 type: number
 *     responses:
 *       200:
 *         description: Ubicación actualizada
 */
router.post('/ubicacion', driverController.updateLocation.bind(driverController));

/**
 * @swagger
 * /repartidores/pedidos-disponibles:
 *   get:
 *     summary: Ver lista de pedidos listos para tomar
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos disponibles
 */
router.get('/pedidos-disponibles', driverController.getAvailableOrders.bind(driverController));

/**
 * @swagger
 * /repartidores/pedidos/{id}/aceptar:
 *   post:
 *     summary: Tomar/Aceptar un pedido disponible
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pedido asignado con éxito
 */
router.post('/pedidos/:id/aceptar', driverController.acceptOrder.bind(driverController));

module.exports = router;