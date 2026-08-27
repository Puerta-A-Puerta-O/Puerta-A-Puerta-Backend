// src/services/paymentService.js
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
}

module.exports = new PaymentService();