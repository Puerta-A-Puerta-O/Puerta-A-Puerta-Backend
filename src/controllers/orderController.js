// src/controllers/orderController.js
const orderService = require('../services/orderServices'); //[cite: 3]

class OrderController {
  async createOrder(req, res, next) {
    try {
      const clienteId = req.user.id; //[cite: 3]
      const { localId, direccionEntrega, latitud, longitud, items } = req.body; //[cite: 3]

      const nuevoPedido = await orderService.createOrder({
        clienteId,
        localId,
        direccionEntrega,
        latitud,
        longitud,
        items,
      }); //[cite: 3]

      // Emisión Socket.io al canal del local
      const io = req.app.get('io'); //[cite: 3]
      if (io) {
        io.to(`local_${localId}`).emit('nuevo_pedido', nuevoPedido); //[cite: 3]
      }

      res.status(201).json({
        status: 'success',
        data: nuevoPedido,
      }); //[cite: 3]
    } catch (error) {
      next(error); // Delegar al errorHandler centralizado y Winston
    }
  }

  async changeStatus(req, res, next) {
    try {
      const { pedidoId } = req.params; //[cite: 3]
      const { estado, repartidorId } = req.body;
      const usuarioId = req.user.id; //[cite: 3]

      const pedidoActualizado = await orderService.changeOrderStatus({
        pedidoId,
        estado,
        repartidorId,
        usuarioId
      });

      // Emisión Socket.io a la sala del pedido
      const io = req.app.get('io'); //[cite: 3]
      if (io) {
        io.to(`pedido_${pedidoId}`).emit('estado_actualizado', { //[cite: 3]
          pedidoId: pedidoActualizado.id || pedidoId, //[cite: 3]
          nuevoEstado: estado, //[cite: 3]
          repartidorId: pedidoActualizado.repartidorId || repartidorId || null,
          actualizadoEn: new Date(), //[cite: 3]
        });
      }

      res.status(200).json({
        status: 'success',
        data: pedidoActualizado,
      }); //[cite: 3]
    } catch (error) {
      next(error); // Delegar al errorHandler centralizado y Winston
    }
  }
}

module.exports = new OrderController(); //[cite: 3]