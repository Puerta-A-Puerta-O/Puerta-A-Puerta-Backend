// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Rutas
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes'); // Importamos productRoutes

const app = express();

// 1. Seguridad de Cabeceras HTTP
app.use(helmet());

// Desactivar limitadores durante la ejecución de tests
const isTestEnv = process.env.NODE_ENV === 'test';

// 2. Limitadores de Rate Limit
const limiterGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: {
    status: 'fail',
    message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.'
  }
});
app.use('/api/', limiterGlobal);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: {
    status: 'fail',
    message: 'Demasiados intentos de inicio de sesión. Cuenta bloqueada temporalmente por 15 minutos.'
  }
});

// Middlewares Base
app.use(cors());
app.use(express.json());

// Documentación Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas montadas
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/pedidos', orderRoutes);
app.use('/api/v1/locales/:localId/productos', productRoutes); // Mapeo anidado directo

module.exports = app;