// tests/api.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('🧪 Pruebas de Integración - API Puerta a Puerta', () => {
  let tokenCliente;
  let localIdPrueba;

  // Obtener un local real de la base de datos antes de testear
  beforeAll(async () => {
    const res = await db.query('SELECT id FROM locales LIMIT 1;');
    if (res.rows.length > 0) {
      localIdPrueba = res.rows[0].id;
    }
  });

  // Cerrar el pool de la BD al terminar todos los tests
  afterAll(async () => {
    await db.pool.end();
  });

  // 1. Autenticación exitosa
  it('POST /api/v1/auth/login - Debería autenticar al cliente de prueba y devolver JWT', async () => {
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

  // 2. Protección de rutas sin Token
  it('POST /api/v1/pedidos - Debería rechazar peticiones sin token JWT (401)', async () => {
    const res = await request(app)
      .post('/api/v1/pedidos')
      .send({});

    expect(res.statusCode).toEqual(401);
  });

  // 3. Creación de Pedido con Geolocalización
  it('POST /api/v1/pedidos - Debería crear un pedido correctamente con token JWT', async () => {
    const res = await request(app)
      .post('/api/v1/pedidos')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({
        localId: localIdPrueba,
        direccionEntrega: 'Av. Corrientes 5000, CABA',
        latitud: -34.603722,
        longitud: -58.381592,
        montoTotal: 2500.00
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('id');
  });
});