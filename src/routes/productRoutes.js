// src/routes/productRoutes.js
const express = require('express');
const productController = require('../controllers/productController');
// Importá tu middleware de autenticación si querés proteger la creación
// const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(productController.getMenuByLocal)
  .post(productController.createProduct);

module.exports = router;