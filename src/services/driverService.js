// src/services/driverService.js
const driverRepository = require('../repositories/driverRepository');
const orderRepository = require('../repositories/orderRepository');

class DriverService {
  async updateLocation(repartidorId, latitud, longitud) {
    if (!latitud || !longitud) {
      throw new Error('La latitud y longitud son requeridas.');
    }
    return await driverRepository.updateLocation(repartidorId, latitud, longitud);
  }

  async setAvailability(repartidorId, estado) {
    const estadosValidos = ['offline', 'disponible', 'en_oferta', 'ocupado'];
    if (!estadosValidos.includes(estado)) {
      throw new Error(`Estado de disponibilidad no válido: ${estado}`);
    }
    return await driverRepository.updateAvailability(repartidorId, estado);
  }

  async getAvailableOrders() {
    return await driverRepository.findAvailableOrders();
  }

  async acceptOrder(pedidoId, repartidorId) {
    const pedidoAsignado = await driverRepository.assignOrder(pedidoId, repartidorId);
    if (!pedidoAsignado) {
      throw new Error('El pedido ya no está disponible o ya fue tomado por otro repartidor.');
    }
    return pedidoAsignado;
  }

  async getMyRoute(repartidorId) {
    return await driverRepository.getOrdersForRouteOptimization(repartidorId);
  }

  async updateOrderStatus(pedidoId, repartidorId, nuevoEstado) {
    return await orderRepository.updateStatus(pedidoId, nuevoEstado, repartidorId, repartidorId);
  }
}

module.exports = new DriverService();