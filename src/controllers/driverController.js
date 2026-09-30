// src/controllers/driverController.js
const driverRepository = require('../repositories/driverRepository');
const routeOptimizationService = require('../services/routeOptimizationService');

class DriverController {
  /**
   * Obtiene la hoja de ruta optimizada para el repartidor.
   * Retorna 'data' como un Array plano directamente compatible con el cliente Flutter.
   */
  async getDeliveryRoute(req, res, next) {
    try {
      const repartidorUsuarioId = req.user.id;
      const { latitudActual, longitudActual } = req.query;

      const pedidosAsignados = await driverRepository.getOrdersForRouteOptimization(repartidorUsuarioId);

      if (!pedidosAsignados || pedidosAsignados.length === 0) {
        return res.status(200).json({
          status: 'success',
          mensaje: 'No tienes pedidos pendientes de entrega.',
          data: []
        });
      }

      const origen = (latitudActual && longitudActual)
        ? { latitud: parseFloat(latitudActual), longitud: parseFloat(longitudActual) }
        : { latitud: pedidosAsignados[0].local_latitud, longitud: pedidosAsignados[0].local_longitud };

      const hojaDeRuta = routeOptimizationService.optimizeSmartDeliveryRoute(origen, pedidosAsignados);

      // Mapeo plano para que coincida exactamente con OrderRouteEntity en Flutter
      const dataFormateada = hojaDeRuta.map(p => {
        const monto = Number(p.monto_total || 0);
        const pagaCon = p.efectivo_paga_con ? Number(p.efectivo_paga_con) : null;
        const vuelto = (pagaCon && pagaCon > monto) ? (pagaCon - monto) : 0;

        return {
          orden: p.ordenSugerido,
          pedidoId: p.pedido_id,
          localNombre: p.local_nombre || 'Comercio',
          direccionEntrega: p.direccion_entrega,
          direccion: p.direccion_entrega,
          latitud: p.latitud != null ? parseFloat(p.latitud) : null,
          longitud: p.longitud != null ? parseFloat(p.longitud) : null,
          estado: p.estado || 'asignado',
          minutosEspera: p.minutos_espera,
          distanciaTramoKm: p.distanciaTramoKm,
          montoTotal: monto,
          estaPagado: p.esta_pagado ?? false,
          requiereCobro: p.requiere_cobro_en_entrega ?? !p.esta_pagado,
          efectivoPagaCon: pagaCon,
          vueltoAEntregar: vuelto,
          qrParaCobrarPayload: `00020101021243650016com.mercadopago${p.pedido_id}5405${monto}5802AR`,
          coordenadas: {
            latitud: p.latitud != null ? parseFloat(p.latitud) : null,
            longitud: p.longitud != null ? parseFloat(p.longitud) : null
          }
        };
      });

      return res.status(200).json({
        status: 'success',
        data: dataFormateada
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

  /**
   * Actualiza la última posición GPS del repartidor
   */
  async updateLocation(req, res, next) {
    try {
      const repartidorUsuarioId = req.user.id;
      const { latitud, longitud } = req.body;

      if (latitud == null || longitud == null) {
        return res.status(400).json({ status: 'error', mensaje: 'Latitud y longitud son requeridas' });
      }

      const ubicacion = await driverRepository.updateLocation(repartidorUsuarioId, latitud, longitud);
      return res.status(200).json({ status: 'success', data: ubicacion });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene la lista de pedidos disponibles para ser tomados
   */
  async getAvailableOrders(req, res, next) {
    try {
      const pedidos = await driverRepository.findAvailableOrders();
      return res.status(200).json({ status: 'success', data: pedidos });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Permite al repartidor tomar un pedido disponible
   */
  async acceptOrder(req, res, next) {
    try {
      const repartidorUsuarioId = req.user.id;
      const { id: pedidoId } = req.params;

      const pedidoAsignado = await driverRepository.assignOrder(pedidoId, repartidorUsuarioId);

      if (!pedidoAsignado) {
        return res.status(409).json({ 
          status: 'error', 
          mensaje: 'El pedido ya no está disponible o ya fue tomado por otro repartidor.' 
        });
      }

      return res.status(200).json({ status: 'success', data: pedidoAsignado });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DriverController();