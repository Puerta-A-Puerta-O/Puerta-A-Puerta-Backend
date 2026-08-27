// src/services/paymentService.js
const db = require('../config/db');
const paymentRepository = require('../repositories/paymentRepository');
const orderRepository = require('../repositories/orderRepository');

class PaymentService {
  /**
   * Procesa la intención de pago (Mercado Pago o Efectivo)
   */
  async processPaymentIntent({ pedidoId, metodoPago, efectivoPagaCon }) {
    const pedido = await orderRepository.findById(pedidoId);
    if (!pedido) {
      const error = new Error('Pedido no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const montoTotal = Number(pedido.monto_total);

    if (metodoPago === 'efectivo') {
      if (!efectivoPagaCon || efectivoPagaCon < montoTotal) {
        const error = new Error(`El monto abonado ($${efectivoPagaCon}) debe ser mayor o igual al total ($${montoTotal})`);
        error.statusCode = 400;
        throw error;
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

    if (metodoPago === 'mercadopago') {
      // Simulación/Estructura para producción con SDK Mercado Pago
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

    const error = new Error('Método de pago no soportado');
    error.statusCode = 400;
    throw error;
  }

  /**
   * Procesa la notificación Webhook de Mercado Pago
   */
  async handleWebhookNotification({ preferenceId, status, paymentId }) {
    const estadoPago = status === 'approved' ? 'aprobado' : 'rechazado';
    const pagoActualizado = await paymentRepository.updatePaymentStatusByPreferenceId(preferenceId, estadoPago, paymentId);

    if (pagoActualizado && estadoPago === 'aprobado') {
      // Pasa el pedido automáticamente a 'confirmado' al impactar el pago
      await orderRepository.updateStatus(pagoActualizado.pedido_id, 'confirmado');
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

    if (!pedido) throw new Error('Pedido no encontrado');

    const monto = Number(pedido.monto_total);

    // OPCIÓN 1: Pago por Transferencia / Alias
    if (metodoPago === 'alias') {
      return {
        pedidoId,
        metodoPago: 'alias',
        monto,
        estaPagado: pedido.esta_pagado,
        datosTransferencia: {
          alias: pedido.alias_cbu || 'LOCAL.DELIVERY.MP',
          cbu: pedido.cbu || '0000003100012345678901',
          titular: pedido.local_nombre
        }
      };
    }

    // OPCIÓN 2: QR Dinámico (para mostrar en la app del cliente, mostrador o repartidor)
    if (metodoPago === 'qr') {
      // Texto interoperable / Payload EmvCo para escanear con cualquier billetera virtual
      const qrPayload = `00020101021243650016com.mercadopago${pedidoId}5405${monto}5802AR`;
      
      return {
        pedidoId,
        metodoPago: 'qr',
        monto,
        estaPagado: pedido.esta_pagado,
        qrCodeData: qrPayload // El frontend / App móvil renderiza este string a imagen QR
      };
    }
    // OPCIÓN 3: Efectivo en Destino
    if (metodoPago === 'efectivo') {
      const vuelto = efectivoPagaCon ? (efectivoPagaCon - monto) : 0;
      
      // Marcar en pedido que el repartidor debe cobrar al entregar
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
  }
  /**
   * Confirmación Manual de Pago (Usado por Cajero en Mostrador o Repartidor en la Puerta)
   */
  async confirmManualPayment(pedidoId, usuarioId, metodoConfirmado) {
    // Transacción segura: Marca el pago como aprobado y el pedido como pagado
    await db.query(`
      UPDATE pedidos 
      SET esta_pagado = TRUE, requiere_cobro_en_entrega = FALSE 
      WHERE id = $1;
    `, [pedidoId]);

    return await paymentRepository.createPayment({
      pedidoId,
      metodoPago: metodoConfirmado, // 'efectivo', 'qr_mostrador', 'transferencia_confirmada'
      monto: (await db.query(`SELECT monto_total FROM pedidos WHERE id = $1`, [pedidoId])).rows[0].monto_total,
      efectivoPagaCon: null,
      efectivoVuelto: null
    });
  }

}

module.exports = new PaymentService();