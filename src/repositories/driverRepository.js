// src/repositories/driverRepository.js
const db = require('../config/db');

class DriverRepository {
  /**
   * Obtiene los pedidos asignados/pendientes para optimización de ruta
   */
  async getOrdersForRouteOptimization(repartidorUsuarioId) {
    const query = `
      SELECT 
        p.id AS pedido_id,
        p.direccion_entrega,
        p.estado,
        p.monto_total,
        p.creado_en,
        ROUND(EXTRACT(EPOCH FROM (NOW() - p.creado_en)) / 60) AS minutos_espera,
        ST_X(p.ubicacion_entrega::geometry) AS longitud,
        ST_Y(p.ubicacion_entrega::geometry) AS latitud,
        l.id AS local_id,
        l.nombre AS local_nombre,
        ST_X(l.ubicacion::geometry) AS local_longitud,
        ST_Y(l.ubicacion::geometry) AS local_latitud
      FROM pedidos p
      JOIN locales l ON p.local_id = l.id
      WHERE p.repartidor_id = $1 
        AND p.estado IN ('listo_para_retirar', 'en_camino')
      ORDER BY p.creado_en ASC;
    `;
    const { rows } = await db.query(query, [repartidorUsuarioId]);
    return rows;
  }

  /**
   * Cambia el estado de disponibilidad del repartidor
   */
  async updateAvailability(usuarioId, estado) {
    const query = `
      INSERT INTO repartidores (usuario_id, estado)
      VALUES ($1, $2)
      ON CONFLICT (usuario_id) 
      DO UPDATE SET estado = EXCLUDED.estado, ultima_actualizacion = CURRENT_TIMESTAMP
      RETURNING id, usuario_id, estado;
    `;
    const { rows } = await db.query(query, [usuarioId, estado]);
    return rows[0];
  }
}

module.exports = new DriverRepository();