// src/sockets/socketService.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const geoRepository = require('../repositories/geoRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_puerta_a_puerta_2026_super_seguro';

function init(server) {
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  // 1. Middleware de Autenticación para Sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Acceso denegado. Token no proporcionado.'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.usuario = decoded; // Normalizamos la propiedad usuario
      next();
    } catch (err) {
      next(new Error('Token inválido o expirado.'));
    }
  });

  // 2. Manejo de Conexiones y Eventos
  io.on('connection', (socket) => {
    // Escuchar cuando un usuario o cliente se une a la sala del pedido
    socket.on('unirse_pedido', ({ pedidoId }) => {
      if (pedidoId) {
        socket.join(`pedido_${pedidoId}`);
      }
    });

    // Emisión GPS del repartidor: Retransmisión en tiempo real + Persistencia en BD
    socket.on('actualizar_ubicacion', async (data) => {
      const { pedidoId, latitud, longitud, velocidad } = data;

      if (!pedidoId || latitud === undefined || longitud === undefined) {
        return;
      }

      // a. Re-transmitir en tiempo real a la sala del pedido
      io.to(`pedido_${pedidoId}`).emit('ubicacion_actualizada', {
        pedidoId,
        latitud,
        longitud,
        velocidad: velocidad || 0
      });

      // b. Persistir en la base de datos para el historial de tracking GPS
      try {
        const repartidorId = socket.usuario?.id || socket.usuario?.sub;
        if (repartidorId) {
          await geoRepository.saveDeliveryPoint(
            pedidoId,
            repartidorId,
            latitud,
            longitud,
            velocidad || 0
          );
        }
      } catch (err) {
        console.error('[GPS TRACKING ERROR] No se pudo guardar el punto:', err.message);
      }
    });
  });

  return io;
}

module.exports = { init };