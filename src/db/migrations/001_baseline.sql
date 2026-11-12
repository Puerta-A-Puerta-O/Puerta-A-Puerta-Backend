-- ============================================================
-- 001_baseline.sql
-- Esquema consolidado de Puerta a Puerta.
-- Idempotente: puede correrse sobre una base vacía o sobre una
-- base existente para normalizarla.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ------------------------------------------------------------
-- 1. Enumeraciones
-- ------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('cliente', 'repartidor', 'admin_local', 'superadmin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_pedido AS ENUM (
        'creado',
        'confirmado',
        'en_preparacion',
        'listo_para_entrega',
        'listo_para_retirar',
        'en_camino',
        'entregado',
        'cancelado'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Asegurar valores nuevos en bases creadas con el enum viejo.
DO $$ BEGIN ALTER TYPE estado_pedido ADD VALUE IF NOT EXISTS 'listo_para_entrega'; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE estado_pedido ADD VALUE IF NOT EXISTS 'listo_para_retirar'; EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE metodo_pago AS ENUM (
        'mercadopago',
        'efectivo',
        'tarjeta_pos',
        'transferencia',
        'qr_mostrador',
        'transferencia_confirmada'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TYPE metodo_pago ADD VALUE IF NOT EXISTS 'transferencia'; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE metodo_pago ADD VALUE IF NOT EXISTS 'qr_mostrador'; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE metodo_pago ADD VALUE IF NOT EXISTS 'transferencia_confirmada'; EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_pago AS ENUM ('pendiente', 'aprobado', 'rechazado', 'reembolsado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_repartidor AS ENUM ('offline', 'disponible', 'en_oferta', 'ocupado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- 2. Usuarios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(30),
    rol rol_usuario NOT NULL DEFAULT 'cliente',
    ultima_ubicacion GEOGRAPHY(Point, 4326),
    ultima_actualizacion TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultima_ubicacion GEOGRAPHY(Point, 4326);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultima_actualizacion TIMESTAMP WITH TIME ZONE;

-- ------------------------------------------------------------
-- 3. Locales
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    ubicacion GEOGRAPHY(Point, 4326) NOT NULL,
    cobertura GEOMETRY(Polygon, 4326),
    imagen_url TEXT,
    mp_access_token VARCHAR(255),
    alias_cbu VARCHAR(100),
    cbu VARCHAR(100),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE locales ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS cobertura GEOMETRY(Polygon, 4326);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS imagen_url TEXT;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS mp_access_token VARCHAR(255);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS alias_cbu VARCHAR(100);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS cbu VARCHAR(100);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Unificar poligono_cobertura (viejo) en cobertura (nuevo).
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'locales'
          AND column_name = 'poligono_cobertura'
    ) THEN
        EXECUTE 'UPDATE locales SET cobertura = poligono_cobertura WHERE cobertura IS NULL';
        EXECUTE 'DROP INDEX IF EXISTS idx_locales_poligono';
        EXECUTE 'ALTER TABLE locales DROP COLUMN poligono_cobertura';
    END IF;
END $$;

-- ------------------------------------------------------------
-- 4. Pertenencia de administradores a locales
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario_locales (
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, local_id)
);

-- ------------------------------------------------------------
-- 5. Categorías y productos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
    nombre VARCHAR(80) NOT NULL,
    descripcion TEXT,
    orden INT DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE categorias ADD COLUMN IF NOT EXISTS local_id UUID REFERENCES locales(id) ON DELETE CASCADE;
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS orden INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    disponible BOOLEAN DEFAULT true,
    imagen_url TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE productos ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- ------------------------------------------------------------
-- 6. Pedidos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES usuarios(id),
    local_id UUID NOT NULL REFERENCES locales(id),
    repartidor_id UUID REFERENCES usuarios(id),
    estado estado_pedido NOT NULL DEFAULT 'creado',
    direccion_entrega TEXT NOT NULL,
    ubicacion_entrega GEOGRAPHY(Point, 4326) NOT NULL,
    monto_total NUMERIC(10, 2) NOT NULL CHECK (monto_total >= 0),
    notas TEXT,
    esta_pagado BOOLEAN DEFAULT FALSE,
    requiere_cobro_en_entrega BOOLEAN DEFAULT FALSE,
    efectivo_paga_con NUMERIC(10, 2),
    oculto_cliente BOOLEAN DEFAULT FALSE,
    oculto_repartidor BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS esta_pagado BOOLEAN DEFAULT FALSE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS requiere_cobro_en_entrega BOOLEAN DEFAULT FALSE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS efectivo_paga_con NUMERIC(10, 2);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS oculto_cliente BOOLEAN DEFAULT FALSE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS oculto_repartidor BOOLEAN DEFAULT FALSE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- ------------------------------------------------------------
-- 7. Historial, telemetría e ítems
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedido_historial_estados (
    id BIGSERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    estado estado_pedido NOT NULL,
    cambiado_por UUID REFERENCES usuarios(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedido_ubicaciones (
    id BIGSERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    repartidor_id UUID NOT NULL REFERENCES usuarios(id),
    ubicacion GEOGRAPHY(Point, 4326) NOT NULL,
    velocidad_kms NUMERIC(5, 2),
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedido_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 8. Repartidores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repartidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    estado estado_repartidor NOT NULL DEFAULT 'offline',
    ultima_ubicacion GEOGRAPHY(Point, 4326),
    ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ubicaciones_repartidores (
    repartidor_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    ubicacion GEOGRAPHY(Point, 4326) NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 9. Pagos y eventos de webhook
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    metodo_pago metodo_pago NOT NULL,
    estado estado_pago NOT NULL DEFAULT 'pendiente',
    monto NUMERIC(10, 2) NOT NULL,
    mp_preference_id VARCHAR(255),
    mp_payment_id VARCHAR(255),
    efectivo_paga_con NUMERIC(10, 2),
    efectivo_vuelto NUMERIC(10, 2),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id BIGSERIAL PRIMARY KEY,
    proveedor VARCHAR(50) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    pago_id UUID REFERENCES pagos(id) ON DELETE SET NULL,
    resultado JSONB,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    procesado_en TIMESTAMP WITH TIME ZONE,
    UNIQUE (proveedor, event_id)
);

-- ------------------------------------------------------------
-- 10. Notificaciones y reseñas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispositivo_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fcm_token VARCHAR(500) NOT NULL UNIQUE,
    plataforma VARCHAR(20) DEFAULT 'android',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resenas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL UNIQUE REFERENCES pedidos(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    repartidor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    calificacion_local INT NOT NULL CHECK (calificacion_local BETWEEN 1 AND 5),
    comentario_local TEXT,
    calificacion_repartidor INT CHECK (calificacion_repartidor BETWEEN 1 AND 5),
    comentario_repartidor TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 11. Índices
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_locales_ubicacion ON locales USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_locales_cobertura ON locales USING GIST (cobertura);
CREATE INDEX IF NOT EXISTS idx_usuario_locales_local ON usuario_locales(local_id);
CREATE INDEX IF NOT EXISTS idx_productos_local ON productos(local_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_entrega ON pedidos USING GIST (ubicacion_entrega);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_repartidor ON pedidos(repartidor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_local_estado ON pedidos(local_id, estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_creado_en ON pedidos(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_historial_pedido ON pedido_historial_estados(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_ubicaciones_geo ON pedido_ubicaciones USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_pedido_ubicaciones_pedido ON pedido_ubicaciones(pedido_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_ultima_ubicacion ON usuarios USING GIST (ultima_ubicacion);
CREATE INDEX IF NOT EXISTS idx_repartidores_geo ON repartidores USING GIST (ultima_ubicacion);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_repartidores_geo ON ubicaciones_repartidores USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_pagos_pedido ON pagos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pagos_mp_payment ON pagos(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_usuario ON dispositivo_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_resenas_local ON resenas(local_id);
CREATE INDEX IF NOT EXISTS idx_resenas_repartidor ON resenas(repartidor_id);

-- ------------------------------------------------------------
-- 12. Control de migraciones
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    id VARCHAR(255) PRIMARY KEY,
    aplicada_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (id)
VALUES ('001_baseline.sql')
ON CONFLICT (id) DO NOTHING;
