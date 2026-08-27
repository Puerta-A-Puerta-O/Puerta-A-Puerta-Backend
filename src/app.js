// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middlewares/errorHandler'); // Importar Middleware
const logger = require('./config/logger'); // Importar Logger

// Rutas
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const localRoutes = require('./routes/localRoutes');
const productRoutes = require('./routes/productRoutes');
const geoRoutes = require('./routes/geoRoutes');
const driverRoutes = require('./routes/driverRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

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

// Logging de peticiones HTTP en consola/archivos
app.use((req, res, next) => {
  if (!isTestEnv) {
    logger.info(`HTTP ${req.method} ${req.url}`);
  }
  next();
});

// Documentación Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Configuración de rutas anidadas (Productos bajo la jerarquía de Locales)
localRoutes.use('/:localId/productos', productRoutes);

// Rutas montadas
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/pedidos', orderRoutes);
app.use('/api/v1/locales', localRoutes);
app.use('/api/v1/telemetria', geoRoutes);
app.use('/api/v1/repartidores', driverRoutes);
app.use('/api/v1/pagos', paymentRoutes);
app.use('/api/v1/notificaciones', notificationRoutes);
app.use('/api/v1/resenas', reviewRoutes);

// Middleware de manejo global de errores (DEBE ir siempre al final de las rutas)
app.use(errorHandler);

module.exports = app;