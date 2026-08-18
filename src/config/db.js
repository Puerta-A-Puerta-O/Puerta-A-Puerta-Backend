// src/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'puertaApuerta_db',
  user: process.env.DB_USER || 'dev_user',
  password: process.env.DB_PASSWORD || 'PuertaApuertaLocal2026!',
});

pool.on('connect', () => {
  console.log(' Conectado exitosamente a la base de datos PostgreSQL (puertaApuerta_db)');
});

pool.on('error', (err) => {
  console.error(' Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};