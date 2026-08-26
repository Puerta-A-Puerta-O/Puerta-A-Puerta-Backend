// src/repositories/orderRepository.js
const db = require('../config/db');

class OrderRepository {
  async createOrder({ clienteId, localId, direccionEntrega, longitud, latitud, notas, items, montoTotal }) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // 1. Cabecera del pedido (coincide con init.sql)
      const orderQuery = `
        INSERT INTO pedidos (
          cliente_id, local_id, direccion_entrega, ubicacion_entrega, notas, monto_total, estado
        )
        VALUES (
          $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7, 'creado'
        )
        RETURNING id, cliente_id, local_id, estado, monto_total, direccion_entrega, 
                  ST_X(ubicacion_entrega::geometry) as longitud,
                  ST_Y(ubicacion_entrega::geometry) as latitud,
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

      // 2. Detalle de ítems (pedido_items)
      const itemsResult = [];
      for (const item of items) {
        const subtotal = parseFloat(item.cantidad) * parseFloat(item.precioUnitario);
        const itemQuery = `
          INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, producto_id, cantidad, precio_unitario, subtotal;
        `;
        const itemValues = [pedido.id, item.productoId, item.cantidad, item.precioUnitario, subtotal];
        const { rows: itemRows } = await client.query(itemQuery, itemValues);
        itemsResult.push(itemRows[0]);
      }

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

  async findById(pedidoId) {
    const query = `
      SELECT p.id, p.cliente_id, p.local_id, p.repartidor_id, p.estado, p.monto_total, p.direccion_entrega,
             ST_X(p.ubicacion_entrega::geometry) as longitud,
             ST_Y(p.ubicacion_entrega::geometry) as latitud,
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
             ) as items
      FROM pedidos p
      LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
      WHERE p.id = $1
      GROUP BY p.id;
    `;
    const { rows } = await db.query(query, [pedidoId]);
    return rows[0];
  }

  async updateStatus(pedidoId, nuevoEstado, repartidorId = null, cambiadoPorId = null) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Actualiza estado y opcionalmente el repartidor asignado
      const updateQuery = `
        UPDATE pedidos
        SET estado = $1,
            repartidor_id = COALESCE($2, repartidor_id),
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, estado, repartidor_id as "repartidorId", actualizado_en;
      `;
      const { rows } = await client.query(updateQuery, [nuevoEstado, repartidorId, pedidoId]);
      const pedidoActualizado = rows[0];

      // Registro en auditoría
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
}

module.exports = new OrderRepository();