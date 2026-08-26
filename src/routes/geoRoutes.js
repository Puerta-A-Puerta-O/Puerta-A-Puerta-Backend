// src/routes/geoRoutes.js
const express = require('express');
const router = express.Router();
const geoController = require('../controllers/geoController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticateJWT);

/**
 * @swagger
 * /telemetria:
 *   post:
 *     summary: Registrar coordenadas GPS del repartidor en tiempo real
 *     tags: [Telemetría]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pedidoId, latitud, longitud]
 *             properties:
 *               pedidoId:
 *                 type: string
 *                 format: uuid
 *               latitud:
 *                 type: number
 *               longitud:
 *                 type: number
 *               velocidadKms:
 *                 type: number
 *     responses:
 *       201:
 *         description: Ubicación registrada exitosamente
 *       400:
 *         description: Parámetros inválidos
 *       403:
 *         description: Acceso denegado (requiere rol de repartidor)
 */
router.post(
  '/',
  authorizeRoles('repartidor', 'superadmin', 'admin_local'),
  geoController.saveLocation.bind(geoController)
);

module.exports = router;