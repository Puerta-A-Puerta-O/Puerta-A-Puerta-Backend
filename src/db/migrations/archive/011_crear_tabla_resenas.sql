-- src/db/migrations/011_crear_tabla_resenas.sql

CREATE TABLE IF NOT EXISTS resenas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL UNIQUE REFERENCES pedidos(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    repartidor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,

    -- Valoración del Comercio y Comida (1 a 5)
    calificacion_local INT NOT NULL CHECK (calificacion_local BETWEEN 1 AND 5),
    comentario_local TEXT,

    -- Valoración del Repartidor (1 a 5)
    calificacion_repartidor INT CHECK (calificacion_repartidor BETWEEN 1 AND 5),
    comentario_repartidor TEXT,

    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resenas_local ON resenas(local_id);
CREATE INDEX IF NOT EXISTS idx_resenas_repartidor ON resenas(repartidor_id);