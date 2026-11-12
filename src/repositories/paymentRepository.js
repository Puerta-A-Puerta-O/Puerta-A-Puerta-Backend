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

  async updatePaymentStatusByPaymentId(paymentId, estado, preferenceId = null) {
    const query = `
      UPDATE pagos
      SET estado = $1,
          mp_preference_id = COALESCE(mp_preference_id, $3),
          actualizado_en = NOW()
      WHERE mp_payment_id = $2
      RETURNING *;
    `;
    const { rows } = await db.query(query, [estado, paymentId, preferenceId]);
    return rows[0];
  }

  async findByPedidoId(pedidoId) {
    const query = `SELECT * FROM pagos WHERE pedido_id = $1 ORDER BY creado_en DESC LIMIT 1;`;
    const { rows } = await db.query(query, [pedidoId]);
    return rows[0];
  }

  /**
   * Registra un evento de webhook. Devuelve null si ya había sido procesado.
   */
  async registerWebhookEvent({ proveedor, eventId, payload }) {
    const query = `
      INSERT INTO webhook_events (proveedor, event_id, payload)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (proveedor, event_id) DO NOTHING
      RETURNING id, proveedor, event_id, creado_en;
    `;
    const { rows } = await db.query(query, [proveedor, eventId, JSON.stringify(payload)]);
    return rows[0] || null;
  }

  async markWebhookEventProcessed(eventRowId, pagoId = null, resultado = null) {
    const query = `
      UPDATE webhook_events
      SET procesado_en = NOW(),
          pago_id = COALESCE($2, pago_id),
          resultado = $3::jsonb
      WHERE id = $1
      RETURNING id, procesado_en;
    `;
    const { rows } = await db.query(query, [
      eventRowId,
      pagoId,
      resultado ? JSON.stringify(resultado) : null,
    ]);
    return rows[0];
  }

  /**
   * Si falla el procesamiento, liberamos el evento para que Mercado Pago
   * pueda reintentarlo. Si lo dejáramos insertado, el reintento se
   * descartaría como duplicado y se perdería el pago.
   */
  async deleteWebhookEvent(eventRowId) {
    await db.query('DELETE FROM webhook_events WHERE id = $1;', [eventRowId]);
  }
}

module.exports = new PaymentRepository();
