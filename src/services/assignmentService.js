// src/services/assignmentService.js
const db = require('../config/db');
const geoRepository = require('../repositories/geoRepository');

class AssignmentService {
  async assignDriverToOrder(pedidoId, io) {
    // 1. Obtener información del pedido
    const pedidoRes = await db.query(
      'SELECT id, local_id, estado FROM pedidos WHERE id = $1;', 
      [pedidoId]
    );
    const pedido = pedidoRes.rows[0];

    if (!pedido || pedido.estado !== 'confirmado') {
      return { success: false, reason: 'El pedido no está listo para asignación.' };
    }

    // 2. Buscar repartidor libre más cercano con PostGIS
    const repartidorCercano = await geoRepository.findNearestAvailableDriver(pedido.local_id);

    if (!repartidorCercano) {
      console.warn(`[ASIGNACIÓN] No hay repartidores disponibles para el pedido ${pedidoId}`);
      return { success: false, reason: 'Sin repartidores disponibles.' };
    }

    // 3. Asignar el repartidor al pedido en la base de datos
    await db.query(
      'UPDATE pedidos SET repartidor_id = $1, actualizado_en = NOW() WHERE id = $2;',
      [repartidorCercano.repartidor_id, pedidoId]
    );

    // 4. Notificar vía Socket.io al repartidor y a la sala del pedido
    if (io) {
      io.to(`pedido_${pedidoId}`).emit('repartidor_asignado', {
        pedidoId,
        repartidorId: repartidorCercano.repartidor_id,
        nombreRepartidor: repartidorCercano.nombre
      });

      io.to(`usuario_${repartidorCercano.repartidor_id}`).emit('nuevo_pedido_asignado', {
        pedidoId,
        localId: pedido.local_id
      });
    }

    return { success: true, repartidorId: repartidorCercano.repartidor_id };
  }
}

module.exports = new AssignmentService();