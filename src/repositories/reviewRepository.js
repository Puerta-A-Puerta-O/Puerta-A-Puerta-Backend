// src/repositories/reviewRepository.js
const db = require('../config/db');

class ReviewRepository {
  async createReview({ pedidoId, clienteId, localId, repartidorId, calificacionLocal, comentarioLocal, calificacionRepartidor, comentarioRepartidor }) {
    const query = `
      INSERT INTO resenas (
        pedido_id, cliente_id, local_id, repartidor_id,
        calificacion_local, comentario_local, calificacion_repartidor, comentario_repartidor
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      pedidoId, clienteId, localId, repartidorId,
      calificacionLocal, comentarioLocal, calificacionRepartidor, comentarioRepartidor
    ];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  async getLocalAverage(localId) {
    const query = `
      SELECT 
        ROUND(AVG(calificacion_local), 2) AS promedio_local,
        COUNT(id) AS total_resenas
      FROM resenas 
      WHERE local_id = $1;
    `;
    const { rows } = await db.query(query, [localId]);
    return rows[0];
  }

  async getDriverAverage(repartidorId) {
    const query = `
      SELECT 
        ROUND(AVG(calificacion_repartidor), 2) AS promedio_repartidor,
        COUNT(id) AS total_resenas
      FROM resenas 
      WHERE repartidor_id = $1 AND calificacion_repartidor IS NOT NULL;
    `;
    const { rows } = await db.query(query, [repartidorId]);
    return rows[0];
  }
}

module.exports = new ReviewRepository();