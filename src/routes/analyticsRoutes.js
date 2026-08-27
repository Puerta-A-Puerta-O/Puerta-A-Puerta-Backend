// src/routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /analiticas/locales/{localId}/dashboard:
 *   get:
 *     summary: Obtener métricas y analíticas financieras y operativas del comercio
 *     tags: [Analíticas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: localId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (YYYY-MM-DD)
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Métricas obtenidas con éxito
 */
router.get(
  '/locales/:localId/dashboard', 
  authenticateJWT, 
  authorizeRoles('admin_local', 'superadmin'), 
  analyticsController.getDashboard.bind(analyticsController)
);

module.exports = router;