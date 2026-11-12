// src/services/paymentService.js
const crypto = require('crypto');
const db = require('../config/db');
const env = require('../config/env');
const paymentRepository = require('../repositories/paymentRepository');
const orderRepository = require('../repositories/orderRepository');
const httpError = require('../utils/httpError');

const METODOS_CONFIRMABLES = ['efectivo', 'qr_mostrador', 'transferencia_confirmada'];
const METODOS_INTENT = ['efectivo', 'mercadopago'];

function mapMercadoPagoStatus(status) {
  switch (status) {
    case 'approved':
      return 'aprobado';
    case 'rejected':
    case 'cancelled':
      return 'rechazado';
    case 'refunded':
    case 'charged_back':
      return 'reembolsado';
    default:
      return 'pendiente';
  }
}

class PaymentService {
  /**
   * Procesa la intención de pago (Mercado Pago o Efectivo)
   */
  async processPaymentIntent({ pedidoId, metodoPago, efectivoPagaCon }) {
    if (!METODOS_INTENT.includes(metodoPago)) {
      throw httpError('Método de pago no soportado', 400);
    }

    const pedido = await orderRepository.findById(pedidoId);
    if (!pedido) {
      throw httpError('Pedido no encontrado', 404);
    }

    const montoTotal = Number(pedido.monto_total);

    if (metodoPago === 'efectivo') {
      if (!efectivoPagaCon || efectivoPagaCon < montoTotal) {
        throw httpError(
          `El monto abonado ($${efectivoPagaCon}) debe ser mayor o igual al total ($${montoTotal})`,
          400
        );
      }

      const vuelto = efectivoPagaCon - montoTotal;

      const pago = await paymentRepository.createPayment({
        pedidoId,
        metodoPago: 'efectivo',
        monto: montoTotal,
        efectivoPagaCon,
        efectivoVuelto: vuelto
      });

      return {
        tipo: 'efectivo',
        pago,
        mensaje: `Pago registrado en efectivo. Vuelto a entregar: $${vuelto.toFixed(2)}`
      };
    }

    // Mercado Pago: se deja la estructura lista para reemplazar por el SDK
    // y una preferencia real. El webhook ya exige firma e idempotencia.
    const mockPreferenceId = `PREF-${Date.now()}-${pedidoId.slice(0, 8)}`;
    const initPoint = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${mockPreferenceId}`;

    const pago = await paymentRepository.createPayment({
      pedidoId,
      metodoPago: 'mercadopago',
      monto: montoTotal,
      mpPreferenceId: mockPreferenceId
    });

    return {
      tipo: 'mercadopago',
      pago,
      preferenceId: mockPreferenceId,
      initPoint
    };
  }

  /**
   * Verifica la firma HMAC de Mercado Pago.
   * Manifiesto oficial: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
   */
  verifyWebhookSignature({ headers, dataId, secret }) {
    if (!secret || !dataId) return false;

    const signatureHeader = headers['x-signature'];
    const requestId = headers['x-request-id'];

    if (!signatureHeader || !requestId) return false;

    const parts = String(signatureHeader)
      .split(',')
      .map((part) => part.trim().split('='))
      .filter((pair) => pair.length === 2);

    const signature = Object.fromEntries(parts);
    const ts = signature.ts;
    const receivedHash = signature.v1;

    if (!ts || !receivedHash) return false;

    const timestamp = Number(ts);
    if (!Number.isFinite(timestamp)) return false;

    const maxSkewSeconds = env.isTest ? Number.MAX_SAFE_INTEGER : 10 * 60;
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestamp) > maxSkewSeconds) return false;

    const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedHash, 'utf8');
    const receivedBuffer = Buffer.from(receivedHash, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  /**
   * Procesa una notificación ya verificada, de forma idempotente.
   */
  async processWebhookEvent({ payload, headers, query }) {
    const type = payload.type || payload.topic || 'payment';
    const dataId = String(
      query?.['data.id'] ||
      payload.data?.id ||
      payload.dataId ||
      payload.paymentId ||
      payload.id ||
      ''
    );
    const requestId = headers['x-request-id'] || '';

    const rawPayload = JSON.stringify(payload || {});
    const fallbackId = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const eventId = requestId || fallbackId;

    const eventRow = await paymentRepository.registerWebhookEvent({
      proveedor: 'mercadopago',
      eventId: `${type}:${dataId || 'sin-data-id'}:${eventId}`,
      payload,
    });

    // Evento repetido: respondemos OK sin volver a impactar el pago.
    if (!eventRow) {
      return { duplicado: true };
    }

    try {
      const estadoPago = mapMercadoPagoStatus(
        payload.status || payload.data?.status || payload.action
      );

      const preferenceId =
        payload.external_reference ||
        payload.preferenceId ||
        payload.data?.external_reference ||
        payload.data?.preference_id ||
        null;

      let pago = null;

      if (preferenceId) {
        pago = await paymentRepository.updatePaymentStatusByPreferenceId(
          preferenceId,
          estadoPago,
          dataId || null
        );
      } else if (dataId) {
        pago = await paymentRepository.updatePaymentStatusByPaymentId(dataId, estadoPago);
      }

      if (pago && estadoPago === 'aprobado') {
        // Pasa el pedido a 'confirmado' solo si todavía no había avanzado.
        const pedido = await orderRepository.findById(pago.pedido_id);
        if (pedido && pedido.estado === 'creado') {
          await orderRepository.updateStatus(pedido.id, 'confirmado');
        }
      }

      await paymentRepository.markWebhookEventProcessed(
        eventRow.id,
        pago?.id || null,
        { estadoPago, preferenceId, dataId }
      );

      return { duplicado: false, estadoPago, pago };
    } catch (error) {
      // Si el procesamiento falla, liberamos el evento para que el
      // proveedor pueda reintentar. Dejarlo insertado haría que el
      // reintento se descarte como duplicado y se pierda el pago.
      try {
        await paymentRepository.deleteWebhookEvent(eventRow.id);
      } catch (cleanupError) {
        console.error(
          'No se pudo liberar el evento de webhook tras un fallo:',
          cleanupError.message
        );
      }

      throw error;
    }
  }

  /**
   * Compatibilidad con el flujo anterior (sin firma). No debe exponerse
   * directamente a Internet.
   */
  async handleWebhookNotification({ preferenceId, status, paymentId }) {
    const estadoPago = mapMercadoPagoStatus(status);
    const pagoActualizado = await paymentRepository.updatePaymentStatusByPreferenceId(
      preferenceId,
      estadoPago,
      paymentId
    );

    if (pagoActualizado && estadoPago === 'aprobado') {
      const pedido = await orderRepository.findById(pagoActualizado.pedido_id);
      if (pedido && pedido.estado === 'creado') {
        await orderRepository.updateStatus(pagoActualizado.pedido_id, 'confirmado');
      }
    }

    return pagoActualizado;
  }

  /**
   * Genera la información de cobro (QR, Alias o Efectivo en destino)
   */
  async generatePaymentDetails(pedidoId, metodoPago, efectivoPagaCon = null) {
    const query = `
      SELECT p.id, p.monto_total, p.esta_pagado, l.alias_cbu, l.cbu, l.nombre AS local_nombre
      FROM pedidos p
      JOIN locales l ON p.local_id = l.id
      WHERE p.id = $1;
    `;
    const { rows } = await db.query(query, [pedidoId]);
    const pedido = rows[0];

    if (!pedido) throw httpError('Pedido no encontrado', 404);

    const monto = Number(pedido.monto_total);

    // OPCIÓN 1: Pago por Transferencia / Alias
    if (metodoPago === 'alias' || metodoPago === 'transferencia') {
      return {
        pedidoId,
        metodoPago: 'alias',
        monto,
        estaPagado: pedido.esta_pagado,
        datosTransferencia: {
          alias: pedido.alias_cbu || 'LOCAL.DELIVERY.MP',
          cbu: pedido.cbu || '0000003100012345678901',
          titular: pedido.local_nombre,
          importe: monto,
        }
      };
    }

    // OPCIÓN 2: QR Dinámico (para mostrar en la app del cliente, mostrador o repartidor)
    if (metodoPago === 'qr') {
      const qrPayload = `00020101021243650016com.mercadopago${pedidoId}5405${monto}5802AR`;

      return {
        pedidoId,
        metodoPago: 'qr',
        monto,
        estaPagado: pedido.esta_pagado,
        qrCodeData: qrPayload
      };
    }

    // OPCIÓN 3: Efectivo en Destino
    if (metodoPago === 'efectivo') {
      const vuelto = efectivoPagaCon ? Number(efectivoPagaCon) - monto : 0;

      await db.query(`UPDATE pedidos SET requiere_cobro_en_entrega = TRUE WHERE id = $1`, [pedidoId]);

      return {
        pedidoId,
        metodoPago: 'efectivo',
        monto,
        estaPagado: false,
        efectivoPagaCon,
        vueltoAEntregar: vuelto > 0 ? vuelto : 0
      };
    }

    throw httpError('Método de cobro no soportado', 400);
  }

  /**
   * Confirmación Manual de Pago (Usado por Cajero en Mostrador o Repartidor en la Puerta)
   */
  async confirmManualPayment(pedidoId, usuarioId, metodoConfirmado) {
    if (!METODOS_CONFIRMABLES.includes(metodoConfirmado)) {
      throw httpError(
        `El método de confirmación debe ser uno de: ${METODOS_CONFIRMABLES.join(', ')}`,
        400
      );
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        'SELECT id, monto_total, esta_pagado FROM pedidos WHERE id = $1 FOR UPDATE;',
        [pedidoId]
      );
      const pedido = rows[0];

      if (!pedido) throw httpError('Pedido no encontrado', 404);

      await client.query(
        `UPDATE pedidos
         SET esta_pagado = TRUE, requiere_cobro_en_entrega = FALSE, actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1;`,
        [pedidoId]
      );

      const pagoRes = await client.query(
        `INSERT INTO pagos (pedido_id, metodo_pago, monto, estado)
         VALUES ($1, $2, $3, 'aprobado')
         RETURNING *;`,
        [pedidoId, metodoConfirmado, pedido.monto_total]
      );

      await client.query('COMMIT');
      return pagoRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new PaymentService();
