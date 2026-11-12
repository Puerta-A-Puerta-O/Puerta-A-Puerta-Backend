const orderService = require('../services/orderServices');
const authorizationService = require('../services/authorizationService');
const httpError = require('../utils/httpError');

class OrderController {
  /**
   * Crear un nuevo pedido
   */
  async createOrder(req, res, next) {
    try {
      const clienteId = req.user.id;
      const { localId, direccionEntrega, longitud, latitud, notas, items } = req.body;

      const pedido = await orderService.createOrder({
        clienteId,
        localId,
        direccionEntrega,
        longitud,
        latitud,
        notas,
        items,
      });

      return res.status(201).json({
        status: 'success',
        data: pedido,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener detalle de un pedido por ID
   */
  async getOrderById(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const pedido = await orderService.getOrderById(pedidoId);

      if (!pedido) {
        return res.status(404).json({
          status: 'error',
          mensaje: 'Pedido no encontrado',
        });
      }

      return res.status(200).json({
        status: 'success',
        data: pedido,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener lista general de pedidos (filtrable por cliente, local, estado o sinRepartidor)
   */
  async getOrders(req, res, next) {
    try {
      const user = req.user;
      const userRole = user.rol || user.role;
      const { localId, estado } = req.query;
      const sinRepartidor = req.query.sinRepartidor === 'true';

      let clienteId = null;
      let repartidorId = null;
      let localIds = null;

      if (userRole === 'cliente') {
        clienteId = user.id;
      } else if (userRole === 'repartidor') {
        repartidorId = user.id;
      } else if (userRole === 'admin_local') {
        if (localId) {
          await authorizationService.assertLocalOwnership(localId, user);
        } else {
          localIds = await authorizationService.getOwnedLocalIds(user);
          if (localIds.length === 0) {
            return res.status(200).json({ status: 'success', data: [] });
          }
        }
      } else if (userRole !== 'superadmin') {
        throw httpError('No tienes permisos suficientes', 403);
      }

      const pedidos = await orderService.getOrders({
        clienteId,
        localId,
        localIds,
        repartidorId,
        estado,
        sinRepartidor,
      });

      return res.status(200).json({
        status: 'success',
        data: pedidos,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🟢 REPARTIDORES: Obtener pedidos disponibles para tomar en la zona
   * Endpoint: GET /api/v1/repartidores/pedidos/disponibles
   */
  async getAvailableOrders(req, res, next) {
    try {
      const pedidosDisponibles = await orderService.getAvailableOrders();

      return res.status(200).json({
        status: 'success',
        data: pedidosDisponibles,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🟢 REPARTIDORES: Obtener la hoja de ruta / pedidos asignados al repartidor autenticado
   * Endpoint: GET /api/v1/repartidores/hoja-ruta
   */
  async getDriverRoute(req, res, next) {
    try {
      const repartidorId = req.user.id;
      const hojaDeRuta = await orderService.getDriverRoute(repartidorId);

      return res.status(200).json({
        status: 'success',
        data: hojaDeRuta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🟢 REPARTIDORES: Aceptar y autoasignarse un pedido disponible
   * Endpoint: POST /api/v1/repartidores/pedidos/:pedidoId/aceptar
   */
  async assignOrder(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const repartidorId = req.user.id;

      const pedidoAsignado = await orderService.assignOrderToDriver(pedidoId, repartidorId);

      if (!pedidoAsignado) {
        return res.status(409).json({
          status: 'error',
          mensaje: 'El pedido ya no está disponible o ya fue tomado por otro repartidor.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data: pedidoAsignado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cambiar estado de un pedido (Avanzar estado, asignar repartidor manualmente, etc.)
   */
  async changeStatus(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const { estado, repartidorId } = req.body;
      const usuarioId = req.user.id;
      const rolUsuario = req.user.rol || req.user.role;

      const pedidoActualizado = await orderService.changeOrderStatus({
        pedidoId,
        estado,
        repartidorId,
        usuarioId,
        rolUsuario,
      });

      // Notificar a cliente y repartidor en tiempo real.
      const io = req.app.get('io');
      if (io) {
        io.to(`pedido_${pedidoId}`).emit('estado_actualizado', {
          pedidoId,
          nuevoEstado: pedidoActualizado.estado,
          estado: pedidoActualizado.estado,
          pedido: pedidoActualizado,
          timestamp: new Date().toISOString(),
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

  /**
   * Obtener historial de seguimiento del pedido
   */
  async getTrackingHistory(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const historial = await orderService.getTrackingHistory(pedidoId);

      return res.status(200).json({
        status: 'success',
        data: historial,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ocultar pedido del historial (Cliente)
   */
  async hideOrder(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const clienteId = req.user.id;
      await orderService.hideOrder(pedidoId, clienteId);

      return res.status(200).json({
        status: 'success',
        mensaje: 'Pedido ocultado del historial correctamente',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancelar un pedido
   */
  async cancelOrder(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const clienteId = req.user.id;
      const rolUsuario = req.user.rol || req.user.role;
      const pedido = await orderService.cancelOrder(pedidoId, clienteId, rolUsuario);

      return res.status(200).json({
        status: 'success',
        data: pedido,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar dirección o notas del pedido
   */
  async updateOrder(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const clienteId = req.user.id;
      const rolUsuario = req.user.rol || req.user.role;
      const { direccionEntrega, notas } = req.body;

      const pedido = await orderService.updateOrder(
        pedidoId,
        clienteId,
        { direccionEntrega, notas },
        rolUsuario
      );

      return res.status(200).json({
        status: 'success',
        data: pedido,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();