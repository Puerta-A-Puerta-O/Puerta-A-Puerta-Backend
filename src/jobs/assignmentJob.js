// src/jobs/assignmentJob.js
const cron = require('node-cron');
const db = require('../config/db');
const assignmentService = require('../services/assignmentService');

function initAssignmentJob(app) {
  // Se ejecuta cada 30 segundos
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const io = app.get('io');

      // Buscar pedidos confirmados sin repartidor
      const pendientes = await db.query(`
        SELECT id 
        FROM pedidos 
        WHERE estado = 'confirmado' 
          AND repartidor_id IS NULL 
        ORDER BY creado_en ASC 
        LIMIT 10;
      `);

      for (const pedido of pendientes.rows) {
        await assignmentService.assignDriverToOrder(pedido.id, io);
      }
    } catch (error) {
      console.error('[CRON JOB ERROR] Error en la asignación automática:', error);
    }
  });
}

module.exports = initAssignmentJob;