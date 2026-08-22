// src/sockets/socketService.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_puerta_a_puerta_2026_super_seguro';

function init(server) {
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  // Middleware de Autenticación para Sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Acceso denegado. Token no proporcionado.'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Token inválido o expirado.'));
    }
  });

  // Manejo de eventos
  io.on('connection', (socket) => {
    // Unirse a la sala del pedido
    socket.on('unirse_pedido', ({ pedidoId }) => {
      socket.join(`pedido_${pedidoId}`);
    });

    // Emisión GPS del repartidor
    socket.on('actualizar_ubicacion', (data) => {
      const { pedidoId, latitud, longitud, velocidad } = data;
      io.to(`pedido_${pedidoId}`).emit('ubicacion_actualizada', {
        pedidoId,
        latitud,
        longitud,
        velocidad
      });
    });
  });

  return io;
}

module.exports = { init };