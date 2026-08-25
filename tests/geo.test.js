// tests/geo.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const geoRepository = require('../src/repositories/geoRepository');
const assignmentService = require('../src/services/assignmentService');

describe('🌐 Pruebas Geográficas con PostGIS y Asignación', () => {
  let localId;
  let repartidorCercanoId;
  let repartidorLejanoId;
  let clienteId;

  beforeAll(async () => {
    // 1. Crear local en Córdoba Centro
    const localRes = await db.query(`
      INSERT INTO locales (nombre, direccion, ubicacion)
      VALUES ('Pizzería Centro', 'Av. Colón 100', ST_SetSRID(ST_MakePoint(-64.1833, -31.4167), 4326)::geography)
      RETURNING id;
    `);
    localId = localRes.rows[0].id;

    // 2. Crear Cliente
    const clienteRes = await db.query(`
      INSERT INTO usuarios (nombre, email, password, rol)
      VALUES ('Cliente Test', 'cliente_geo@test.com', 'pass123', 'cliente')
      RETURNING id;
    `);
    clienteId = clienteRes.rows[0].id;

    // 3. Crear repartidor CERCANO (a ~500m del local)
    const repCercano = await db.query(`
      INSERT INTO usuarios (nombre, email, password, rol, ultima_ubicacion)
      VALUES ('Repartidor Cerca', 'cerca@test.com', 'pass123', 'repartidor', ST_SetSRID(ST_MakePoint(-64.1850, -31.4170), 4326)::geography)
      RETURNING id;
    `);
    repartidorCercanoId = repCercano.rows[0].id;

    // 4. Crear repartidor LEJANO (a ~5km del local)
    const repLejano = await db.query(`
      INSERT INTO usuarios (nombre, email, password, rol, ultima_ubicacion)
      VALUES ('Repartidor Lejos', 'lejos@test.com', 'pass123', 'repartidor', ST_SetSRID(ST_MakePoint(-64.2200, -31.4100), 4326)::geography)
      RETURNING id;
    `);
    repartidorLejanoId = repLejano.rows[0].id;
  });

  afterAll(async () => {
    // Limpieza de datos creados en el test
    await db.query('DELETE FROM usuarios WHERE email IN ($1, $2, $3);', [
      'cliente_geo@test.com',
      'cerca@test.com',
      'lejos@test.com'
    ]);
    await db.query('DELETE FROM locales WHERE id = $1;', [localId]);
    await db.pool.end();
  });

  it('Debería seleccionar automáticamente al repartidor más cercano', async () => {
    // Buscar directamente desde el repositorio
    const repartidorEncontrado = await geoRepository.findNearestAvailableDriver(localId);

    expect(repartidorEncontrado).toBeDefined();
    expect(repartidorEncontrado.repartidor_id).toBe(repartidorCercanoId);
  });

  it('Debería asignar el repartidor más cercano a un pedido en estado confirmado', async () => {
    // Crear pedido 'confirmado' sin repartidor
    const pedidoRes = await db.query(`
      INSERT INTO pedidos (cliente_id, local_id, estado, direccion_entrega, ubicacion_entrega, monto_total)
      VALUES ($1, $2, 'confirmado', 'Calle Falsa 123', ST_SetSRID(ST_MakePoint(-64.1888, -31.4201), 4326)::geography, 1500)
      RETURNING id;
    `, [clienteId, localId]);

    const pedidoId = pedidoRes.rows[0].id;

    // Ejecutar asignación
    const result = await assignmentService.assignDriverToOrder(pedidoId, null);

    expect(result.success).toBe(true);
    expect(result.repartidorId).toBe(repartidorCercanoId);

    // Limpieza del pedido
    await db.query('DELETE FROM pedidos WHERE id = $1;', [pedidoId]);
  });
});