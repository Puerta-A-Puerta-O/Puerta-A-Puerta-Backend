// src/repositories/geoRepository.js
const db = require('../config/db');

class GeoRepository {
  // Convertir latitud y longitud a un objeto GEOGRAPHY de PostGIS (ST_MakePoint)
  // NOTA: PostGIS usa el orden (Longitud, Latitud) -> (X, Y)
  
  // 1. Actualizar posición actual del repartidor
  async updateDriverLocation(repartidorId, latitud, longitud) {
    const query = `
      UPDATE repartidores
      SET 
        ultima_ubicacion = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        ultima_actualizacion = NOW()
      WHERE id = $3
      RETURNING id, ST_Y(ultima_ubicacion::geometry) as latitud, ST_X(ultima_ubicacion::geometry) as longitud;
    `;
    const result = await db.query(query, [longitud, latitud, repartidorId]);
    return result.rows[0];
  }

  // 2. Obtener repartidores disponibles dentro de un radio en metros (ST_DWithin)
  async findNearbyAvailableDrivers(latitud, longitud, radioEnMetros = 5000) {
    const query = `
      SELECT 
        r.id,
        r.usuario_id,
        r.disponible,
        ST_Y(r.ultima_ubicacion::geometry) AS latitud,
        ST_X(r.ultima_ubicacion::geometry) AS longitud,
        ROUND(ST_Distance(r.ultima_ubicacion, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)) AS distancia_metros
      FROM repartidores r
      WHERE 
        r.disponible = true
        AND ST_DWithin(
          r.ultima_ubicacion,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      ORDER BY distancia_metros ASC;
    `;
    const result = await db.query(query, [longitud, latitud, radioEnMetros]);
    return result.rows;
  }

  // 3. Calcular distancia entre la tienda y el cliente para estimar el costo de envío
  async calculateDeliveryDistance(localId, latitudCliente, longitudCliente) {
    const query = `
      SELECT 
        ROUND(
          ST_Distance(
            l.ubicacion, 
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          )
        ) AS distancia_metros
      FROM locales l
      WHERE l.id = $3;
    `;
    const result = await db.query(query, [longitudCliente, latitudCliente, localId]);
    return result.rows[0]?.distancia_metros || 0;
  }

  // Buscar el repartidor disponible con el rol correspondiente más cercano al local
  async findNearestAvailableDriver(localId) {
    const query = `
      SELECT 
        u.id AS repartidor_id,
        u.nombre,
        u.email,
        ROUND(
          ST_Distance(
            u.ultima_ubicacion, 
            l.ubicacion
          )
        ) AS distancia_metros
      FROM usuarios u
      CROSS JOIN locales l
      WHERE l.id = $1
        AND u.rol = 'repartidor'
        AND u.ultima_ubicacion IS NOT NULL
        -- Filtra que el repartidor no tenga un pedido activo
        AND NOT EXISTS (
          SELECT 1 FROM pedidos p 
          WHERE p.repartidor_id = u.id 
            AND p.estado IN ('confirmado', 'en_preparacion', 'listo_para_retirar', 'en_camino')
        )
      ORDER BY distancia_metros ASC
      LIMIT 1;
    `;
    const result = await db.query(query, [localId]);
    return result.rows[0] || null;
  }
}


module.exports = new GeoRepository();