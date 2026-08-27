// src/routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /resenas:
 *   post:
 *     summary: Enviar calificación y comentario para el local y el repartidor
 *     tags: [Reseñas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pedidoId, calificacionLocal]
 *             properties:
 *               pedidoId:
 *                 type: string
 *                 format: uuid
 *               calificacionLocal:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comentarioLocal:
 *                 type: string
 *               calificacionRepartidor:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comentarioRepartidor:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reseña guardada exitosamente
 */
router.post('/', authenticateJWT, authorizeRoles('cliente'), reviewController.createReview.bind(reviewController));

/**
 * @swagger
 * /resenas/locales/{localId}/promedio:
 *   get:
 *     summary: Obtener el promedio de estrellas del comercio
 *     tags: [Reseñas]
 *     parameters:
 *       - in: path
 *         name: localId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Promedio de calificación obtenido
 */
router.get('/locales/:localId/promedio', reviewController.getLocalRating.bind(reviewController));

/**
 * @swagger
 * /resenas/repartidores/{repartidorId}/promedio:
 *   get:
 *     summary: Obtener el promedio de estrellas del repartidor
 *     tags: [Reseñas]
 *     parameters:
 *       - in: path
 *         name: repartidorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Promedio de calificación obtenido
 */
router.get('/repartidores/:repartidorId/promedio', reviewController.getDriverRating.bind(reviewController));

module.exports = router;