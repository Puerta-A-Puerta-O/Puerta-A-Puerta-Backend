// src/seeds/seed.js
const bcrypt = require('bcrypt');
const db = require('../config/db');

async function seed() {
  const client = await db.pool.connect();
  try {
    console.log('🌱 Iniciando la siembra de datos de prueba...');
    await client.query('BEGIN');

    // 1. Limpiar tablas existentes
    await client.query('TRUNCATE pedidos, pedido_historial_estados, locales, usuarios RESTART IDENTITY CASCADE;');

    // 2. Crear Usuarios de prueba
    const passwordHash = await bcrypt.hash('Password123!', 10);
    
    const insertUsersQuery = `
      INSERT INTO usuarios (nombre, email, password_hash, rol)
      VALUES 
        ('Cliente Prueba', 'cliente@prueba.com', $1, 'cliente'),
        ('Repartidor Prueba', 'repartidor@prueba.com', $1, 'repartidor')
      RETURNING id, rol;
    `;
    const usersRes = await client.query(insertUsersQuery, [passwordHash]);
    console.log(`✅ Usuarios creados: ${usersRes.rows.length}`);

    // 3. Crear Local comercial con coordenadas PostGIS
    const insertLocalQuery = `
      INSERT INTO locales (nombre, direccion, ubicacion)
      VALUES ('Pizzería Don Remolo', 'Av. Corrientes 1234', ST_SetSRID(ST_MakePoint(-58.381592, -34.603722), 4326))
      RETURNING id, nombre;
    `;
    const localRes = await client.query(insertLocalQuery);
    console.log(`✅ Local creado: ${localRes.rows[0].nombre}`);

    await client.query('COMMIT');
    console.log('🚀 Semillas cargadas exitosamente.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al poblar la base de datos:', error);
  } finally {
    client.release();
    process.exit();
  }
}

seed();