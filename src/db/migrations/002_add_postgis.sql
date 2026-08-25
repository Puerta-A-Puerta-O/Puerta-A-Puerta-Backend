-- src/db/migrations/002_add_postgis.sql

-- 1. Habilitar extensión espacial (por si no estuviera activa)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Asegurar columnas de tipo GEOGRAPHY
ALTER TABLE locales 
ADD COLUMN IF NOT EXISTS ubicacion GEOGRAPHY(Point, 4326);

ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS ubicacion_entrega GEOGRAPHY(Point, 4326);

ALTER TABLE pedido_ubicaciones 
ADD COLUMN IF NOT EXISTS ubicacion GEOGRAPHY(Point, 4326);

-- 3. Agregar última ubicación conocida en la tabla usuarios para búsquedas rápidas de repartidores cercanos
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS ultima_ubicacion GEOGRAPHY(Point, 4326),
ADD COLUMN IF NOT EXISTS ultima_actualizacion TIMESTAMP WITH TIME ZONE;

-- 4. Crear índices espaciales GiST
CREATE INDEX IF NOT EXISTS idx_locales_ubicacion ON locales USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_pedidos_entrega ON pedidos USING GIST (ubicacion_entrega);
CREATE INDEX IF NOT EXISTS idx_pedido_ubicaciones_geo ON pedido_ubicaciones USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_usuarios_ultima_ubicacion ON usuarios USING GIST (ultima_ubicacion);