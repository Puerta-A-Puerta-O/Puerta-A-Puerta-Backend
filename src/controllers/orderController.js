// src/controllers/orderController.js
const orderService = require('../services/orderServices');

class OrderController {
  async createOrder(req, res, next) {
    try {
      const clienteId = req.user.id;
      const { localId, direccionEntrega, longitud, latitud, notas, items } = req.body;

      const pedido = await orderService.createOrder({
        clienteId,
        localId,
        direccionEntrega,
        longitud,
        latitud,
        notas,
        items,
      });

      return res.status(201).json({
        status: 'success',
        data: pedido,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const pedido = await orderService.getOrderById(pedidoId);

      if (!pedido) {
        return res.status(404).json({
          status: 'error',
          mensaje: 'Pedido no encontrado',
        });
      }

      return res.status(200).json({
        status: 'success',
        data: pedido,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrders(req, res, next) {
    try {
      const clienteId = req.query.clienteId || (req.user.role === 'cliente' ? req.user.id : null);
      const localId = req.query.localId;

      const pedidos = await orderService.getOrders({ clienteId, localId });

      return res.status(200).json({
        status: 'success',
        data: pedidos,
      });
    } catch (error) {
      next(error);
    }
  }

  async changeStatus(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const { estado, repartidorId } = req.body;
      const usuarioId = req.user.id;

      const pedidoActualizado = await orderService.changeOrderStatus({
        pedidoId,
        estado,
        repartidorId,
        usuarioId,
      });

      return res.status(200).json({
        status: 'success',
        data: pedidoActualizado,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTrackingHistory(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const historial = await orderService.getTrackingHistory(pedidoId);

      return res.status(200).json({
        status: 'success',
        data: historial,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();