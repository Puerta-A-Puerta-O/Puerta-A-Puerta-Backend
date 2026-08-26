-- src/db/migrations/006_ajustar_esquema_pedidos.sql

-- 1. Agregar columna de notas en pedidos por si no existía
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS notas TEXT;

-- 2. Asegurar que las restricciones e índices sobre pedidos e ítems coincidan con tu init.sql
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_local_estado ON pedidos(local_id, estado);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);