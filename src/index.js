// src/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db');
const initTrackingSockets = require('./sockets/tracking');
const authRoutes = require('./routes/authRoutes'); // <- Importamos las rutas de autenticación

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api/v1/auth', authRoutes); // <- Endpoints: /api/v1/auth/register y /api/v1/auth/login

// Ruta de prueba (Healthcheck)
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() AS hora_db, PostGIS_Version() AS postgis_v;');
    res.json({
      status: 'OK',
      mensaje: 'Servidor y Base de Datos Puerta a Puerta funcionando correctamente',
      hora_db: result.rows[0].hora_db,
      postgis_version: result.rows[0].postgis_v,
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', detalle: error.message });
  }
});

// Inicializar Sockets en vivo
initTrackingSockets(io);

// Arrancar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});