// tests/api.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('🧪 Pruebas de Integración - API Puerta a Puerta', () => {
  let tokenCliente;
  let localIdPrueba;
  let productoIdPrueba;
  let precioProductoPrueba;

  beforeAll(async () => {
    // Obtener un local de prueba
    const localRes = await db.query('SELECT id FROM locales LIMIT 1;');
    if (localRes.rows.length > 0) {
      localIdPrueba = localRes.rows[0].id;
    }

    // Obtener un producto real cargado por las semillas
    const prodRes = await db.query('SELECT id, precio FROM productos LIMIT 1;');
    if (prodRes.rows.length > 0) {
      productoIdPrueba = prodRes.rows[0].id;
      precioProductoPrueba = Number(prodRes.rows[0].precio);
    }
  });

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

  // 2. Protección de rutas sin Token (401)
  it('POST /api/v1/pedidos - Debería rechazar peticiones sin token JWT (401)', async () => {
    const res = await request(app)
      .post('/api/v1/pedidos')
      .send({});

    expect(res.statusCode).toEqual(401);
  });

  // 3. RBAC: Control de Acceso por Rol (403 Forbidden)
  it('POST /api/v1/locales/:localId/productos - Debería prohibir la creación de productos a un cliente (403)', async () => {
    const res = await request(app)
      .post(`/api/v1/locales/${localIdPrueba}/productos`)
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({
        nombre: 'Producto No Autorizado',
        precio: 1000.00
      });

    expect(res.statusCode).toEqual(403);
    expect(res.body.status).toBe('fail');
  });

  // 4. Creación de Pedido con Cálculo Dinámico de Monto
  it('POST /api/v1/pedidos - Debería calcular dinámicamente el monto total basado en los ítems', async () => {
    const cantidadPrueba = 2;

    const res = await request(app)
      .post('/api/v1/pedidos')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({
        localId: localIdPrueba,
        direccionEntrega: 'Av. Corrientes 5000, CABA',
        latitud: -34.603722,
        longitud: -58.381592,
        items: [
          {
            productoId: productoIdPrueba,
            cantidad: cantidadPrueba
          }
        ]
      });
    console.log('Respuesta del error 400:', res.body);
    expect(res.statusCode).toEqual(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('id');

    // Verificar que el monto total sea exacto al (precio_unitario * cantidad)
    const montoEsperado = precioProductoPrueba * cantidadPrueba;
    expect(Number(res.body.data.montoTotal)).toEqual(montoEsperado);
  });
});