const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Puerta a Puerta API',
      version: '1.0.0',
      description: 'Documentación de la API Backend con soporte PostGIS para Geofencing y Tracking GPS en tiempo real.',
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Servidor Local de Desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Incluir todos los archivos de rutas para documentar
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJSDoc(options);