-- ==========================================
-- ESTRUCTURA OPTIMIZADA Y ESCALABLE
-- ==========================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- Enumeraciones
CREATE TYPE rol_usuario AS ENUM ('cliente', 'repartidor', 'admin_local', 'superadmin');
CREATE TYPE estado_pedido AS ENUM ('creado', 'confirmado', 'en_preparacion', 'listo_para_retirar', 'en_camino', 'entregado', 'cancelado');

-- 1. Tabla de Usuarios
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(30),
    rol rol_usuario NOT NULL DEFAULT 'cliente',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Locales
CREATE TABLE locales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(120) NOT NULL,
    direccion TEXT NOT NULL,
    ubicacion GEOGRAPHY(Point, 4326) NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Intermedia: Pertenencia de Usuarios/Administradores a Locales (Escalabilidad multi-local)
CREATE TABLE usuario_locales (
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, local_id)
);

-- 4. Categorías
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    nombre VARCHAR(80) NOT NULL,
    orden INT DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Productos
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    disponible BOOLEAN DEFAULT true,
    imagen_url TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Pedidos
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES usuarios(id),
    local_id UUID NOT NULL REFERENCES locales(id),
    repartidor_id UUID REFERENCES usuarios(id),
    estado estado_pedido NOT NULL DEFAULT 'creado',
    direccion_entrega TEXT NOT NULL,
    ubicacion_entrega GEOGRAPHY(Point, 4326) NOT NULL,
    monto_total NUMERIC(10, 2) NOT NULL CHECK (monto_total >= 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Historial de Estados
CREATE TABLE pedido_historial_estados (
    id BIGSERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    estado estado_pedido NOT NULL,
    cambiado_por UUID REFERENCES usuarios(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Ubicaciones / Telemetría GPS
CREATE TABLE pedido_ubicaciones (
    id BIGSERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    repartidor_id UUID NOT NULL REFERENCES usuarios(id),
    ubicacion GEOGRAPHY(Point, 4326) NOT NULL,
    velocidad_kms NUMERIC(5, 2),
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Ítems del Pedido (Congela precios al momento de la compra)
CREATE TABLE pedido_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices de Rendimiento
CREATE INDEX idx_usuario_locales_local ON usuario_locales(local_id);
CREATE INDEX idx_locales_ubicacion ON locales USING GIST (ubicacion);
CREATE INDEX idx_pedidos_entrega ON pedidos USING GIST (ubicacion_entrega);
CREATE INDEX idx_pedido_ubicaciones_geo ON pedido_ubicaciones USING GIST (ubicacion);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_local_estado ON pedidos(local_id, estado);