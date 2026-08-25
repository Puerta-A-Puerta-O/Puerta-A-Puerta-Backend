// src/services/orderServices.js
const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const { esTransicionValida, ESTADOS } = require('../utils/orderStateMachine');

class OrderService {
  async createOrder({ clienteId, localId, direccionEntrega, latitud, longitud, items }) {
    // 1. Validar campos obligatorios
    if (!latitud || !longitud || !direccionEntrega || !items || !Array.isArray(items) || items.length === 0) {
      const error = new Error('Los datos del domicilio y al menos un ítem son requeridos');
      error.statusCode = 400;
      throw error;
    }

    // 2. Recalcular el monto total consultando los precios reales en la BD
    let montoTotalCalculado = 0;
    const itemsValidados = [];

    for (const item of items) {
      const producto = await productRepository.findById(item.productoId);
      
      if (!producto || !producto.disponible) {
        const error = new Error(`El producto con ID ${item.productoId} no está disponible o no existe`);
        error.statusCode = 404;
        throw error;
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
    if (!pedido) {
      const error = new Error('Pedido no encontrado');
      error.statusCode = 404;
      throw error;
    }

    return await orderRepository.assignDriver(pedidoId, repartidorId);
  }

  async changeOrderStatus({ pedidoId, estado: nuevoEstado, repartidorId, usuarioId }) {
    const pedido = await orderRepository.findById(pedidoId);
    if (!pedido) {
      const error = new Error('Pedido no encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Validar máquina de estados
    if (!esTransicionValida(pedido.estado, nuevoEstado)) {
      const error = new Error(`Transición no permitida de '${pedido.estado}' a '${nuevoEstado}'`);
      error.statusCode = 400;
      throw error;
    }

    // Asignar repartidor explícitamente si vino en el body
    let targetRepartidorId = pedido.repartidor_id;
    if (repartidorId) {
      await orderRepository.assignDriver(pedidoId, repartidorId);
      targetRepartidorId = repartidorId;
    }

    // Regla de negocio: No se puede poner 'en_camino' si no hay repartidor asignado
    if (nuevoEstado === ESTADOS.EN_CAMINO && !targetRepartidorId) {
      const error = new Error('No se puede pasar a en_camino sin un repartidor asignado');
      error.statusCode = 400;
      throw error;
    }

    return await orderRepository.updateStatus(pedidoId, nuevoEstado, usuarioId);
  }
}

module.exports = new OrderService();