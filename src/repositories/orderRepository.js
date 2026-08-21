// src/repositories/orderRepository.js
const db = require('../config/db');

class OrderRepository {
  async create({ clienteId, localId, direccionEntrega, latitud, longitud, montoTotal, items }) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Insertar el encabezado del pedido
      const insertOrderQuery = `
        INSERT INTO pedidos (
          cliente_id, local_id, direccion_entrega, ubicacion_entrega, monto_total, estado
        )
        VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, 'creado')
        RETURNING id, cliente_id, local_id, direccion_entrega, monto_total AS "montoTotal", estado, creado_en;
      `;
      const { rows } = await client.query(insertOrderQuery, [
        clienteId, localId, direccionEntrega, longitud, latitud, montoTotal
      ]);
      const nuevoPedido = rows[0];

      // 2. Insertar cada ítem validado
      const insertItemQuery = `
        INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES ($1, $2, $3, $4, $5);
      `;

      for (const item of items) {
        await client.query(insertItemQuery, [
          nuevoPedido.id,
          item.productoId,
          item.cantidad,
          item.precioUnitario,
          item.subtotal
        ]);
      }

      await client.query('COMMIT');
      return nuevoPedido;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id) {
    const query = `SELECT * FROM pedidos WHERE id = $1;`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }
}

module.exports = new OrderRepository();