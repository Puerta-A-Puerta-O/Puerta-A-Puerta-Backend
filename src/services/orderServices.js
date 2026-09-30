// src/services/orderServices.js
const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const { esTransicionValida, ESTADOS } = require('../utils/orderStateMachine');

class OrderService {
  /**
   * Crear un pedido validando stock/precios dinámicamente
   */
  async createOrder({ clienteId, localId, direccionEntrega, latitud, longitud, notas, items }) {
    if (!latitud || !longitud || !direccionEntrega || !items || !Array.isArray(items) || items.length === 0) {
      const error = new Error('Los datos del domicilio y al menos un ítem son requeridos');
      error.statusCode = 400;
      throw error;
    }

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
        subtotal,
      });
    }

    return await orderRepository.createOrder({
      clienteId,
      localId,
      direccionEntrega,
      latitud,
      longitud,
      notas,
      montoTotal: montoTotalCalculado,
      items: itemsValidados,
    });
  }

  /**
   * 🟢 REPARTIDORES: Listar pedidos pendientes sin repartidor asignado
   */
  async getAvailableOrders() {
    return await orderRepository.findAvailableForDrivers();
  }

  /**
   * 🟢 REPARTIDORES: Obtener la hoja de ruta / pedidos activos asignados al repartidor
   */
  async getDriverRoute(repartidorId) {
    if (!repartidorId) {
      const error = new Error('El ID del repartidor es obligatorio');
      error.statusCode = 400;
      throw error;
    }
    return await orderRepository.findRouteByDriverId(repartidorId);
  }

  /**
   * 🟢 REPARTIDORES: Autoasignación atómica de un pedido
   * Evita colisiones si varios repartidores intentan tomar el mismo pedido al mismo tiempo.
   */
  async assignOrderToDriver(pedidoId, repartidorId) {
    const pedido = await orderRepository.findById(pedidoId);

    if (!pedido) {
      const error = new Error('Pedido no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (pedido.repartidor_id && pedido.repartidor_id !== repartidorId) {
      const error = new Error('El pedido ya fue asignado a otro repartidor');
      error.statusCode = 409;
      throw error;
    }

    if (['entregado', 'cancelado'].includes(pedido.estado)) {
      const error = new Error(`No se puede tomar un pedido en estado '${pedido.estado}'`);
      error.statusCode = 400;
      throw error;
    }

    const pedidoAsignado = await orderRepository.assignOrderToDriver(pedidoId, repartidorId);

    if (!pedidoAsignado) {
      const error = new Error('El pedido ya no está disponible');
      error.statusCode = 409;
      throw error;
    }

    return pedidoAsignado;
  }

  /**
   * Asignar repartidor manualmente (vía Admin/Local)
   */
  async assignDriver(pedidoId, repartidorId) {
    const pedido = await orderRepository.findById(pedidoId);
    if (!pedido) {
      const error = new Error('Pedido no encontrado');
      error.statusCode = 404;
      throw error;
    }

    return await orderRepository.updateStatus(pedidoId, pedido.estado, repartidorId);
  }

  /**
   * Obtener detalle de pedido por ID
   */
  async getOrderById(pedidoId) {
    return await orderRepository.findById(pedidoId);
  }

  /**
   * Consultar historial o lista filtrada de pedidos
   */
  async getOrders({ clienteId, localId, estado, sinRepartidor }) {
    return await orderRepository.findAll({ clienteId, localId, estado, sinRepartidor });
  }
  
  /**
   * Obtener historial de auditoría de un pedido
   */
  async getTrackingHistory(pedidoId) {
    return await orderRepository.getTrackingHistory(pedidoId);
  }

  /**
   * Cambiar estado con validación de la máquina de estados
   */
  async changeOrderStatus({ pedidoId, estado: nuevoEstado, repartidorId, usuarioId, rolUsuario }) {
    const pedido = await orderRepository.findById(pedidoId);
    if (!pedido) {
      const error = new Error('Pedido no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const esAdmin = rolUsuario === 'admin' || rolUsuario === 'local';

    // Validar transición según máquina de estados
    if (!esAdmin && !esTransicionValida(pedido.estado, nuevoEstado)) {
      const error = new Error(`Transición no permitida de '${pedido.estado}' a '${nuevoEstado}'`);
      error.statusCode = 400;
      throw error;
    }

    const targetRepartidorId = repartidorId || pedido.repartidor_id;

    // Regla: Para pasar a 'en_camino' DEBE haber repartidor asignado
    if (nuevoEstado === ESTADOS.EN_CAMINO && !targetRepartidorId) {
      const error = new Error("No se puede pasar a 'en_camino' sin un repartidor asignado");
      error.statusCode = 400;
      throw error;
    }

    return await orderRepository.updateStatus(pedidoId, nuevoEstado, targetRepartidorId, usuarioId);
  }

  /**
   * Ocultar pedido para el cliente (soft delete)
   */
  async hideOrder(pedidoId, clienteId) {
    const resultado = await orderRepository.hideOrderForClient(pedidoId, clienteId);
    if (!resultado) {
      const error = new Error('Pedido no encontrado o no pertenece al usuario');
      error.statusCode = 404;
      throw error;
    }
    return resultado;
  }

  /**
   * Cancelar un pedido
   */
  async cancelOrder(pedidoId, usuarioId, rolUsuario) {
    const pedido = await orderRepository.findById(pedidoId);
    if (!pedido) {
      const error = new Error('Pedido no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const esAdmin = rolUsuario === 'admin' || rolUsuario === 'local';

    if (!esAdmin && pedido.estado !== 'creado' && pedido.estado !== 'confirmado') {
      const error = new Error(`No se puede cancelar un pedido en estado '${pedido.estado}'`);
      error.statusCode = 400;
      throw error;
    }

    if (pedido.estado === 'entregado') {
      const error = new Error('No se puede cancelar un pedido que ya fue entregado');
      error.statusCode = 400;
      throw error;
    }

    return await orderRepository.cancelOrder(pedidoId, usuarioId);
  }

  /**
   * Editar detalles del pedido (dirección/notas)
   */
  async updateOrder(pedidoId, clienteId, data, rolUsuario) {
    const pedido = await orderRepository.findById(pedidoId);
    if (!pedido) {
      const error = new Error('Pedido no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const esAdmin = rolUsuario === 'admin' || rolUsuario === 'local';

    if (!esAdmin && pedido.estado !== 'creado') {
      const error = new Error('Solo se pueden editar pedidos que aún no han sido confirmados');
      error.statusCode = 400;
      throw error;
    }

    return await orderRepository.updateOrderDetails(pedidoId, clienteId, data);
  }
}

module.exports = new OrderService();