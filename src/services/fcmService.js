// src/services/fcmService.js
const admin = require('firebase-admin');
const db = require('../config/db');

// Inicialización condicional para desarrollo/producción
if (!admin.apps.length) {
  try {
    // Para producción se recomienda usar GOOGLE_APPLICATION_CREDENTIALS o servicio de llaves
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  } catch (error) {
    console.warn('⚠️ FCM no configurado correctamente. Revisa tus variables de entorno en .env');
  }
}

class FCMService {
  /**
   * Guarda o actualiza el FCM token del dispositivo de un usuario
   */
  async registerToken(usuarioId, fcmToken, plataforma = 'android') {
    const query = `
      INSERT INTO dispositivo_tokens (usuario_id, fcm_token, plataforma, actualizado_en)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (fcm_token) 
      DO UPDATE SET usuario_id = EXCLUDED.usuario_id, actualizado_en = NOW()
      RETURNING *;
    `;
    const { rows } = await db.query(query, [usuarioId, fcmToken, plataforma]);
    return rows[0];
  }

  /**
   * Envía una notificación push individual a un usuario
   */
  async sendToUser(usuarioId, { title, body, data = {} }) {
    const query = `SELECT fcm_token FROM dispositivo_tokens WHERE usuario_id = $1;`;
    const { rows } = await db.query(query, [usuarioId]);

    if (rows.length === 0) return null;

    const tokens = rows.map(r => r.fcm_token);

    const message = {
      notification: { title, body },
      data: { ...data, timestamp: String(Date.now()) },
      tokens
    };

    try {
      if (admin.apps.length) {
        const response = await admin.messaging().sendMulticast(message);
        return response;
      } else {
        console.log(`[SIMULACIÓN FCM] Notificación enviada a usuario ${usuarioId}:`, message);
        return { successCount: tokens.length };
      }
    } catch (error) {
      console.error('Error al enviar FCM:', error);
    }
  }

  /**
   * Helper para avisar cambio de estado de un pedido
   */
  async notifyOrderStatusUpdate(clienteUsuarioId, pedidoId, nuevoEstado) {
    const estadosMensajes = {
      confirmado: { title: '¡Pedido Confirmado! 🍕', body: 'El comercio ha recibido tu orden y comenzará a prepararla.' },
      en_preparacion: { title: 'En Preparación 👨‍🍳', body: 'Tu pedido está en la cocina.' },
      listo_para_retirar: { title: '¡Listo para Salir! 🛵', body: 'Tu pedido fue asignado a un repartidor.' },
      en_camino: { title: '¡Pedido en Camino! 🚀', body: 'El repartidor va hacia tu ubicación.' },
      entregado: { title: '¡Buen Provecho! 🎉', body: 'Tu pedido ha sido entregado exitosamente.' }
    };

    const notif = estadosMensajes[nuevoEstado];
    if (notif) {
      await this.sendToUser(clienteUsuarioId, {
        title: notif.title,
        body: notif.body,
        data: { pedidoId, estado: nuevoEstado }
      });
    }
  }
}

module.exports = new FCMService();