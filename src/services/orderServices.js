// src/services/orderService.js
const orderRepository = require('../repositories/orderRepository');
const { esTransicionValida, ESTADOS } = require('../utils/orderStateMachine');

class OrderService {
  async createOrder({ clienteId, localId, direccionEntrega, latitud, longitud, montoTotal }) {
    if (!latitud || !longitud || !direccionEntrega || !montoTotal) {
      throw new Error('Todos los datos del domicilio y el monto son requeridos');
    }

    return await orderRepository.create({
      clienteId,
      localId,
      direccionEntrega,
      latitud,
      longitud,
      montoTotal,
    });
  }

  async assignDriver(pedidoId, repartidorId) {
    const pedido = await orderRepository.findById(pedidoId);
    if (!pedido) throw new Error('Pedido no encontrado');

    return await orderRepository.assignDriver(pedidoId, repartidorId);
  }

  async changeOrderStatus(pedidoId, nuevoEstado, usuarioId) {
    const pedido = await orderRepository.findById(pedidoId);
    if (!pedido) throw new Error('Pedido no encontrado');

    if (!esTransicionValida(pedido.estado, nuevoEstado)) {
      throw new Error(
        `Transición no permitida de '${pedido.estado}' a '${nuevoEstado}'`
      );
    }

    // Regla de negocio: No se puede poner 'en_camino' si no hay repartidor asignado
    if (nuevoEstado === ESTADOS.EN_CAMINO && !pedido.repartidor_id) {
      throw new Error('No se puede pasar a en_camino sin un repartidor asignado');
    }

    return await orderRepository.updateStatus(pedidoId, nuevoEstado, usuarioId);
  }
}

module.exports = new OrderService();