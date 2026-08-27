-- src/db/migrations/008_crear_tabla_pagos.sql

DO $$ BEGIN
    CREATE TYPE metodo_pago AS ENUM ('mercadopago', 'efectivo', 'tarjeta_pos');
    CREATE TYPE estado_pago AS ENUM ('pendiente', 'aprobado', 'rechazado', 'reembolsado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    metodo_pago metodo_pago NOT NULL,
    estado estado_pago NOT NULL DEFAULT 'pendiente',
    monto NUMERIC(10, 2) NOT NULL,
    
    -- Campos específicos de Mercado Pago
    mp_preference_id VARCHAR(255),
    mp_payment_id VARCHAR(255),
    
    -- Campos específicos para pago en efectivo
    efectivo_paga_con NUMERIC(10, 2),
    efectivo_vuelto NUMERIC(10, 2),

    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pagos_pedido ON pagos(pedido_id);