// src/repositories/orderRepository.js
const db = require('../config/db');

class OrderRepository {
  async create({ clienteId, localId, direccionEntrega, latitud, longitud, montoTotal }) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insertar el pedido con coordenadas geoespaciales (PostGIS)
      const insertOrderQuery = `
        INSERT INTO pedidos (cliente_id, local_id, direccion_entrega, ubicacion_entrega, monto_total)
        VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)
        RETURNING id, estado, creado_en;
      `;
      const orderRes = await client.query(insertOrderQuery, [
        clienteId,
        localId,
        direccionEntrega,
        longitud,
        latitud,
        montoTotal,
      ]);

      const nuevoPedido = orderRes.rows[0];

      // 2. Registrar el estado inicial en el historial
      const insertHistoryQuery = `
        INSERT INTO pedido_historial_estados (pedido_id, estado, cambiado_por)
        VALUES ($1, $2, $3);
      `;
      await client.query(insertHistoryQuery, [nuevoPedido.id, nuevoPedido.estado, clienteId]);

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
    const query = `
      SELECT id, cliente_id, local_id, repartidor_id, estado, direccion_entrega,
             ST_X(ubicacion_entrega::geometry) AS longitud,
             ST_Y(ubicacion_entrega::geometry) AS latitud,
             monto_total, creado_en
      FROM pedidos WHERE id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  async assignDriver(pedidoId, repartidorId) {
    const query = `
      UPDATE pedidos 
      SET repartidor_id = $1, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $2 
      RETURNING id, repartidor_id, estado;
    `;
    const result = await db.query(query, [repartidorId, pedidoId]);
    return result.rows[0];
  }

  async updateStatus(pedidoId, nuevoEstado, usuarioId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Actualizar estado principal
      const updateQuery = `
        UPDATE pedidos 
        SET estado = $1, actualizado_en = CURRENT_TIMESTAMP 
        WHERE id = $2 
        RETURNING id, estado;
      `;
      const result = await client.query(updateQuery, [nuevoEstado, pedidoId]);

      // 2. Insertar evento en el historial de trazabilidad
      const historyQuery = `
        INSERT INTO pedido_historial_estados (pedido_id, estado, cambiado_por)
        VALUES ($1, $2, $3);
      `;
      await client.query(historyQuery, [pedidoId, nuevoEstado, usuarioId]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new OrderRepository();