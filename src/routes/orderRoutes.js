// src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { validateCreateOrder, validateChangeStatus } = require('../validators/orderValidator');
const validateRequest = require('../middlewares/validateRequest');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

// Aplicamos el middleware
router.use(authenticateJWT);

router.post('/', validateCreateOrder, validateRequest, orderController.createOrder);


router.patch(
  '/:pedidoId/estado',
  authorizeRoles('admin', 'admin_local', 'local', 'repartidor'),
  validateChangeStatus,
  validateRequest,
  orderController.changeStatus
);

module.exports = router;