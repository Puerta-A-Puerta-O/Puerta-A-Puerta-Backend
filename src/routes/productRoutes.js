// src/routes/productRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const productController = require('../controllers/productController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');


router.use(authenticateJWT);


router.post(
  '/', 
  authorizeRoles('admin_local', 'superadmin'), 
  productController.createProduct
);

module.exports = router;