// src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const errorHandler = require('./middlewares/errorHandler');
const productRoutes = require('./routes/productRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pedidos', orderRoutes);
app.use('/api/v1/locales/:localId/productos', productRoutes);


// Manejo de 404
app.use((req, res, next) => {
  res.status(404).json({
    status: 'fail',
    mensaje: `No se encontró la ruta ${req.originalUrl} en este servidor`,
  });
});

// Middleware de errores
app.use(errorHandler);

module.exports = app;