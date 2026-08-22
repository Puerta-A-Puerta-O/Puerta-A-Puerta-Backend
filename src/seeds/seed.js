// src/seeds/seed.js
const bcrypt = require('bcrypt');
const db = require('../config/db');

async function seed() {
  const client = await db.pool.connect();
  try {
    console.log('🌱 Iniciando la siembra de datos...');
    await client.query('BEGIN');

    // 1. Limpiar tablas en orden
    await client.query('TRUNCATE productos, categorias, pedidos, pedido_historial_estados, locales, usuarios RESTART IDENTITY CASCADE;');

    // 2. Crear Usuarios (Cliente, Admin de Local y Repartidor)
    const password = await bcrypt.hash('Password123!', 10);
    const insertUsersQuery = `
      INSERT INTO usuarios (nombre, email, password, telefono, rol)
      VALUES 
        ('Cliente Prueba', 'cliente@prueba.com', $1, '+541112345678', 'cliente'),
        ('Admin Local Prueba', 'local@prueba.com', $1, '+541155556666', 'admin_local'),
        ('Repartidor Prueba', 'repartidor@prueba.com', $1, '+541187654321', 'repartidor')
      RETURNING id, rol;
    `;
    await client.query(insertUsersQuery, [password]);

    // 3. Crear Local
    const insertLocalQuery = `
      INSERT INTO locales (nombre, direccion, ubicacion)
      VALUES ('Pizzería Don Remolo', 'Av. Corrientes 1234', ST_SetSRID(ST_MakePoint(-58.381592, -34.603722), 4326))
      RETURNING id;
    `;
    const localRes = await client.query(insertLocalQuery);
    const localId = localRes.rows[0].id;

    // 4. Crear Categoría y Producto
    const catRes = await client.query(
      `INSERT INTO categorias (local_id, nombre) VALUES ($1, 'Pizzas') RETURNING id;`,
      [localId]
    );
    const categoriaId = catRes.rows[0].id;

    await client.query(
      `INSERT INTO productos (local_id, categoria_id, nombre, descripcion, precio) 
       VALUES ($1, $2, 'Pizza Muzzarella', 'Salsa de tomate, muzzarella y aceitunas', 8500.00);`,
      [localId, categoriaId]
    );

    await client.query('COMMIT');
    console.log('🚀 Semillas y catálogo cargados exitosamente.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al poblar la base de datos:', error);
  } finally {
    client.release();
    process.exit();
  }
}

seed();