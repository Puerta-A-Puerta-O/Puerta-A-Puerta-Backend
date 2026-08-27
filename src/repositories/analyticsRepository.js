// src/repositories/analyticsRepository.js
const db = require('../config/db');

class AnalyticsRepository {
  /**
   * Resumen general de ventas en un rango de fechas
   */
  async getSalesSummary(localId, desde, hasta) {
    const query = `
      SELECT 
        COUNT(id) AS total_pedidos,
        COALESCE(SUM(monto_total), 0) AS ingresos_totales,
        COALESCE(AVG(monto_total), 0) AS ticket_promedio
      FROM pedidos
      WHERE local_id = $1 
        AND estado = 'entregado'
        AND creado_en BETWEEN $2 AND $3;
    `;
    const { rows } = await db.query(query, [localId, desde, hasta]);
    return rows[0];
  }

  /**
   * Desglose de ingresos por método de pago
   */
  async getPaymentMethodBreakdown(localId, desde, hasta) {
    const query = `
      SELECT 
        pago.metodo_pago,
        COUNT(pago.id) AS cantidad_transacciones,
        COALESCE(SUM(pago.monto), 0) AS total_monto
      FROM pagos pago
      JOIN pedidos p ON pago.pedido_id = p.id
      WHERE p.local_id = $1 
        AND pago.estado = 'aprobado'
        AND p.creado_en BETWEEN $2 AND $3
      GROUP BY pago.metodo_pago;
    `;
    const { rows } = await db.query(query, [localId, desde, hasta]);
    return rows;
  }

  /**
   * Ranking de productos más vendidos (utiliza pedido_items)
   */
  async getTopProducts(localId, desde, hasta, limit = 5) {
    const query = `
      SELECT 
        pr.id AS producto_id,
        pr.nombre,
        COALESCE(SUM(pi.cantidad), 0) AS total_unidades_vendidas,
        COALESCE(SUM(pi.precio_unitario * pi.cantidad), 0) AS total_recaudado
      FROM pedido_items pi
      JOIN pedidos p ON pi.pedido_id = p.id
      JOIN productos pr ON pi.producto_id = pr.id
      WHERE p.local_id = $1 
        AND p.estado = 'entregado'
        AND p.creado_en BETWEEN $2 AND $3
      GROUP BY pr.id, pr.nombre
      ORDER BY total_unidades_vendidas DESC
      LIMIT $4;
    `;
    const { rows } = await db.query(query, [localId, desde, hasta, limit]);
    return rows;
  }

  /**
   * Tiempos operativos promedio (en minutos)
   */
  async getOperationalTimes(localId, desde, hasta) {
    const query = `
      SELECT 
        COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (actualizado_en - creado_en)) / 60), 2), 0) AS tiempo_promedio_total_minutos
      FROM pedidos
      WHERE local_id = $1 
        AND estado = 'entregado'
        AND creado_en BETWEEN $2 AND $3;
    `;
    const { rows } = await db.query(query, [localId, desde, hasta]);
    return rows[0];
  }
}

module.exports = new AnalyticsRepository();