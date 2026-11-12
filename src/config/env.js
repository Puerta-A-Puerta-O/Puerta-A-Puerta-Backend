// src/config/env.js
// Validación centralizada de variables de entorno.
// Falla al arranque si falta algo crítico: es preferible no levantar
// antes que correr con secretos por defecto.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isTest = NODE_ENV === 'test';
const isProduction = NODE_ENV === 'production';

const errors = [];

function required(name, { minLength = 0 } = {}) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    errors.push(`${name} es obligatorio`);
    return null;
  }
  if (String(value).trim().length < minLength) {
    errors.push(`${name} debe tener al menos ${minLength} caracteres`);
    return null;
  }
  return String(value).trim();
}

const JWT_SECRET = required('JWT_SECRET', { minLength: 32 });
const FORBIDDEN_SECRETS = new Set([
  'secreto_puerta_a_puerta_2026_super_seguro',
  'secret',
  'changeme',
  'jwt_secret',
]);
if (JWT_SECRET && FORBIDDEN_SECRETS.has(JWT_SECRET)) {
  errors.push('JWT_SECRET no puede ser un valor por defecto o conocido');
}

const DB_HOST = required('DB_HOST');
const DB_NAME = required('DB_NAME');
const DB_USER = required('DB_USER');
const DB_PASSWORD = required('DB_PASSWORD');
const DB_PORT = Number(required('DB_PORT') || 0);

if (DB_PORT && (!Number.isInteger(DB_PORT) || DB_PORT < 1 || DB_PORT > 65535)) {
  errors.push('DB_PORT debe ser un puerto válido');
}

// En desarrollo permitimos orígenes locales; en producción la whitelist
// debe declararse explícitamente.
const defaultCorsOrigins = isProduction
  ? ''
  : 'http://localhost:3000,http://localhost:4000,http://localhost:5173,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:5173';

const corsOrigins = String(process.env.CORS_ORIGINS || defaultCorsOrigins)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (corsOrigins.length === 0) {
  errors.push('CORS_ORIGINS es obligatorio en producción (lista separada por comas)');
}

const mercadopagoWebhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  ? String(process.env.MERCADOPAGO_WEBHOOK_SECRET).trim()
  : null;

if (errors.length > 0) {
  throw new Error(
    `Configuración de entorno inválida:\n- ${errors.join('\n- ')}\n` +
      'Revisá .env.example y completá las variables requeridas.'
  );
}

module.exports = {
  NODE_ENV,
  isTest,
  isProduction,
  port: Number(process.env.PORT || 3000),
  jwt: {
    secret: JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  db: {
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  },
  cors: {
    origins: corsOrigins,
  },
  payments: {
    mercadopagoWebhookSecret,
  },
};
