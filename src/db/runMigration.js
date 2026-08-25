const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'migrations', '002_add_postgis.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await db.query(sql);
    console.log('✅ Migración PostGIS ejecutada correctamente.');
  } catch (error) {
    console.error('❌ Error ejecutando la migración:', error);
  } finally {
    await db.pool.end();
  }
}

runMigration();