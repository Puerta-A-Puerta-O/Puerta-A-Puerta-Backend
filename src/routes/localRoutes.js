// src/routes/localRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const localController = require('../controllers/localController');

// Importamos exactamente como está en authMiddleware.js
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Locales
 *   description: Gestión de comercios y áreas de cobertura
 */

/**
 * @swagger
 * /locales:
 *   get:
 *     summary: Obtener locales cercanos por coordenadas
 *     tags: [Locales]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Lista devuelta
 *   post:
 *     summary: Crear un nuevo local
 *     tags: [Locales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, direccion, telefono, longitud, latitud]
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               direccion:
 *                 type: string
 *               telefono:
 *                 type: string
 *               longitud:
 *                 type: number
 *               latitud:
 *                 type: number
 *               imagenUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Local creado exitosamente
 */

/**
 * @swagger
 * /locales/{id}/cobertura:
 *   put:
 *     summary: Definir polígono de cobertura PostGIS para el local
 *     tags: [Locales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               coordenadas:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *                 example:
 *                   - [-64.184, -31.417]
 *                   - [-64.180, -31.417]
 *                   - [-64.180, -31.420]
 *                   - [-64.184, -31.417]
 *     responses:
 *       200:
 *         description: Cobertura actualizada correctamente
 */

// Consulta pública
router.get('/', localController.getNearby);

// Rutas protegidas para creación y cobertura
router.post(
  '/', 
  authenticateJWT, 
  authorizeRoles('admin', 'admin_local', 'superadmin'), 
  localController.create
);

router.put(
  '/:id/cobertura', 
  authenticateJWT, 
  authorizeRoles('admin', 'admin_local', 'superadmin'), 
  localController.setCoverage
);

module.exports = router;