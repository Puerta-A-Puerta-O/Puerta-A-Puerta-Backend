// src/controllers/orderController.js
const orderService = require('../services/orderServices');

class OrderController {
  async createOrder(req, res, next) {
    try {
      const clienteId = req.user.id;
      const { localId, direccionEntrega, latitud, longitud, items } = req.body;

      const nuevoPedido = await orderService.createOrder({
        clienteId,
        localId,
        direccionEntrega,
        latitud,
        longitud,
        items,
      });

      // Emisión opcional para notificar al local de un pedido entrante
      const io = req.app.get('io');
      if (io) {
        io.to(`local_${localId}`).emit('nuevo_pedido', nuevoPedido);
      }

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

  async changeStatus(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const { estado } = req.body;
      const usuarioId = req.user.id;

      const pedidoActualizado = await orderService.changeOrderStatus(pedidoId, estado, usuarioId);

      // Emisión de notificación por Socket.io a la sala del pedido
      const io = req.app.get('io');
      if (io) {
        io.to(`pedido_${pedidoId}`).emit('estado_actualizado', {
          pedidoId: pedidoActualizado.id || pedidoId,
          nuevoEstado: estado,
          actualizadoEn: new Date(),
        });
      }

      res.status(200).json({
        status: 'success',
        data: pedidoActualizado,
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