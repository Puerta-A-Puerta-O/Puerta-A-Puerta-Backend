// src/controllers/orderController.js
const orderService = require('../services/orderServices');

class OrderController {
  async createOrder(req, res, next) {
    try {
      const clienteId = req.user.id; // Obtenido del token JWT
      const { localId, direccionEntrega, latitud, longitud, items } = req.body;

      const nuevoPedido = await orderService.createOrder({
        clienteId,
        localId,
        direccionEntrega,
        latitud,
        longitud,
        items,
      });

      res.status(201).json({
        status: 'success',
        data: nuevoPedido,
      });
    } catch (error) {
      res.status(400).json({
        status: 'fail',
        mensaje: error.message,
      });
    }
  }
}

module.exports = new OrderController();