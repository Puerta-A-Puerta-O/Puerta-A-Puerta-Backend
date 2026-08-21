// src/controllers/orderController.js
const orderService = require('../services/orderServices');

class OrderController {
  async create(req, res, next) {
    try {
      const clienteId = req.user.id; // Del token JWT
      const { localId, direccionEntrega, latitud, longitud, montoTotal } = req.body;

      const order = await orderService.createOrder({
        clienteId,
        localId,
        direccionEntrega,
        latitud,
        longitud,
        montoTotal,
      });

      return res.status(201).json({
        status: 'success',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  async assignDriver(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const { repartidorId } = req.body;

      const updated = await orderService.assignDriver(pedidoId, repartidorId);
      return res.status(200).json({
        status: 'success',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async changeStatus(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const { estado } = req.body;
      const usuarioId = req.user.id;

      const updated = await orderService.changeOrderStatus(pedidoId, estado, usuarioId);
      return res.status(200).json({
        status: 'success',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();