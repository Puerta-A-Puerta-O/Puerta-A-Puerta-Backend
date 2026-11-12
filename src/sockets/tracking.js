// src/sockets/tracking.js
const geoRepository = require('../repositories/geoRepository');
const orderRepository = require('../repositories/orderRepository');
const geoService = require('../services/geoService');
const authorizationService = require('../services/authorizationService');
const { ESTADOS } = require('../utils/orderStateMachine');

module.exports = (io) => {
  io.on('connection', (socket) => {
    if (!socket.usuario?.id) {
      socket.disconnect(true);
      return;
    }

    console.log(`🔌 Socket conectado: ${socket.id} (Usuario: ${socket.usuario.id})`);

    // Solo se entra a la sala si el usuario puede ver el pedido.
    const unirseAPedido = async (pedidoId) => {
      if (!pedidoId) return;

      try {
        await authorizationService.assertOrderAccess(pedidoId, socket.usuario);
        socket.join(`pedido_${pedidoId}`);
        console.log(`📡 Socket ${socket.id} se unió a la sala: pedido_${pedidoId}`);
      } catch (error) {
        socket.emit('error_autorizacion', {
          pedidoId,
          mensaje: error.message || 'No tenés acceso a este pedido',
        });
      }
    };

    socket.on('unirse_pedido', ({ pedidoId } = {}) => unirseAPedido(pedidoId));

    // Alias por compatibilidad de eventos
    socket.on('unirse_a_pedido', (pedidoId) => unirseAPedido(pedidoId));

    // Emisión GPS en tiempo real del repartidor
    socket.on('actualizar_ubicacion', async (data = {}) => {
      const { pedidoId, latitud, longitud, velocidad } = data;
      const repartidorId = socket.usuario?.id;

      if (!pedidoId || latitud === undefined || longitud === undefined) {
        return;
      }

      try {
        // El repartidor solo puede enviar GPS de un pedido que tenga asignado.
        await authorizationService.assertDriverAssignedToOrder(pedidoId, socket.usuario);

        // 1. Guardar la posición en PostGIS mediante el repositorio
        await geoRepository.saveDeliveryPoint(
          pedidoId,
          repartidorId,
          latitud,
          longitud,
          velocidad || 0
        );

        // 2. Obtener datos del pedido para calcular la distancia al destino
        const pedido = await orderRepository.findById(pedidoId);
        let distanciaMetros = null;
        let etaMinutos = null;
        let enGeocerca = false;

        if (pedido && pedido.latitud && pedido.longitud) {
          distanciaMetros = geoService.calcularDistanciaMetros(
            latitud,
            longitud,
            pedido.latitud,
            pedido.longitud
          );
          etaMinutos = geoService.estimarTiempoMinutos(distanciaMetros, velocidad || 25);
          enGeocerca = geoService.estaEnGeocercaLlegada(distanciaMetros);
        }

        // 3. Emitir actualización a todos los suscriptores de la sala
        io.to(`pedido_${pedidoId}`).emit('ubicacion_actualizada', {
          pedidoId,
          latitud,
          longitud,
          velocidad: velocidad || 0,
          distanciaMetros,
          etaMinutos,
          enGeocerca,
          timestamp: new Date()
        });

        // 4. Si el repartidor entró a la geocerca (< 100m) y el estado es 'en_camino', notificar llegada en puerta
        if (enGeocerca && pedido && pedido.estado === ESTADOS.EN_CAMINO) {
          io.to(`pedido_${pedidoId}`).emit('repartidor_en_puerta', {
            pedidoId,
            mensaje: '¡El repartidor se encuentra a menos de 100 metros de tu domicilio!',
            distanciaMetros
          });
        }

      } catch (error) {
        socket.emit('error_autorizacion', {
          pedidoId,
          mensaje: error.message || 'No podés enviar telemetría de este pedido',
        });
        console.error('❌ Error al procesar la telemetría GPS vía Socket:', error.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket desconectado: ${socket.id}`);
    });
  });
};
