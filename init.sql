-- ==========================================
-- ESTRUCTURA INICIAL BASE DE DATOS: puertaApuerta_db
-- ==========================================

-- 1. Habilitar extensión geoespacial PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Enumeraciones de Tipos de Datos (Estados y Roles)
CREATE TYPE rol_usuario AS ENUM ('cliente', 'repartidor', 'admin_local', 'superadmin');
CREATE TYPE estado_pedido AS ENUM ('creado', 'confirmado', 'en_preparacion', 'listo_para_retirar', 'en_camino', 'entregado', 'cancelado');

-- 3. Tabla de Usuarios (Clientes, Repartidores, Administradores)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(30),
    rol rol_usuario NOT NULL DEFAULT 'cliente',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Locales (Restaurantes, Pizzerías, Locales comerciales)
CREATE TABLE locales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(120) NOT NULL,
    direccion TEXT NOT NULL,
    ubicacion GEOGRAPHY(Point, 4326) NOT NULL, -- Coordenadas (longitud, latitud)
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla Principal de Pedidos
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES usuarios(id),
    local_id UUID NOT NULL REFERENCES locales(id),
    repartidor_id UUID REFERENCES usuarios(id),
    estado estado_pedido NOT NULL DEFAULT 'creado',
    direccion_entrega TEXT NOT NULL,
    ubicacion_entrega GEOGRAPHY(Point, 4326) NOT NULL, -- Coordenadas de la casa del cliente
    monto_total NUMERIC(10, 2) NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Historial de Cambios de Estado del Pedido
CREATE TABLE pedido_historial_estados (
    id BIGSERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    estado estado_pedido NOT NULL,
    cambiado_por UUID REFERENCES usuarios(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Telemetría GPS en Tiempo Real (Rastro del Repartidor)
CREATE TABLE pedido_ubicaciones (
    id BIGSERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    repartidor_id UUID NOT NULL REFERENCES usuarios(id),
    ubicacion GEOGRAPHY(Point, 4326) NOT NULL, -- Posición actual del repartidor
    velocidad_kms NUMERIC(5, 2),
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ÍNDICES DE RENDIMIENTO Y GEOESPACIALES (GIST)
-- ==========================================

-- Búsqueda por proximidad rápida en mapa
CREATE INDEX idx_locales_ubicacion ON locales USING GIST (ubicacion);
CREATE INDEX idx_pedidos_entrega ON pedidos USING GIST (ubicacion_entrega);
CREATE INDEX idx_pedido_ubicaciones_geo ON pedido_ubicaciones USING GIST (ubicacion);

-- Consultas frecuentes en la App
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_repartidor_estado ON pedidos(repartidor_id, estado);
CREATE INDEX idx_ubicaciones_pedido_tiempo ON pedido_ubicaciones(pedido_id, registrado_en DESC);