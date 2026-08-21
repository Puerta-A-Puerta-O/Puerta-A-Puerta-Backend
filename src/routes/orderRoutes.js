// src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { validateCreateOrder, validateChangeStatus } = require('../validators/orderValidator');

router.use(authMiddleware);

router.post(
  '/',
  validateCreateOrder,
  validateRequest,
  (req, res, next) => orderController.create(req, res, next)
);

router.patch(
  '/:pedidoId/estado',
  validateChangeStatus,
  validateRequest,
  (req, res, next) => orderController.changeStatus(req, res, next)
);

module.exports = router;
