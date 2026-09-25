-- 1. Crear tipo ENUM para estado del repartidor (si no existe)
DO $$ BEGIN
    CREATE TYPE estado_repartidor AS ENUM ('offline', 'disponible', 'en_oferta', 'ocupado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabla de Repartidores (Estado y Disponibilidad)
CREATE TABLE IF NOT EXISTS repartidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    estado estado_repartidor NOT NULL DEFAULT 'offline',
    ultima_ubicacion GEOGRAPHY(Point, 4326),
    ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repartidores_geo ON repartidores USING GIST (ultima_ubicacion);

-- 3. Tabla para la última ubicación activa (para búsquedas directas en tiempo real)
CREATE TABLE IF NOT EXISTS ubicaciones_repartidores (
    repartidor_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    ubicacion GEOGRAPHY(Point, 4326) NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ubicaciones_repartidores_geo 
ON ubicaciones_repartidores USING GIST (ubicacion);

-- 4. Asegurar columnas de cobros e información del local para optimización de rutas
ALTER TABLE locales 
ADD COLUMN IF NOT EXISTS alias_cbu VARCHAR(100),
ADD COLUMN IF NOT EXISTS cbu VARCHAR(100);

ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS esta_pagado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requiere_cobro_en_entrega BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS efectivo_paga_con NUMERIC(10, 2);