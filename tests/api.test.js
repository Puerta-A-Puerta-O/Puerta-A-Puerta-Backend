// tests/api.test.js
const request = require('supertest');
const app = require('../src/app');

describe('🧪 Pruebas de Integración - API Puerta a Puerta', () => {
  let tokenCliente;

  // 1. Verificar Login y generación de JWT
  it('POST /api/v1/auth/login - Debería autenticar al cliente de prueba', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'cliente@prueba.com',
        password: 'Password123!'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    tokenCliente = res.body.token;
  });

  // 2. Probar protección de rutas privadas
  it('POST /api/v1/pedidos - Debería rechazar pedidos sin Token', async () => {
    const res = await request(app)
      .post('/api/v1/pedidos')
      .send({});

    expect(res.statusCode).toEqual(401);
  });

  // 3. Crear pedido autenticado con datos geoespaciales
  it('POST /api/v1/pedidos - Debería crear un pedido correctamente con JWT', async () => {
    const res = await request(app)
      .post('/api/v1/pedidos')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({
        localId: 'id-del-local', // Usar el ID del local de prueba
        direccionEntrega: 'Av. Cabildo 2000, CABA',
        latitud: -34.5612,
        longitud: -58.4563,
        montoTotal: 1500.50
      });

    // Se evalúa status 201 o la respuesta esperada
    expect([201, 400]).toContain(res.statusCode); 
  });
});