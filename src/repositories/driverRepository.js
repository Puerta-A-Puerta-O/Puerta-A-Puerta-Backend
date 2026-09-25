// src/repositories/driverRepository.js
const db = require('../config/db');

class DriverRepository {
  /**
   * Actualiza o inserta la ubicación geográfica del repartidor
   */
  async updateLocation(repartidorUsuarioId, latitud, longitud) {
    const query = `
      INSERT INTO ubicaciones_repartidores (repartidor_id, ubicacion, actualizado_en)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, CURRENT_TIMESTAMP)
      ON CONFLICT (repartidor_id) 
      DO UPDATE SET 
        ubicacion = EXCLUDED.ubicacion,
        actualizado_en = CURRENT_TIMESTAMP
      RETURNING repartidor_id, 
                ST_X(ubicacion::geometry) AS longitud, 
                ST_Y(ubicacion::geometry) AS latitud, 
                actualizado_en;
    `;
    const values = [repartidorUsuarioId, parseFloat(longitud), parseFloat(latitud)];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  /**
   * Obtiene la lista de pedidos disponibles para tomar
   */
  async findAvailableOrders() {
    const query = `
      SELECT p.id AS pedido_id, p.cliente_id, p.local_id, p.estado, p.monto_total, 
             p.direccion_entrega, p.notas, p.creado_en,
             l.nombre AS local_nombre,
             ST_X(l.ubicacion::geometry) AS local_longitud,
             ST_Y(l.ubicacion::geometry) AS local_latitud
      FROM pedidos p
      JOIN locales l ON p.local_id = l.id
      WHERE p.estado IN ('confirmado', 'en_preparacion', 'listo_para_retirar') 
        AND p.repartidor_id IS NULL
      ORDER BY p.creado_en ASC;
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  /**
   * Asigna un pedido disponible al repartidor
   */
  async assignOrder(pedidoId, repartidorUsuarioId) {
    const query = `
      UPDATE pedidos
      SET repartidor_id = $1,
          actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $2 AND repartidor_id IS NULL
      RETURNING id, estado, repartidor_id AS "repartidorId", actualizado_en;
    `;
    const { rows } = await db.query(query, [repartidorUsuarioId, pedidoId]);
    return rows[0] || null;
  }

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
        p.esta_pagado,
        p.requiere_cobro_en_entrega,
        p.efectivo_paga_con,
        p.creado_en,
        ROUND(EXTRACT(EPOCH FROM (NOW() - p.creado_en)) / 60) AS minutos_espera,
        ST_X(p.ubicacion_entrega::geometry) AS longitud,
        ST_Y(p.ubicacion_entrega::geometry) AS latitud,
        l.id AS local_id,
        l.nombre AS local_nombre,
        l.alias_cbu,
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