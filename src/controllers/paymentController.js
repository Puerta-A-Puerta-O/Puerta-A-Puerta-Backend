// src/controllers/paymentController.js
const paymentService = require('../services/paymentService');

class PaymentController {
  async createPaymentIntent(req, res, next) {
    try {
      const { pedidoId, metodoPago, efectivoPagaCon } = req.body;

      if (!pedidoId || !metodoPago) {
        return res.status(400).json({ status: 'error', mensaje: 'pedidoId y metodoPago son requeridos' });
      }

      const resultado = await paymentService.processPaymentIntent({
        pedidoId,
        metodoPago,
        efectivoPagaCon
      });

      return res.status(201).json({
        status: 'success',
        data: resultado
      });
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req, res, next) {
    try {
      const { preferenceId, status, paymentId } = req.body;

      if (!preferenceId || !status) {
        return res.status(400).json({ status: 'error', mensaje: 'Faltan parámetros requeridos de la notificación' });
      }

      const pago = await paymentService.handleWebhookNotification({ preferenceId, status, paymentId });

      return res.status(200).json({
        status: 'success',
        mensaje: 'Webhook procesado correctamente',
        data: pago
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentQR(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const resultado = await paymentService.generatePaymentDetails(pedidoId, 'qr');
      return res.status(200).json({ status: 'success', data: resultado });
    } catch (error) {
      next(error);
    }
  }

  async confirmManualPayment(req, res, next) {
    try {
      const { pedidoId } = req.params;
      const { metodoPago } = req.body;
      const usuarioId = req.user.id;

      const pago = await paymentService.confirmManualPayment(pedidoId, usuarioId, metodoPago);
      return res.status(200).json({
        status: 'success',
        mensaje: 'Pago confirmado manualmente con éxito',
        data: pago
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();