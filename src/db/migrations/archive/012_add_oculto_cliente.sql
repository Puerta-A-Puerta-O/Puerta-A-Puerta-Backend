-- Migración: Agregar campos de ocultado (soft-delete) para cliente y repartidor
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS oculto_cliente BOOLEAN DEFAULT FALSE;

ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS oculto_repartidor BOOLEAN DEFAULT FALSE;