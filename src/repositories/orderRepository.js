// src/repositories/orderRepository.js
const db = require('../config/db');

class OrderRepository {
  /**
   * Crea un pedido con sus ítems en una sola transacción
   */
  async createOrder({ clienteId, localId, direccionEntrega, longitud, latitud, notas, items, montoTotal }) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // 1. Insertar cabecera del pedido
      const orderQuery = `
        INSERT INTO pedidos (
          cliente_id, local_id, direccion_entrega, ubicacion_entrega, notas, monto_total, estado
        )
        VALUES (
          $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7, 'creado'
        )
        RETURNING id, cliente_id, local_id, estado, monto_total, direccion_entrega, 
                  ST_X(ubicacion_entrega::geometry) AS longitud,
                  ST_Y(ubicacion_entrega::geometry) AS latitud,
                  notas, creado_en;
      `;
      const orderValues = [
        clienteId,
        localId,
        direccionEntrega,
        parseFloat(longitud),
        parseFloat(latitud),
        notas || null,
        parseFloat(montoTotal)
      ];

      const { rows: orderRows } = await client.query(orderQuery, orderValues);
      const pedido = orderRows[0];

      // 2. Insertar ítems en batch utilizando un solo INSERT dinámico (evita N consultas consecutivas)
      const itemValues = [];
      const itemValueClause = items.map((item, index) => {
        const offset = index * 5;
        const subtotal = parseFloat(item.cantidad) * parseFloat(item.precioUnitario);
        itemValues.push(pedido.id, item.productoId, item.cantidad, item.precioUnitario, subtotal);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
      }).join(', ');

      const itemsQuery = `
        INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES ${itemValueClause}
        RETURNING id, producto_id, cantidad, precio_unitario, subtotal;
      `;

      const { rows: itemsResult } = await client.query(itemsQuery, itemValues);

      await client.query('COMMIT');

      return {
        ...pedido,
        items: itemsResult
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene un pedido por su ID junto con el detalle de sus ítems
   */
  async findById(pedidoId) {
    const query = `
      SELECT p.id, p.cliente_id, p.local_id, p.repartidor_id, p.estado, p.monto_total, p.direccion_entrega,
             ST_X(p.ubicacion_entrega::geometry) AS longitud,
             ST_Y(p.ubicacion_entrega::geometry) AS latitud,
             p.notas, p.creado_en, p.actualizado_en,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', pi.id,
                   'producto_id', pi.producto_id,
                   'cantidad', pi.cantidad,
                   'precio_unitario', pi.precio_unitario,
                   'subtotal', pi.subtotal
                 )
               ) FILTER (WHERE pi.id IS NOT NULL), '[]'
             ) AS items
      FROM pedidos p
      LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
      WHERE p.id = $1
      GROUP BY p.id;
    `;
    const { rows } = await db.query(query, [pedidoId]);
    return rows[0] || null;
  }

  /**
   * Lista de pedidos filtrada opcionalmente por cliente_id o local_id
   */
  async findAll({ clienteId, localId } = {}) {
    let query = `
      SELECT p.id, p.cliente_id, p.local_id, p.repartidor_id, p.estado, p.monto_total, 
             p.direccion_entrega, p.notas, p.creado_en, p.actualizado_en
      FROM pedidos p
      WHERE 1=1
    `;
    const values = [];

    if (clienteId) {
      values.push(clienteId);
      query += ` AND p.cliente_id = $${values.length}`;
    }

    if (localId) {
      values.push(localId);
      query += ` AND p.local_id = $${values.length}`;
    }

    query += ` ORDER BY p.creado_en DESC;`;

    const { rows } = await db.query(query, values);
    return rows;
  }

  /**
   * Actualiza el estado del pedido y registra el cambio en el historial
   */
  async updateStatus(pedidoId, nuevoEstado, repartidorId = null, cambiadoPorId = null) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const updateQuery = `
        UPDATE pedidos
        SET estado = $1,
            repartidor_id = COALESCE($2, repartidor_id),
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, estado, repartidor_id AS "repartidorId", actualizado_en;
      `;
      const { rows } = await client.query(updateQuery, [nuevoEstado, repartidorId, pedidoId]);
      const pedidoActualizado = rows[0];

      const historyQuery = `
        INSERT INTO pedido_historial_estados (pedido_id, estado, cambiado_por)
        VALUES ($1, $2, $3);
      `;
      await client.query(historyQuery, [pedidoId, nuevoEstado, cambiadoPorId]);

      await client.query('COMMIT');
      return pedidoActualizado;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene el historial de ubicaciones/estados para el seguimiento del pedido
   */
  async getTrackingHistory(pedidoId) {
    const query = `
      SELECT id, estado, cambiado_por, creado_en
      FROM pedido_historial_estados
      WHERE pedido_id = $1
      ORDER BY creado_en ASC;
    `;
    const { rows } = await db.query(query, [pedidoId]);
    return rows;
  }
}

module.exports = new OrderRepository();