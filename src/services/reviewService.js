// src/services/reviewService.js
const reviewRepository = require('../repositories/reviewRepository');
const db = require('../config/db');

class ReviewService {
  async submitReview({ pedidoId, clienteId, calificacionLocal, comentarioLocal, calificacionRepartidor, comentarioRepartidor }) {
    // Validar estado del pedido
    const { rows } = await db.query(`SELECT id, local_id, repartidor_id, estado FROM pedidos WHERE id = $1`, [pedidoId]);
    const pedido = rows[0];

    if (!pedido) {
      const error = new Error('Pedido no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (pedido.estado !== 'entregado') {
      const error = new Error('Solo se pueden calificar pedidos que hayan sido entregados');
      error.statusCode = 400;
      throw error;
    }

    return await reviewRepository.createReview({
      pedidoId,
      clienteId,
      localId: pedido.local_id,
      repartidorId: pedido.repartidor_id,
      calificacionLocal,
      comentarioLocal,
      calificacionRepartidor,
      comentarioRepartidor
    });
  }

  async getLocalStats(localId) {
    return await reviewRepository.getLocalAverage(localId);
  }

  async getDriverStats(repartidorId) {
    return await reviewRepository.getDriverAverage(repartidorId);
  }
}

module.exports = new ReviewService();