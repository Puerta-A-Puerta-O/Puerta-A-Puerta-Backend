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

module.exports = router;