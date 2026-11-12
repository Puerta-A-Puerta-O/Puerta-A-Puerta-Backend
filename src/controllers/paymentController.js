// src/controllers/paymentController.js
const paymentService = require('../services/paymentService');
const env = require('../config/env');

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
      const secret = env.payments.mercadopagoWebhookSecret;

      if (!secret) {
        return res.status(503).json({
          status: 'error',
          mensaje: 'El webhook de pagos no está configurado (falta MERCADOPAGO_WEBHOOK_SECRET)'
        });
      }

      // express.raw deja el body como Buffer para poder validar la firma
      // exactamente sobre los bytes recibidos.
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body || {}));

      let payload;
      try {
        const parsed = JSON.parse(rawBody.toString('utf8') || '{}');
        payload = parsed && typeof parsed === 'object' ? parsed : {};
      } catch (error) {
        return res.status(400).json({ status: 'error', mensaje: 'Payload JSON inválido' });
      }

      const dataId =
        req.query?.['data.id'] ||
        payload.data?.id ||
        payload.dataId ||
        payload.paymentId ||
        payload.id;

      const firmaValida = paymentService.verifyWebhookSignature({
        headers: req.headers,
        dataId,
        secret
      });

      if (!firmaValida) {
        return res.status(401).json({
          status: 'error',
          mensaje: 'Firma de webhook inválida'
        });
      }

      const resultado = await paymentService.processWebhookEvent({
        payload,
        headers: req.headers,
        query: req.query
      });

      return res.status(200).json({
        status: 'success',
        mensaje: resultado.duplicado
          ? 'Evento ya procesado previamente'
          : 'Webhook procesado correctamente',
        data: resultado
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