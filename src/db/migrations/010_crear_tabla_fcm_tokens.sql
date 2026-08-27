-- src/db/migrations/010_crear_tabla_fcm_tokens.sql

CREATE TABLE IF NOT EXISTS dispositivo_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fcm_token VARCHAR(500) NOT NULL UNIQUE,
    plataforma VARCHAR(20) DEFAULT 'android', -- android, ios, web
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_usuario ON dispositivo_tokens(usuario_id);