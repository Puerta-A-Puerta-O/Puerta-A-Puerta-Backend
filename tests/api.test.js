// tests/api.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('🧪 Pruebas de Integración - API Puerta a Puerta', () => {
  let tokenCliente;
  let tokenAdminLocal;
  let localIdPrueba;
  let productoIdPrueba;
  let precioProductoPrueba;

  beforeAll(async () => {
    // 1. Obtener local de prueba desde la base de datos
    const localRes = await db.query('SELECT id FROM locales LIMIT 1;');
    if (localRes.rows.length > 0) {
      localIdPrueba = localRes.rows[0].id;
    }

    // 2. Obtener producto de prueba con su precio real
    const prodRes = await db.query('SELECT id, precio FROM productos LIMIT 1;');
    if (prodRes.rows.length > 0) {
      productoIdPrueba = prodRes.rows[0].id;
      precioProductoPrueba = Number(prodRes.rows[0].precio);
    }

    // 3. Autenticación de Cliente de prueba
    const resCliente = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'cliente@prueba.com',
        password: 'Password123!'
      });
    tokenCliente = resCliente.body.token || resCliente.body.data?.token;

    // 4. Autenticación de Admin de Local de prueba
    const resAdmin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'local@prueba.com', // Ajustá si en tu semilla el email es diferente
        password: 'Password123!'
      });
    tokenAdminLocal = resAdmin.body.token || resAdmin.body.data?.token;
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

    expect(res.statusCode).toEqual(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('id');

    const montoEsperado = precioProductoPrueba * cantidadPrueba;
    expect(Number(res.body.data.montoTotal)).toEqual(montoEsperado);
  });

  // 5. Transiciones de Estado del Pedido (PATCH)
  describe('PATCH /api/v1/pedidos/:pedidoId/estado - Transiciones de Estado', () => {
    let pedidoIdCreado;

    beforeEach(async () => {
      // Se crea un pedido fresco antes de cada prueba de transición
      const res = await request(app)
        .post('/api/v1/pedidos')
        .set('Authorization', `Bearer ${tokenCliente}`)
        .send({
          localId: localIdPrueba,
          direccionEntrega: 'Av. Corrientes 5000, CABA',
          latitud: -34.603722,
          longitud: -58.381592,
          items: [{ productoId: productoIdPrueba, cantidad: 1 }]
        });

      pedidoIdCreado = res.body.data.id;
    });

    // tests/api.test.js (alrededor de la línea 135)
    it('Debería permitir al local avanzar el estado a "confirmado" (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/pedidos/${pedidoIdCreado}/estado`)
        .set('Authorization', `Bearer ${tokenAdminLocal}`)
        .send({ estado: 'confirmado' });

      // Agregá esta línea para ver la razón exacta del 403:
      if (res.statusCode === 403) console.log('Detalle 403:', res.body);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.estado).toBe('confirmado');
    });

    it('Debería rechazar un salto de estado inválido (ej: creado -> entregado) con 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/pedidos/${pedidoIdCreado}/estado`)
        .set('Authorization', `Bearer ${tokenAdminLocal}`)
        .send({ estado: 'entregado' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
    });

    it('Debería rechazar la actualización si el usuario tiene rol de cliente (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/pedidos/${pedidoIdCreado}/estado`)
        .set('Authorization', `Bearer ${tokenCliente}`)
        .send({ estado: 'en_preparacion' });

      expect(res.statusCode).toEqual(403);
    });
  });
});