// src/db/migrate.js
// Runner de migraciones SQL. Ejecuta en orden todos los .sql de
// src/db/migrations que todavía no figuren en schema_migrations.
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDatabase(attempts = 20, delayMs = 1500) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await db.query('SELECT 1;');
      return;
    } catch (error) {
      lastError = error;
      console.log(`⏳ Esperando base de datos (${attempt}/${attempts})...`);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function run() {
  await waitForDatabase();

  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      aplicada_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const files = listMigrationFiles();

  if (files.length === 0) {
    console.log('ℹ️ No hay migraciones para ejecutar.');
    return;
  }

  for (const file of files) {
    const alreadyApplied = await db.query(
      'SELECT 1 FROM schema_migrations WHERE id = $1;',
      [file]
    );

    if (alreadyApplied.rows.length > 0) {
      console.log(`↷ ${file} (ya aplicada)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await db.getClient();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING;',
        [file]
      );
      await client.query('COMMIT');
      console.log(`✅ ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Error aplicando ${file}`);
      throw error;
    } finally {
      client.release();
    }
  }

  console.log('🎉 Migraciones aplicadas correctamente.');
}

run()
  .then(() => db.pool.end())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(error);
    try {
      await db.pool.end();
    } catch (_) {
      // ignoramos errores al cerrar el pool
    }
    process.exit(1);
  });
