// src/index.js

// src/index.js
const http = require('http');
const app = require('./app');
const socketService = require('./sockets/socketService');
require('dotenv').config();

const server = http.createServer(app);
socketService.init(server);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend escuchando en puerto ${PORT}`);
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
/*const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const errorHandler = require('./middlewares/errorHandler'); // <- Importar gestor global

const app = express();

app.use(cors());
app.use(express.json());

// Endpoints de la API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pedidos', orderRoutes);

// Capturar rutas no encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({
    status: 'fail',
    mensaje: `No se encontró la ruta ${req.originalUrl} en este servidor`,
  });
});

// Middleware Global de Manejo de Errores (Debe ir siempre al final)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend escuchando en puerto ${PORT}`);
});*/