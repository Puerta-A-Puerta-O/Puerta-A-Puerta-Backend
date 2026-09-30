const orderService = require('../services/orderServices');

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
      const userRole = req.user.rol || req.user.role;
      const clienteId = userRole === 'cliente' ? req.user.id : (req.query.clienteId || null);
      const { localId, estado } = req.query;
      const sinRepartidor = req.query.sinRepartidor === 'true';

      const pedidos = await orderService.getOrders({ 
        clienteId, 
        localId, 
        estado, 
        sinRepartidor 
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