-- 1. Habilitar extensión PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Locales / Comercios
CREATE TABLE IF NOT EXISTS locales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    ubicacion GEOMETRY(Point, 4326) NOT NULL,
    cobertura GEOMETRY(Polygon, 4326),
    imagen_url VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar la columna de cobertura por si la tabla 'locales' ya existía antes
ALTER TABLE locales ADD COLUMN IF NOT EXISTS cobertura GEOMETRY(Polygon, 4326);

-- 4. Tabla de Productos
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    disponible BOOLEAN DEFAULT true,
    imagen_url VARCHAR(255),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Índices Espaciales y de Rendimiento
CREATE INDEX IF NOT EXISTS idx_locales_ubicacion ON locales USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_locales_cobertura ON locales USING GIST (cobertura);
CREATE INDEX IF NOT EXISTS idx_productos_local ON productos(local_id);