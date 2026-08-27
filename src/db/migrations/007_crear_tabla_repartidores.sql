-- src/db/migrations/007_crear_tabla_repartidores.sql

DO $$ BEGIN
    CREATE TYPE estado_repartidor AS ENUM ('offline', 'disponible', 'en_oferta', 'ocupado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS repartidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    estado estado_repartidor NOT NULL DEFAULT 'offline',
    ultima_ubicacion GEOGRAPHY(Point, 4326),
    ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repartidores_geo ON repartidores USING GIST (ultima_ubicacion);