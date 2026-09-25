// src/sockets/socketService.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const registerTrackingEvents = require('./tracking');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_puerta_a_puerta_2026_super_seguro';

function init(server) {
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  // 1. Middleware de Autenticación para WebSockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Acceso denegado. Token no proporcionado.'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.usuario = decoded;
      next();
    } catch (err) {
      next(new Error('Token inválido o expirado.'));
    }
  });

  // 2. Registrar manejadores de eventos (Tracking, Telemetría, Geocercas)
  registerTrackingEvents(io);

  return io;
}

module.exports = { init };