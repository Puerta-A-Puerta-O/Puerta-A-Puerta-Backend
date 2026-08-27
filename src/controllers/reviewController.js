// src/controllers/reviewController.js
const reviewService = require('../services/reviewService');

class ReviewController {
  async createReview(req, res, next) {
    try {
      const clienteId = req.user.id;
      const { pedidoId, calificacionLocal, comentarioLocal, calificacionRepartidor, comentarioRepartidor } = req.body;

      if (!pedidoId || !calificacionLocal) {
        return res.status(400).json({ status: 'error', mensaje: 'pedidoId y calificacionLocal son obligatorios' });
      }

      const resena = await reviewService.submitReview({
        pedidoId,
        clienteId,
        calificacionLocal,
        comentarioLocal,
        calificacionRepartidor,
        comentarioRepartidor
      });

      return res.status(201).json({
        status: 'success',
        mensaje: 'Calificación registrada exitosamente',
        data: resena
      });
    } catch (error) {
      next(error);
    }
  }

  async getLocalRating(req, res, next) {
    try {
      const { localId } = req.params;
      const stats = await reviewService.getLocalStats(localId);
      return res.status(200).json({ status: 'success', data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getDriverRating(req, res, next) {
    try {
      const { repartidorId } = req.params;
      const stats = await reviewService.getDriverStats(repartidorId);
      return res.status(200).json({ status: 'success', data: stats });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReviewController();