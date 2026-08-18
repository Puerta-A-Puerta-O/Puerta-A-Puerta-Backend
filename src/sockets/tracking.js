// src/sockets/tracking.js
const db = require('../config/db');
const orderRepository = require('../repositories/orderRepository');
const geoService = require('../services/geoService');
const { ESTADOS } = require('../utils/orderStateMachine');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado vía WebSocket: ${socket.id}`);

    // El cliente (app del usuario) se une a la sala de su pedido
    socket.on('unirse_a_pedido', (pedidoId) => {
      socket.join(`pedido_${pedidoId}`);
      console.log(`📡 Socket ${socket.id} escuchando el pedido: ${pedidoId}`);
    });

    // El repartidor envía su ubicación GPS en tiempo real
    socket.on('actualizar_ubicacion', async (data) => {
      const { pedidoId, repartidorId, latitud, longitud, velocidad } = data;

      try {
        // 1. Guardar la posición en la tabla de telemetría (PostGIS)
        const insertGeoQuery = `
          INSERT INTO pedido_ubicaciones (pedido_id, repartidor_id, ubicacion, velocidad_kms)
          VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5);
        `;
        await db.query(insertGeoQuery, [pedidoId, repartidorId, longitud, latitud, velocidad || 0]);

        // 2. Obtener datos del pedido para conocer el punto de entrega
        const pedido = await orderRepository.findById(pedidoId);
        if (!pedido) return;

        // 3. Calcular distancia restante y ETA en tiempo real
        const distanciaMetros = geoService.calcularDistanciaMetros(
          latitud,
          longitud,
          pedido.latitud,
          pedido.longitud
        );
        const etaMinutos = geoService.estimarTiempoMinutos(distanciaMetros, velocidad || 25);
        const enGeocerca = geoService.estaEnGeocercaLlegada(distanciaMetros);

        // 4. Retransmitir posición y telemetría a los suscriptores del pedido
        io.to(`pedido_${pedidoId}`).emit('ubicacion_actualizada', {
          pedidoId,
          latitud,
          longitud,
          distanciaMetros,
          etaMinutos,
          enGeocerca,
          timestamp: new Date(),
        });

        // 5. Si entró en la geocerca de 100m y el pedido sigue "en_camino", notificar evento especial de llegada
        if (enGeocerca && pedido.estado === ESTADOS.EN_CAMINO) {
          io.to(`pedido_${pedidoId}`).emit('repartidor_en_puerta', {
            pedidoId,
            mensaje: '¡El repartidor se encuentra a menos de 100 metros de tu domicilio!',
            distanciaMetros,
          });
        }

      } catch (error) {
        console.error('❌ Error al procesar telemetría GPS:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
  });
};