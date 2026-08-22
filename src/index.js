// src/index.js
const http = require('http');
const app = require('./app');
const socketService = require('./sockets/socketService');
require('dotenv').config();

const server = http.createServer(app);

// Inicializar Socket.io y vincularlo con la app
const io = socketService.init(server);
app.set('io', io);

const PORT = process.env.PORT || 3000;

// Única llamada para levantar el servidor con HTTP, Express y WebSockets unificados
server.listen(PORT, () => {
  console.log(`🚀 Servidor y WebSockets corriendo en puerto ${PORT}`);
});