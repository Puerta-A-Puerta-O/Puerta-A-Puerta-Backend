// src/services/orderServices.js
const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository'); // <- Inyectamos el repositorio de productos
const { esTransicionValida, ESTADOS } = require('../utils/orderStateMachine');

class OrderService {
  async createOrder({ clienteId, localId, direccionEntrega, latitud, longitud, items }) {
    // 1. Validar campos obligatorios
    if (!latitud || !longitud || !direccionEntrega || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Los datos del domicilio y al menos un ítem son requeridos');
    }

    // 2. Recalcular el monto total consultando los precios reales en la BD
    let montoTotalCalculado = 0;
    const itemsValidados = [];

    for (const item of items) {
      const producto = await productRepository.findById(item.productoId);
      
      if (!producto || !producto.disponible) {
        throw new Error(`El producto con ID ${item.productoId} no está disponible o no existe`);
      }

      const subtotal = Number(producto.precio) * item.cantidad;
      montoTotalCalculado += subtotal;

      itemsValidados.push({
        productoId: producto.id,
        precioUnitario: producto.precio,
        cantidad: item.cantidad,
        subtotal
      });
    }

    // 3. Crear la orden con el monto seguro recalculado en backend
    return await orderRepository.create({
      clienteId,
      localId,
      direccionEntrega,
      latitud,
      longitud,
      montoTotal: montoTotalCalculado,
      items: itemsValidados
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