// src/repositories/paymentRepository.js
const db = require('../config/db');

class PaymentRepository {
  async createPayment({ pedidoId, metodoPago, monto, mpPreferenceId = null, efectivoPagaCon = null, efectivoVuelto = null }) {
    const query = `
      INSERT INTO pagos (pedido_id, metodo_pago, monto, mp_preference_id, efectivo_paga_con, efectivo_vuelto)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [pedidoId, metodoPago, monto, mpPreferenceId, efectivoPagaCon, efectivoVuelto];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  async updatePaymentStatusByPreferenceId(preferenceId, estado, paymentId = null) {
    const query = `
      UPDATE pagos
      SET estado = $1, mp_payment_id = COALESCE($2, mp_payment_id), actualizado_en = NOW()
      WHERE mp_preference_id = $3
      RETURNING *;
    `;
    const { rows } = await db.query(query, [estado, paymentId, preferenceId]);
    return rows[0];
  }

  async findByPedidoId(pedidoId) {
    const query = `SELECT * FROM pagos WHERE pedido_id = $1;`;
    const { rows } = await db.query(query, [pedidoId]);
    return rows[0];
  }
}

module.exports = new PaymentRepository();