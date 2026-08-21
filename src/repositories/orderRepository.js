// src/repositories/orderRepository.js
const db = require('../config/db');

class OrderRepository {
  async create({ clienteId, localId, direccionEntrega, latitud, longitud, montoTotal, items }) {
    const query = `
      INSERT INTO pedidos (
        cliente_id, 
        local_id, 
        direccion_entrega, 
        ubicacion_entrega, 
        monto_total, 
        estado
      )
      VALUES (
        $1, 
        $2, 
        $3, 
        ST_SetSRID(ST_MakePoint($4, $5), 4326), 
        $6, 
        'creado'
      )
      RETURNING id, cliente_id, local_id, direccion_entrega, monto_total AS "montoTotal", estado, creado_en;
    `;

    const values = [clienteId, localId, direccionEntrega, longitud, latitud, montoTotal];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  async findById(id) {
    const query = `SELECT * FROM pedidos WHERE id = $1;`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }
}

module.exports = new OrderRepository();