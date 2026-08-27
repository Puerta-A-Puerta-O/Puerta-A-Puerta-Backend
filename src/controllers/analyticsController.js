// src/controllers/analyticsController.js
const analyticsService = require('../services/analyticsService');

class AnalyticsController {
  async getDashboard(req, res, next) {
    try {
      const { localId } = req.params;
      const { fechaInicio, fechaFin } = req.query;

      const metrics = await analyticsService.getDashboardMetrics(localId, fechaInicio, fechaFin);

      return res.status(200).json({
        status: 'success',
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();