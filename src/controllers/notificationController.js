// src/controllers/notificationController.js
const fcmService = require('../services/fcmService');

class NotificationController {
  async registerToken(req, res, next) {
    try {
      const { fcmToken, plataforma } = req.body;
      const usuarioId = req.user.id;

      if (!fcmToken) {
        return res.status(400).json({ status: 'error', mensaje: 'fcmToken es requerido' });
      }

      const registro = await fcmService.registerToken(usuarioId, fcmToken, plataforma);

      return res.status(201).json({
        status: 'success',
        mensaje: 'Token de dispositivo registrado exitosamente',
        data: registro
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();