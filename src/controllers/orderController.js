// src/controllers/orderController.js
const orderService = require('../services/orderServices');
const geoRepository = require('../repositories/geoRepository');

class OrderController {
  async createOrder(req, res, next) {
    try {
      const clienteId = req.user.id;
      const { localId, direccionEntrega, latitud, longitud, notas, items } = req.body;

      const nuevoPedido = await orderService.createOrder({
        clienteId,
        localId,
        direccionEntrega,
        latitud,
        longitud,
        notas,
        items
      });

      // Emisión WebSockets para el dashboard del local
      const io = req.app.get('io');
      if (io) {
        io.to(`local_${localId}`).emit('nuevo_pedido', nuevoPedido);
      }

      return res.status(201).json({
        status: 'success',
        data: nuevoPedido,
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
        usuarioId
      });

      // Emisión WebSockets para la app del cliente/repartidor
      const io = req.app.get('io');
      if (io) {
        io.to(`pedido_${pedidoId}`).emit('estado_actualizado', {
          pedidoId: pedidoActualizado.id || pedidoId,
          nuevoEstado: estado,
          repartidorId: pedidoActualizado.repartidorId || repartidorId || null,
          actualizadoEn: new Date(),
        });
      }

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
      const historial = await geoRepository.getOrderRouteHistory(pedidoId);

      return res.status(200).json({
        status: 'success',
        data: {
          pedidoId,
          totalPuntos: historial.length,
          ruta: historial
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();