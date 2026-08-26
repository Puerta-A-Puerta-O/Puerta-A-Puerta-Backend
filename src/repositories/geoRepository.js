// src/repositories/geoRepository.js
const db = require('../config/db');

class GeoRepository {
  // NOTA: PostGIS usa el orden (Longitud, Latitud) -> (X, Y)

  /**
   * 1. Actualizar la última posición GPS conocida del repartidor en la tabla usuarios
   */
  async updateDriverLocation(repartidorId, latitud, longitud) {
    const query = `
      UPDATE usuarios
      SET 
        ultima_ubicacion = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      WHERE id = $3 AND rol = 'repartidor'
      RETURNING id, ST_Y(ultima_ubicacion::geometry) as latitud, ST_X(ultima_ubicacion::geometry) as longitud;
    `;
    const result = await db.query(query, [parseFloat(longitud), parseFloat(latitud), repartidorId]);
    return result.rows[0];
  }

  /**
   * 2. Obtener repartidores disponibles dentro de un radio en metros (ST_DWithin)
   */
  async findNearbyAvailableDrivers(latitud, longitud, radioEnMetros = 5000) {
    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.email,
        ST_Y(u.ultima_ubicacion::geometry) AS latitud,
        ST_X(u.ultima_ubicacion::geometry) AS longitud,
        ROUND(ST_Distance(u.ultima_ubicacion, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)) AS distancia_metros
      FROM usuarios u
      WHERE 
        u.rol = 'repartidor'
        AND u.ultima_ubicacion IS NOT NULL
        AND ST_DWithin(
          u.ultima_ubicacion,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      ORDER BY distancia_metros ASC;
    `;
    const result = await db.query(query, [parseFloat(longitud), parseFloat(latitud), radioEnMetros]);
    return result.rows;
  }

  /**
   * 3. Calcular distancia entre el local y la ubicación del cliente
   */
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
    const result = await db.query(query, [parseFloat(longitudCliente), parseFloat(latitudCliente), localId]);
    return result.rows[0]?.distancia_metros || 0;
  }

  /**
   * 4. Buscar el repartidor disponible más cercano al local sin pedidos activos
   */
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

  /**
   * 5. Verifica si un punto (lat, lng) está dentro del polígono de cobertura del local
   */
  async isLocationWithinCoverage(localId, latitud, longitud) {
    const query = `
      SELECT 
        CASE 
          WHEN poligono_cobertura IS NULL THEN true
          ELSE ST_Contains(
            poligono_cobertura, 
            ST_SetSRID(ST_MakePoint($1, $2), 4326)
          )
        END AS en_cobertura
      FROM locales
      WHERE id = $3;
    `;
    const result = await db.query(query, [parseFloat(longitud), parseFloat(latitud), localId]);
    return result.rows[0]?.en_cobertura ?? false;
  }

  /**
   * 6. Guarda un punto GPS en el historial de telemetría del pedido (pedido_ubicaciones)
   */
  async saveDeliveryPoint(pedidoId, repartidorId, latitud, longitud, velocidadKms = 0) {
    const query = `
      INSERT INTO pedido_ubicaciones (pedido_id, repartidor_id, ubicacion, velocidad_kms)
      VALUES (
        $1, 
        $2, 
        ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, 
        $5
      )
      RETURNING id, pedido_id, repartidor_id,
                ST_X(ubicacion::geometry) as longitud,
                ST_Y(ubicacion::geometry) as latitud,
                velocidad_kms, registrado_en;
    `;
    const result = await db.query(query, [
      pedidoId, 
      repartidorId, 
      parseFloat(longitud), 
      parseFloat(latitud), 
      velocidadKms ? parseFloat(velocidadKms) : 0
    ]);
    return result.rows[0];
  }

  // Alias helper para mantener compatibilidad con el controlador
  async saveLocation({ pedidoId, repartidorId, latitud, longitud, velocidadKms }) {
    return this.saveDeliveryPoint(pedidoId, repartidorId, latitud, longitud, velocidadKms);
  }

  /**
   * 7. Obtiene la ruta completa realizada en un pedido
   */
  async getOrderRouteHistory(pedidoId) {
    const query = `
      SELECT 
        id,
        repartidor_id,
        ST_Y(ubicacion::geometry) AS latitud,
        ST_X(ubicacion::geometry) AS longitud,
        velocidad_kms,
        registrado_en
      FROM pedido_ubicaciones
      WHERE pedido_id = $1
      ORDER BY registrado_en ASC;
    `;
    const result = await db.query(query, [pedidoId]);
    return result.rows;
  }
}

module.exports = new GeoRepository();