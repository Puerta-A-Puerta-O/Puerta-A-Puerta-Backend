-- src/db/migrations/005_migracion_tabla_locales.sql

-- 1. Asegurar extensión espacial de PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Crear tabla de locales si no existe
CREATE TABLE IF NOT EXISTS locales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    imagen_url TEXT,
    ubicacion GEOMETRY(Point, 4326),
    cobertura GEOMETRY(Polygon, 4326),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Incorporar columnas individuales por si la tabla ya existía de migraciones previas
ALTER TABLE locales ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS nombre VARCHAR(150);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS direccion VARCHAR(255);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS imagen_url TEXT;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS ubicacion GEOMETRY(Point, 4326);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS cobertura GEOMETRY(Polygon, 4326);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 4. Crear índices GIST para optimizar búsquedas por radio y polígonos de cobertura (Geofencing)
CREATE INDEX IF NOT EXISTS idx_locales_ubicacion ON locales USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_locales_cobertura ON locales USING GIST (cobertura);