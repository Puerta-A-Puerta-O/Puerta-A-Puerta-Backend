// src/sockets/socketService.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const registerTrackingEvents = require('./tracking');

function init(server) {
  const io = new Server(server, {
    cors: {
      origin: env.cors.origins,
      credentials: true,
    },
  });

  // 1. Middleware de Autenticación para WebSockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Acceso denegado. Token no proporcionado.'));
    }

    try {
      const decoded = jwt.verify(token, env.jwt.secret);
      socket.usuario = decoded;
      return next();
    } catch (err) {
      return next(new Error('Token inválido o expirado.'));
    }
  });

  // 2. Registrar manejadores de eventos (Tracking, Telemetría, Geocercas)
  registerTrackingEvents(io);

  return io;
}

module.exports = { init };
