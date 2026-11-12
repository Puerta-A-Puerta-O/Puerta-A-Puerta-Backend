-- src/db/migrations/009_actualizar_locales_y_pagos.sql

-- Credenciales de cobro del local (Mercado Pago / Alias)
ALTER TABLE locales 
ADD COLUMN IF NOT EXISTS mp_access_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS alias_cbu VARCHAR(100),
ADD COLUMN IF NOT EXISTS cbu VARCHAR(100);

-- Control de cobro en entrega/mostrador
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS esta_pagado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requiere_cobro_en_entrega BOOLEAN DEFAULT FALSE;