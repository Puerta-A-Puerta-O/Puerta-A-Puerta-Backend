// src/routes/productRoutes.js
const express = require('express');
const productController = require('../controllers/productController');
const authMiddleware = require('../middlewares/authMiddleware');
const restrictTo = require('../middlewares/roleMiddleware');

const router = express.Router({ mergeParams: true });

// Consulta pública del menú
router.get('/', productController.getMenuByLocal);

// Modificaciones restringidas únicamente a Administradores del local o Superadmins
router.use(authMiddleware);
router.post(
  '/', 
  restrictTo('admin_local', 'superadmin'), 
  productController.createProduct
);

module.exports = router;