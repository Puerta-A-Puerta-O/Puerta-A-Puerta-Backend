-- src/db/migrations/003_add_geofencing.sql

-- 1. Agregar columna de polígono a la tabla locales
ALTER TABLE locales 
ADD COLUMN IF NOT EXISTS poligono_cobertura GEOMETRY(Polygon, 4326);

-- 2. Crear índice espacial GiST para acelerar las consultas de intersección (ST_Contains / ST_Within)
CREATE INDEX IF NOT EXISTS idx_locales_poligono ON locales USING GIST (poligono_cobertura);