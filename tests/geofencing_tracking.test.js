// tests/geofencing_tracking.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const geoRepository = require('../src/repositories/geoRepository');

describe('🌐 Pruebas de Geofencing y Tracking GPS', () => {
  let localId;
  let clienteId;
  let repartidorId;
  let pedidoId;

  // Polígono cuadrado de prueba alrededor de Córdoba Centro
  const poligonoCordoba = `
    POLYGON((
      -64.1950 -31.4100,
      -64.1700 -31.4100,
      -64.1700 -31.4250,
      -64.1950 -31.4250,
      -64.1950 -31.4100
    ))
  `;

  beforeAll(async () => {
    // 1. Crear local con polígono de cobertura
    const localRes = await db.query(`
      INSERT INTO locales (nombre, direccion, ubicacion, poligono_cobertura)
      VALUES (
        'Pizzería Geofenced', 
        'Av. Colón 500', 
        ST_SetSRID(ST_MakePoint(-64.1833, -31.4167), 4326)::geography,
        ST_GeomFromText($1, 4326)
      )
      RETURNING id;
    `, [poligonoCordoba]);
    localId = localRes.rows[0].id;

    // 2. Crear usuarios de prueba
    const clienteRes = await db.query(`
      INSERT INTO usuarios (nombre, email, password, rol)
      VALUES ('Cliente Geofence', 'cliente_geo_test@test.com', 'pass123', 'cliente')
      RETURNING id;
    `);
    clienteId = clienteRes.rows[0].id;

    const repRes = await db.query(`
      INSERT INTO usuarios (nombre, email, password, rol)
      VALUES ('Repartidor GPS', 'rep_gps@test.com', 'pass123', 'repartidor')
      RETURNING id;
    `);
    repartidorId = repRes.rows[0].id;
  });

  afterAll(async () => {
    // Limpieza
    await db.query('DELETE FROM pedido_ubicaciones WHERE repartidor_id = $1;', [repartidorId]);
    await db.query('DELETE FROM pedidos WHERE cliente_id = $1;', [clienteId]);
    await db.query('DELETE FROM usuarios WHERE id IN ($1, $2);', [clienteId, repartidorId]);
    await db.query('DELETE FROM locales WHERE id = $1;', [localId]);
    await db.pool.end();
  });

  describe('1. Validación de Geofencing (Polígono de Cobertura)', () => {
    it('Debería PERMITIR la entrega si la ubicación está DENTRO del polígono', async () => {
      // Coordenada dentro de Córdoba Centro (-31.4167, -64.1833)
      const enRango = await geoRepository.isLocationWithinCoverage(localId, -31.4167, -64.1833);
      expect(enRango).toBe(true);
    });

    it('Debería RECHAZAR la entrega si la ubicación está FUERA del polígono', async () => {
      // Coordenada fuera del cuadro (~10km de distancia)
      const enRango = await geoRepository.isLocationWithinCoverage(localId, -31.5000, -64.3000);
      expect(enRango).toBe(false);
    });
  });

  describe('2. Historial de Tracking GPS (`pedido_ubicaciones`)', () => {
    beforeAll(async () => {
      // Crear pedido de prueba para la telemetría
      const pedidoRes = await db.query(`
        INSERT INTO pedidos (cliente_id, local_id, repartidor_id, estado, direccion_entrega, ubicacion_entrega, monto_total)
        VALUES ($1, $2, $3, 'en_camino', 'Av. Siempre Viva 123', ST_SetSRID(ST_MakePoint(-64.1833, -31.4167), 4326)::geography, 2000)
        RETURNING id;
      `, [clienteId, localId, repartidorId]);
      pedidoId = pedidoRes.rows[0].id;
    });

    it('Debería registrar puntos en el historial y recuperarlos ordenados cronológicamente', async () => {
      // Insertar dos puntos de ruta
      await geoRepository.saveDeliveryPoint(pedidoId, repartidorId, -31.4170, -64.1840, 25.0);
      await geoRepository.saveDeliveryPoint(pedidoId, repartidorId, -31.4175, -64.1845, 30.0);

      const historial = await geoRepository.getOrderRouteHistory(pedidoId);

      expect(historial.length).toBe(2);
      expect(historial[0].latitud).toBeCloseTo(-31.4170, 4);
      expect(historial[1].velocidad_kms).toBe('30.00');
    });
  });
});