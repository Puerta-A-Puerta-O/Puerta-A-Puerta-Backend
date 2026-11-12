// src/index.js
const http = require('http');
const env = require('./config/env');
const app = require('./app');
const socketService = require('./sockets/socketService');
const initAssignmentJob = require('./jobs/assignmentJob');

const server = http.createServer(app);

// Inicializar Socket.io y vincularlo con la app
const io = socketService.init(server);
app.set('io', io);
initAssignmentJob(app);

const PORT = env.port;

// Única llamada para levantar el servidor con HTTP, Express y WebSockets unificados
server.listen(PORT, () => {
  console.log(`🚀 Servidor y WebSockets corriendo en puerto ${PORT}`);
});
