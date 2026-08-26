const express = require('express');
const router = express.Router({ mergeParams: true });
const productController = require('../controllers/productController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Productos
 *   description: Catálogo y stock de productos por local
 */

/**
 * @swagger
 * /locales/{localId}/productos:
 *   post:
 *     summary: Agregar un producto al catálogo
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: localId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID del local
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, precio]
 *             properties:
 *               categoriaId:
 *                 type: integer
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               precio:
 *                 type: number
 *               disponible:
 *                 type: boolean
 *               imagenUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Producto creado con éxito
 */

/**
 * @swagger
 * /locales/{localId}/productos/{id}/stock:
 *   patch:
 *     summary: Cambiar disponibilidad/stock de un producto
 *     tags: [Productos]
 *     parameters:
 *       - in: path
 *         name: localId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID del producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [disponible]
 *             properties:
 *               disponible:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Estado de stock actualizado
 */

// Ruta pública: Ver menú/catálogo de productos del local
router.get('/', productController.getMenuByLocal);

// A partir de aquí todas las rutas requieren token JWT
router.use(authenticateJWT);

// Crear un nuevo producto en el local
router.post(
  '/', 
  authorizeRoles('admin_local', 'superadmin', 'admin'), 
  productController.createProduct
);

// Modificar disponibilidad/stock de un producto específico
router.patch(
  '/:id/stock', 
  authorizeRoles('admin_local', 'superadmin', 'admin'), 
  productController.updateStock
);

module.exports = router;