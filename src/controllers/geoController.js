// src/controllers/geoController.js
const geoRepository = require('../repositories/geoRepository');

class GeoController {
  async saveLocation(req, res, next) {
    try {
      const repartidorId = req.user.id;
      const { pedidoId, latitud, longitud, velocidadKms } = req.body;

      if (!pedidoId || !latitud || !longitud) {
        return res.status(400).json({ status: 'error', mensaje: 'pedidoId, latitud y longitud son requeridos' });
      }

      const registroUbicacion = await geoRepository.saveLocation({
        pedidoId,
        repartidorId,
        longitud,
        latitud,
        velocidadKms
      });

      // Retransmisión vía Socket.io para el mapa de seguimiento en tiempo real
      const io = req.app.get('io');
      if (io) {
        io.to(`pedido_${pedidoId}`).emit('ubicacion_repartidor', {
          pedidoId,
          latitud: registroUbicacion.latitud,
          longitud: registroUbicacion.longitud,
          velocidadKms: registroUbicacion.velocidad_kms,
          registradoEn: registroUbicacion.registrado_en
        });
      }

      return res.status(201).json({
        status: 'success',
        data: registroUbicacion
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GeoController();