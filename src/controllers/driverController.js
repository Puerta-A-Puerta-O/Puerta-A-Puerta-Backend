// src/controllers/driverController.js
const driverRepository = require('../repositories/driverRepository');
const routeOptimizationService = require('../services/routeOptimizationService');

class DriverController {
  async getDeliveryRoute(req, res, next) {
    try {
      const repartidorUsuarioId = req.user.id;
      const { latitudActual, longitudActual } = req.query;

      const pedidosAsignados = await driverRepository.getOrdersForRouteOptimization(repartidorUsuarioId);

      if (pedidosAsignados.length === 0) {
        return res.status(200).json({
          status: 'success',
          mensaje: 'No tienes pedidos pendientes de entrega.',
          data: { hojaDeRuta: [] }
        });
      }

      const origen = (latitudActual && longitudActual)
        ? { latitud: parseFloat(latitudActual), longitud: parseFloat(longitudActual) }
        : { latitud: pedidosAsignados[0].local_latitud, longitud: pedidosAsignados[0].local_longitud };

      const hojaDeRuta = routeOptimizationService.optimizeSmartDeliveryRoute(origen, pedidosAsignados);

      return res.status(200).json({
        status: 'success',
        data: {
          totalPedidos: hojaDeRuta.length,
          origen,
          hojaDeRuta: hojaDeRuta.map(p => ({
            orden: p.ordenSugerido,
            pedidoId: p.pedido_id,
            direccion: p.direccion_entrega,
            minutosEspera: p.minutos_espera,
            distanciaTramoKm: p.distanciaTramoKm,
            montoTotal: p.monto_total,
            coordenadas: { latitud: p.latitud, longitud: p.longitud }
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAvailability(req, res, next) {
    try {
      const usuarioId = req.user.id;
      const { estado } = req.body;

      if (!['offline', 'disponible', 'ocupado'].includes(estado)) {
        return res.status(400).json({ status: 'error', mensaje: 'Estado no válido' });
      }

      const resultado = await driverRepository.updateAvailability(usuarioId, estado);
      return res.status(200).json({ status: 'success', data: resultado });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DriverController();